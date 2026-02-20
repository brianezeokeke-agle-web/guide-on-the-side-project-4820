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
    
    // DELETE /tutorials/{id} - delete a tutorial
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::DELETABLE,
        'callback'            => 'gots_rest_delete_tutorial',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                },
            ),
        ),
    ));

    // GET /tutorials/{id}/public - get a tutorial for public playback (no authentication needed)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/public', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_tutorial_public',
        'permission_callback' => 'gots_rest_permissions_check_public',
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
 * permission check for public read operations (student playback)
 * always returns true - visibility is enforced in the callback
 *
 * @param WP_REST_Request $request Request object
 * @return bool
 */
function gots_rest_permissions_check_public($request) {
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
 * get a single tutorial for public playback (student view)
 * only returns published, non-archived tutorials
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_get_tutorial_public($request) {
    $id = (int) $request->get_param('id');
    
    $post = get_post($id);
    
    // check if the post exists and is the correct type
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404) //throw an error
        );
    }
    
    // check if this is a preview request from a logged-in admin
    $is_preview = $request->get_param('preview') === '1';
    $is_admin_user = is_user_logged_in() && current_user_can('edit_posts');
    
    if (!($is_preview && $is_admin_user)) {
        // not an admin preview - enforce publish/archive checks
        if ($post->post_status !== 'publish') {
            return new WP_Error(
                'tutorial_not_available',
                __('This tutorial is not available at the moment.', 'guide-on-the-side'),
                array('status' => 403)
            );
        }
        
        $archived = get_post_meta($id, '_gots_archived', true);
        if ($archived) {
            return new WP_Error(
                'tutorial_not_available',
                __('This tutorial is currently unavailable.', 'guide-on-the-side'),
                array('status' => 403)
            );
        }
    }
    
    // return the tutorial data for student playback
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
    $slides_json = wp_json_encode($slides);
    update_post_meta($post_id, '_gots_slides', $slides_json);
    
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
    
    // handle slide deletion when needed
    if (isset($sanitized['deleteSlideIds']) && is_array($sanitized['deleteSlideIds'])) {
        $existing_slides_json = get_post_meta($id, '_gots_slides', true);
        $existing_slides = array();
        
        if (!empty($existing_slides_json)) {
            $decoded = json_decode($existing_slides_json, true);
            if (is_array($decoded)) {
                $existing_slides = $decoded;
            }
        }
        
        $delete_ids = $sanitized['deleteSlideIds'];
        
        // filter out the slides to delete
        $remaining_slides = array_values(array_filter($existing_slides, function($slide) use ($delete_ids) {
            return !in_array($slide['slideId'], $delete_ids, true);
        }));
        
        // reorder remaining slides
        foreach ($remaining_slides as $idx => &$slide) {
            $slide['order'] = $idx + 1;
        }
        unset($slide);
        
        // save using a direct DB write
        $save_json = wp_json_encode($remaining_slides);
        global $wpdb;
        $existing_meta_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_gots_slides' LIMIT 1",
                $id
            )
        );
        if ($existing_meta_id) {
            $wpdb->update(
                $wpdb->postmeta,
                array('meta_value' => $save_json),
                array('meta_id' => $existing_meta_id),
                array('%s'),
                array('%d')
            );
        }
        wp_cache_delete($id, 'post_meta');
        clean_post_cache($id);
        
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
        
        // merge slides using the merge algorithm
        $merged_slides = gots_merge_slides($existing_slides, $sanitized['slides']);
        
        // safety check: don't save empty slides if we had slides before
        if (count($existing_slides) > 0 && count($merged_slides) === 0) {
            // don't save - something went wrong
        } else {
            // save the merged slides
            $save_json = wp_json_encode($merged_slides);
            
            // use direct DB write to bypass WordPress meta serialization
            // which can corrupt JSON strings containing HTML with escaped quotes
            global $wpdb;
            $existing_meta_id = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_gots_slides' LIMIT 1",
                    $id
                )
            );
            
            if ($existing_meta_id) {
                $wpdb->update(
                    $wpdb->postmeta,
                    array('meta_value' => $save_json),
                    array('meta_id' => $existing_meta_id),
                    array('%s'),
                    array('%d')
                );
            } else {
                $wpdb->insert(
                    $wpdb->postmeta,
                    array('post_id' => $id, 'meta_key' => '_gots_slides', 'meta_value' => $save_json),
                    array('%d', '%s', '%s')
                );
            }
            
            // clear all caches after direct DB write
            wp_cache_delete($id, 'post_meta');
            clean_post_cache($id);
        }
    }
    
    // Very Important: Clear the post meta cache to ensure we read fresh data
    // WordPress caches meta values and sometimes returns stale data
    wp_cache_delete($id, 'post_meta');
    clean_post_cache($id);
    
    // get the updated post and return the formatted response
    $updated_post = get_post($id);
    
    return rest_ensure_response(gots_format_tutorial_response($updated_post));
}

/**
 * delete a tutorial permanently
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_delete_tutorial($request) {
    $id = (int) $request->get_param('id');
    
    // get the existing post
    $post = get_post($id);
    
    // check if post exists and is the correct type
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }
    
    // delete all associated meta
    delete_post_meta($id, '_gots_description');
    delete_post_meta($id, '_gots_archived');
    delete_post_meta($id, '_gots_slides');
    
    // permanently delete the post (bypass trash)
    $result = wp_delete_post($id, true);
    
    if (!$result) {
        return new WP_Error(
            'delete_failed',
            __('Failed to delete tutorial.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }
    
    return rest_ensure_response(array(
        'deleted' => true,
        'tutorialId' => (string) $id,
    ));
}