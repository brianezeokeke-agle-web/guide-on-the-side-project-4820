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

    // POST /tutorials/{id}/duplicate - create a copy of an existing tutorial
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/duplicate', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_duplicate_tutorial',
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

    //analytics endpoints begin from here

    // POST /analytics/event - to record an anonymous analytics event. this needs no auth
    register_rest_route($namespace, '/analytics/event', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_record_analytics_event',
        'permission_callback' => 'gots_rest_permissions_check_public',
    ));

    // GET /tutorials/{id}/analytics/summary - get the tutorial summary (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/analytics/summary', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_analytics_summary',
        'permission_callback' => 'gots_rest_permissions_check_read',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /tutorials/{id}/analytics/trend - get the daily trend data (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/analytics/trend', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_analytics_trend',
        'permission_callback' => 'gots_rest_permissions_check_read',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /tutorials/{id}/analytics/slides - get the slide performance data (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/analytics/slides', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_analytics_slides',
        'permission_callback' => 'gots_rest_permissions_check_read',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
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
    
    // published tutorials are locked — only archiving is allowed
    if ($post->post_status === 'publish') {
        $allowed_keys = array('archived');
        $submitted_keys = array_keys($params);
        $disallowed = array_diff($submitted_keys, $allowed_keys);
        if (!empty($disallowed)) {
            return new WP_Error(
                'tutorial_locked',
                __('Published tutorials cannot be modified. Only archiving is allowed.', 'guide-on-the-side'),
                array('status' => 403)
            );
        }
    }
    
    // validate and sanitize input
    $sanitized = gots_sanitize_tutorial_data($params, false);
    
    if (is_wp_error($sanitized)) {
        return $sanitized;
    }
    
    // block publishing if any slide has empty content panes
    if (isset($sanitized['status']) && $sanitized['status'] === 'publish') {
        $slides_json = get_post_meta($id, '_gots_slides', true);
        $slides = !empty($slides_json) ? json_decode($slides_json, true) : array();
        if (!is_array($slides) || empty($slides) || gots_has_empty_slides($slides)) {
            return new WP_Error(
                'empty_slides',
                __('Cannot publish: one or more slides have empty content panes. Please fill in all slide content before publishing.', 'guide-on-the-side'),
                array('status' => 422)
            );
        }
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
 * function to duplicate an existing tutorial
 * creates an exact copy as a draft with "Copy of" prepended to the existing title
 *
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_duplicate_tutorial($request) {
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

    // check post status (only draft and publish are valid)
    if (!in_array($post->post_status, array('draft', 'publish'), true)) {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }

    // create the duplicate post as a draft
    $new_post_data = array(
        'post_type'   => 'gots_tutorial',
        'post_title'  => 'Copy of ' . $post->post_title,
        'post_status' => 'draft',
        'post_author' => get_current_user_id(),
    );

    $new_post_id = wp_insert_post($new_post_data, true);

    if (is_wp_error($new_post_id)) {
        return new WP_Error(
            'duplicate_failed',
            __('Failed to duplicate tutorial.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }

    // copy the description meta
    $description = get_post_meta($id, '_gots_description', true);
    update_post_meta($new_post_id, '_gots_description', $description ?: '');

    // set archived flag to false by default for the copy
    update_post_meta($new_post_id, '_gots_archived', 0);

    // copy the slides, but generate new slide IDs so the copy is independent
    $slides_json = get_post_meta($id, '_gots_slides', true);
    $slides = array();
    if (!empty($slides_json)) {
        $decoded = json_decode($slides_json, true);
        if (is_array($decoded)) {
            $slides = $decoded;
        }
    }

    // assign new UUIDs to each slide so edits to the copy don't clash with the existing tut
    foreach ($slides as &$slide) {
        $slide['slideId'] = gots_generate_uuid();
    }
    unset($slide);

    // save the duplicated slides
    if (!empty($slides)) {
        $new_slides_json = wp_json_encode($slides);
        update_post_meta($new_post_id, '_gots_slides', $new_slides_json);
    } else {
        // if the original had no slides, create 2 empty ones like a new tutorial
        $empty_slides = array(
            gots_create_empty_slide(1),
            gots_create_empty_slide(2),
        );
        update_post_meta($new_post_id, '_gots_slides', wp_json_encode($empty_slides));
    }

    // get the created post and return the formatted response
    $new_post = get_post($new_post_id);

    return rest_ensure_response(gots_format_tutorial_response($new_post));
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

//analytics REST callbacks 

//Record an anonymous analytics event, this endpoint is public
function gots_rest_record_analytics_event($request) {
    $params = $request->get_json_params();

    $tutorial_id = isset($params['tutorialId']) ? absint($params['tutorialId']) : 0;
    $event_type  = isset($params['eventType']) ? sanitize_text_field($params['eventType']) : '';
    $slide_id    = isset($params['slideId']) ? sanitize_text_field($params['slideId']) : null;
    $token       = isset($params['token']) ? sanitize_text_field($params['token']) : '';

    if (!$tutorial_id || !$event_type) {
        return new WP_Error(
            'invalid_event',
            __('tutorialId and eventType are required.', 'guide-on-the-side'),
            array('status' => 400)
        );
    }

    // Verify the HMAC token matches — rejects requests not originating from a real playback page
    $expected_token = hash_hmac('sha256', 'gots_analytics_' . $tutorial_id, wp_salt('auth'));
    if (!hash_equals($expected_token, $token)) {
        return new WP_Error(
            'invalid_token',
            __('Invalid analytics token.', 'guide-on-the-side'),
            array('status' => 403)
        );
    }

    // Simple rate limit — max 60 events per IP per minute via a transient
    $ip_hash    = md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $rate_key   = 'gots_rate_' . $ip_hash;
    $rate_count = (int) get_transient($rate_key);
    if ($rate_count >= 60) {
        return new WP_Error(
            'rate_limited',
            __('Too many requests. Please slow down.', 'guide-on-the-side'),
            array('status' => 429)
        );
    }
    set_transient($rate_key, $rate_count + 1, 60);

    // Verify that the tutorial exists
    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error(
            'tutorial_not_found',
            __('Tutorial not found.', 'guide-on-the-side'),
            array('status' => 404)
        );
    }

    $success = gots_record_analytics_event($tutorial_id, $event_type, $slide_id);

    if (!$success) {
        return new WP_Error(
            'event_failed',
            __('Failed to record event.', 'guide-on-the-side'),
            array('status' => 400)
        );
    }

    return rest_ensure_response(array('recorded' => true));
}

/**
 * Parse common date range params from request.
 *
 * @param WP_REST_Request $request
 * @return array {date_from, date_to}
 */
function gots_parse_date_range_params($request) {
    $date_from = $request->get_param('dateFrom');
    $date_to   = $request->get_param('dateTo');

    // Vvalidate format and also calendar correctness will reject invalid dates like 2026-99-99
    $validate_date = function($str) {
        if (!$str) return null;
        $dt = \DateTime::createFromFormat('Y-m-d', $str);
        return ($dt && $dt->format('Y-m-d') === $str) ? $str : null;
    };
    $date_from = $validate_date($date_from);
    $date_to   = $validate_date($date_to);

    // normalize range: if both dates are present and out of order, swap them
    if ($date_from && $date_to && $date_from > $date_to) {
        $tmp       = $date_from;
        $date_from = $date_to;
        $date_to   = $tmp;
    }

    return array('date_from' => $date_from, 'date_to' => $date_to);
}

/**
 * GET /tutorials/{id}/analytics/summary
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_get_analytics_summary($request) {
    $id = absint($request->get_param('id'));

    $post = get_post($id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', __('Tutorial not found.', 'guide-on-the-side'), array('status' => 404));
    }

    $range   = gots_parse_date_range_params($request);
    $summary = gots_get_analytics_summary($id, $range['date_from'], $range['date_to']);

    return rest_ensure_response($summary);
}

/**
 * GET /tutorials/{id}/analytics/trend
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_get_analytics_trend($request) {
    $id = absint($request->get_param('id'));

    $post = get_post($id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', __('Tutorial not found.', 'guide-on-the-side'), array('status' => 404));
    }

    $range = gots_parse_date_range_params($request);
    $trend = gots_get_analytics_trend($id, $range['date_from'], $range['date_to']);

    return rest_ensure_response($trend);
}

/**
 * GET /tutorials/{id}/analytics/slides
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_get_analytics_slides($request) {
    $id = absint($request->get_param('id'));

    $post = get_post($id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', __('Tutorial not found.', 'guide-on-the-side'), array('status' => 404));
    }

    $range  = gots_parse_date_range_params($request);
    $slides = gots_get_slide_performance($id, $range['date_from'], $range['date_to']);

    return rest_ensure_response($slides);
}