<?php
/**
 * REST API routes for guide on the ide
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * register all REST API routes
 */
function gots_register_rest_routes() {
    $namespace = 'gots/v1';
    
    // GET /tutorials - list all available tutorials
    register_rest_route($namespace, '/tutorials', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_list_tutorials',
        'permission_callback' => 'gots_rest_permissions_check_read',
    ));
    
    // POST /tutorials - create a new tutorial
    register_rest_route($namespace, '/tutorials', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_create_tutorial',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => gots_get_tutorial_create_args(),
    ));
    
    // GET /tutorials/{id} - get a single tutorial
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_tutorial',
        'permission_callback' => 'gots_rest_permissions_check_read',
        'args'                => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                },
            ),
        ),
    ));
    
    // PUT /tutorials/{id} - update a tutorial
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => 'gots_rest_update_tutorial',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                },
            ),
        ),
    ));
}

/**
 * permission check for read operations
 *
 * @param WP_REST_Request $request Request object
 * @return bool|WP_Error
 */
function gots_rest_permissions_check_read($request) {
    // allow read access to logged-in users who can edit posts
    if (!is_user_logged_in()) {
        return new WP_Error(
            'rest_not_logged_in',
            __('You must be logged in to access tutorials.', 'guide-on-the-side'),
            array('status' => 401)
        );
    }
    
    if (!current_user_can('edit_posts')) {
        return new WP_Error(
            'rest_forbidden',
            __('You do not have permission to access tutorials.', 'guide-on-the-side'),
            array('status' => 403)
        );
    }
    
    return true;
}

/**
 * permission check for write operations
 *
 * @param WP_REST_Request $request Request object
 * @return bool|WP_Error
 */
function gots_rest_permissions_check_write($request) {
    // require authentication
    if (!is_user_logged_in()) {
        return new WP_Error(
            'rest_not_logged_in',
            __('You must be logged in to modify tutorials.', 'guide-on-the-side'),
            array('status' => 401)
        );
    }
    
    // require edit_posts capability
    if (!current_user_can('edit_posts')) {
        return new WP_Error(
            'rest_forbidden',
            __('You do not have permission to modify tutorials.', 'guide-on-the-side'),
            array('status' => 403)
        );
    }
    
    return true;
}

/**
 * get argument definitions for tutorial creation
 *
 * @return array argument definitions
 */
function gots_get_tutorial_create_args() {
    return array(
        'title' => array(
            'required'          => true,
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'validate_callback' => function($param) {
                return !empty(trim($param));
            },
        ),
        'description' => array(
            'required'          => false,
            'type'              => 'string',
            'default'           => '',
            'sanitize_callback' => 'sanitize_textarea_field',
        ),
    );
}

/**
 * list all tutorials
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_list_tutorials($request) {
    $args = array(
        'post_type'      => 'gots_tutorial',
        'post_status'    => array('draft', 'publish'),
        'posts_per_page' => -1,  // return all tutorials
        'orderby'        => 'date',
        'order'          => 'DESC',
    );
    
    $posts = get_posts($args);
    $tutorials = array();
    
    foreach ($posts as $post) {
        $tutorials[] = gots_format_tutorial_response($post);
    }
    
    return rest_ensure_response($tutorials);
}

/**
 * get a single tutorial
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_get_tutorial($request) {
    $id = (int) $request->get_param('id');
    
    $post = get_post($id);
    
    // check if post exists and is the correct type
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }
    
    // check post status (only draft and publish are valid)
    if (!in_array($post->post_status, array('draft', 'publish'), true)) {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }
    
    return rest_ensure_response(gots_format_tutorial_response($post));
}

/**
 * create a new tutorial
 *
 * @param WP_REST_Request $request request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_create_tutorial($request) {
    $params = $request->get_json_params();
    
    // validate and sanitize input
    $sanitized = gots_sanitize_tutorial_data($params, true);
    
    if (is_wp_error($sanitized)) {
        return $sanitized;
    }
    
    // create the post
    $post_data = array(
        'post_type'   => 'gots_tutorial',
        'post_title'  => $sanitized['title'],
        'post_status' => 'draft',  // always create as draft
        'post_author' => get_current_user_id(),
    );
    
    $post_id = wp_insert_post($post_data, true);
    
    if (is_wp_error($post_id)) {
        return new WP_Error(
            'create_failed',
            __('Failed to create tutorial.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }
    
    // set the description meta
    $description = isset($sanitized['description']) ? $sanitized['description'] : '';
    update_post_meta($post_id, '_gots_description', $description);
    
    // set archived flag (this is false by default)
    update_post_meta($post_id, '_gots_archived', 0);
    
    // create minimum 2 empty slides for a new tut
    $slides = array(
        gots_create_empty_slide(1),
        gots_create_empty_slide(2),
    );
    update_post_meta($post_id, '_gots_slides', wp_json_encode($slides));
    
    // get the created post and return the formatted response
    $post = get_post($post_id);
    
    return rest_ensure_response(gots_format_tutorial_response($post));
}

/**
 * update an existing tutorial
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_update_tutorial($request) {
    $id = (int) $request->get_param('id');
    $params = $request->get_json_params();
    
    // get an existing post
    $post = get_post($id);
    
    // check if post exists and is the correct type
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }
    
    // check post status (only draft and publish are valid)
    if (!in_array($post->post_status, array('draft', 'publish'), true)) {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }
    
    // validate and sanitize input
    $sanitized = gots_sanitize_tutorial_data($params, false);
    
    if (is_wp_error($sanitized)) {
        return $sanitized;
    }
    
    // prepare post update data
    $update_data = array(
        'ID' => $id,
    );
    
    // update the title if provided by author
    if (isset($sanitized['title'])) {
        $update_data['post_title'] = $sanitized['title'];
    }
    
    // update the status if provided by author
    if (isset($sanitized['status'])) {
        $update_data['post_status'] = $sanitized['status'];
    }
    
    // update the post (this will update post_modified automatically)
    if (count($update_data) > 1) {
        $result = wp_update_post($update_data, true);
        
        if (is_wp_error($result)) {
            return new WP_Error(
                'update_failed',
                __('Failed to update tutorial.', 'guide-on-the-side'),
                array('status' => 500)
            );
        }
    } else {
        // if there are no post fields to update, touch the post to update modified time
        wp_update_post(array('ID' => $id));
    }
    
    // update the description if provided by author
    if (isset($sanitized['description'])) {
        update_post_meta($id, '_gots_description', $sanitized['description']);
    }
    
    // update archived flag if provided by author
    if (isset($sanitized['archived'])) {
        update_post_meta($id, '_gots_archived', $sanitized['archived'] ? 1 : 0);
    }
    
    // handle slides merge if provided by author
    if (isset($sanitized['slides'])) {
        // get the existing slides
        $existing_slides_json = get_post_meta($id, '_gots_slides', true);
        $existing_slides = array();
        
        if (!empty($existing_slides_json)) {
            $decoded = json_decode($existing_slides_json, true);
            if (is_array($decoded)) {
                $existing_slides = $decoded;
            }
        }
        
        // merge slides using THE in house algorithm ;)
        $merged_slides = gots_merge_slides($existing_slides, $sanitized['slides']);
        
        // save the merged slides
        update_post_meta($id, '_gots_slides', wp_json_encode($merged_slides));
    }
    
    // get the updated post and return the formatted response
    $updated_post = get_post($id);
    
    return rest_ensure_response(gots_format_tutorial_response($updated_post));
}
