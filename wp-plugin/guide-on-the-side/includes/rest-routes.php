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

    // ── Certificate endpoints ──────────────────────────────────────────────────

    // POST /generate-certificate - generate and return a PDF certificate (legacy, admin-only)
    register_rest_route($namespace, '/generate-certificate', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_generate_certificate',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'userName'        => array(
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback'  => 'sanitize_text_field',
                'validate_callback' => function($param) {
                    return is_string($param) && strlen(trim($param)) > 0;
                },
            ),
            'courseName'      => array(
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback'  => 'sanitize_text_field',
                'validate_callback' => function($param) {
                    return is_string($param) && strlen(trim($param)) > 0;
                },
            ),
            'completionDate'  => array(
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback'  => 'sanitize_text_field',
                'validate_callback' => function($param) {
                    return is_string($param) && strlen(trim($param)) > 0;
                },
            ),
        ),
    ));

    // GET  /certificate-templates         — list all active templates (admin)
    register_rest_route($namespace, '/certificate-templates', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_list_cert_templates',
        'permission_callback' => 'gots_rest_permissions_check_write',
    ));

    // POST /certificate-templates         — create a template (admin)
    register_rest_route($namespace, '/certificate-templates', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_create_cert_template',
        'permission_callback' => 'gots_rest_permissions_check_write',
    ));

    // PUT  /certificate-templates/{id}    — update a template (admin)
    register_rest_route($namespace, '/certificate-templates/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => 'gots_rest_update_cert_template',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // DELETE /certificate-templates/{id}  — soft-delete a template (admin)
    register_rest_route($namespace, '/certificate-templates/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::DELETABLE,
        'callback'            => 'gots_rest_delete_cert_template',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // POST /certificate-templates/{id}/preview — render preview PDF inline (admin)
    register_rest_route($namespace, '/certificate-templates/(?P<id>\d+)/preview', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_preview_cert_template',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // PUT /tutorials/{id}/certificate-settings — save cert settings for a tutorial (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificate-settings', array(
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => 'gots_rest_update_tutorial_cert_settings',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /tutorials/{id}/certificate-settings — get cert settings for a tutorial (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificate-settings', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_tutorial_cert_settings_endpoint',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /tutorials/{id}/certificates    — list issued certificates for a tutorial (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificates', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_list_tutorial_certificates',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // POST /tutorials/{id}/certificate/completion-proof  — request a fresh signed proof after actually completing
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificate/completion-proof', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_request_completion_proof',
        'permission_callback' => 'gots_rest_permissions_check_public',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // POST /tutorials/{id}/certificate/issue  — student issues a certificate after completion
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificate/issue', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_issue_certificate',
        'permission_callback' => 'gots_rest_permissions_check_public',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // POST /tutorials/{id}/certificate/preview  — render a preview PDF (no DB write)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/certificate/preview', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_preview_tutorial_certificate',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /certificates/{token}/download  — stream a signed PDF
    register_rest_route($namespace, '/certificates/(?P<token>[A-Za-z0-9._-]+)/download', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_download_certificate',
        'permission_callback' => 'gots_rest_permissions_check_public',
        'args'                => array(
            'token' => array(
                'validate_callback' => function($p) { return is_string($p) && strlen($p) <= 512; },
            ),
        ),
    ));

    // GET /certificates/verify/{verification_id} — public lookup by certificate ID printed on PDF
    register_rest_route($namespace, '/certificates/verify/(?P<verification_id>[a-zA-Z0-9-]{8,128})', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_verify_certificate',
        'permission_callback' => 'gots_rest_permissions_check_public',
        'args'                => array(
            'verification_id' => array(
                'validate_callback' => function($p) { return is_string($p) && strlen($p) >= 8 && strlen($p) <= 128; },
            ),
        ),
    ));

    //Tutorial theme routes 

    // GET  /tutorial-themes         — list all active themes (admin)
    register_rest_route($namespace, '/tutorial-themes', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_list_tutorial_themes',
        'permission_callback' => 'gots_rest_permissions_check_write',
    ));

    // POST /tutorial-themes         — create a theme (admin)
    register_rest_route($namespace, '/tutorial-themes', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'gots_rest_create_tutorial_theme',
        'permission_callback' => 'gots_rest_permissions_check_write',
    ));

    // PUT  /tutorial-themes/{id}    — update a theme (admin)
    register_rest_route($namespace, '/tutorial-themes/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => 'gots_rest_update_tutorial_theme',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // DELETE /tutorial-themes/{id}  — soft-delete a theme (admin)
    register_rest_route($namespace, '/tutorial-themes/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::DELETABLE,
        'callback'            => 'gots_rest_delete_tutorial_theme',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // GET /tutorials/{id}/theme-settings — get tutorial-level theme selection (admin)
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/theme-settings', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'gots_rest_get_tutorial_theme_settings_endpoint',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
        ),
    ));

    // PUT /tutorials/{id}/theme-settings — save tutorial-level theme selection (admin)
    // Dedicated endpoint — does NOT touch slides. Mirrors certificate-settings pattern.
    register_rest_route($namespace, '/tutorials/(?P<id>\d+)/theme-settings', array(
        'methods'             => WP_REST_Server::EDITABLE,
        'callback'            => 'gots_rest_update_tutorial_theme_settings',
        'permission_callback' => 'gots_rest_permissions_check_write',
        'args'                => array(
            'id' => array('validate_callback' => function($p) { return is_numeric($p); }),
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
            'dateFrom' => array(
                'required' => false,
                'validate_callback' => function($p) {
                    return preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $p);
                },
            ),
            'dateTo' => array(
                'required' => false,
                'validate_callback' => function($p) {
                    return preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $p);
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
    
    // Return tutorial data for student playback.
    // Resolve and embed the effective theme config here only — this is the one
    // endpoint that needs it. Keeping it out of gots_format_tutorial_response()
    // avoids an extra theme-table lookup on every admin list/detail call.
    $data = gots_format_tutorial_response($post);
    $resolved_theme          = gots_resolve_tutorial_theme($post->ID);
    $data['theme_config']    = isset($resolved_theme->config_json) ? $resolved_theme->config_json : null;
    return rest_ensure_response($data);
}

/**
 * generate certificate PDF and send as response
 *
 * @param WP_REST_Request $request Request object with userName, courseName, completionDate
 * @return void Sends PDF and exits
 */
function gots_rest_generate_certificate($request) {
    $user_name       = $request->get_param('userName');
    $course_name     = $request->get_param('courseName');
    $completion_date = $request->get_param('completionDate');

    $pdf_content = gots_generate_certificate_pdf($user_name, $course_name, $completion_date);

    if (is_wp_error($pdf_content)) {
        return $pdf_content;
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="certificate.pdf"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');
    echo $pdf_content;
    exit;
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
    
    // block publishing if any slide has empty content panes or invalid branch configs
    if (isset($sanitized['status']) && $sanitized['status'] === 'publish') {
        $slides_json = get_post_meta($id, '_gots_slides', true);
        $slides = !empty($slides_json) ? json_decode($slides_json, true) : array();
        // Merge any incoming slide updates first so all subsequent checks run
        // against the final state rather than potentially stale stored slides.
        $slides_to_validate = $slides;
        if (!empty($sanitized['slides'])) {
            $slides_to_validate = gots_merge_slides($slides, $sanitized['slides']);
        }
        if (!is_array($slides_to_validate) || empty($slides_to_validate) || gots_has_empty_slides($slides_to_validate)) {
            return new WP_Error(
                'empty_slides',
                __('Cannot publish: one or more slides have empty content panes. Please fill in all slide content before publishing.', 'guide-on-the-side'),
                array('status' => 422)
            );
        }
        $regular_slide_count = count(array_filter($slides_to_validate, function($s) {
            return empty($s['isBranchSlide']);
        }));
        if ($regular_slide_count < 2) {
            return new WP_Error(
                'insufficient_slides',
                __('Cannot publish: a tutorial must have at least 2 slides (not counting conditional branch slides).', 'guide-on-the-side'),
                array('status' => 422)
            );
        }
        $branch_errors = gots_validate_branch_configs($slides_to_validate);
        if (!empty($branch_errors)) {
            return new WP_Error(
                'invalid_branch_config',
                __('Cannot publish: one or more branch slide configurations are invalid. Please fix all branch conditions before publishing.', 'guide-on-the-side'),
                array('status' => 422, 'branch_errors' => $branch_errors)
            );
        }

        // If a tutorial theme is assigned, verify it still exists and is active
        $assigned_theme_id = (int) get_post_meta($id, '_gots_theme_id', true);
        if ($assigned_theme_id > 0 && !gots_get_theme($assigned_theme_id)) {
            return new WP_Error(
                'invalid_theme',
                __('Cannot publish: the selected tutorial theme no longer exists or has been deactivated. Please select a different theme or clear the selection.', 'guide-on-the-side'),
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

    // copy certificate settings (enabled, template, issuer name)
    $cert_enabled     = get_post_meta($id, '_gots_certificate_enabled', true);
    $cert_template_id = get_post_meta($id, '_gots_certificate_template_id', true);
    $cert_issuer_name = get_post_meta($id, '_gots_certificate_issuer_name', true);
    update_post_meta($new_post_id, '_gots_certificate_enabled',     $cert_enabled ?: '');
    update_post_meta($new_post_id, '_gots_certificate_template_id', $cert_template_id ?: 0);
    update_post_meta($new_post_id, '_gots_certificate_issuer_name', $cert_issuer_name ?: '');

    // copy tutorial theme selection — verify the theme still exists before copying
    // (themeOverride tokens are embedded in slides and copied automatically)
    $theme_id = (int) get_post_meta($id, '_gots_theme_id', true);
    if ($theme_id > 0 && !gots_get_theme($theme_id)) {
        $theme_id = 0; // source theme was deleted; duplicate starts with no theme
    }
    update_post_meta($new_post_id, '_gots_theme_id', $theme_id);

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
    // build old→new ID map first so branch relationships can be remapped
    $id_map = array();
    foreach ($slides as $slide) {
        $id_map[$slide['slideId']] = gots_generate_uuid();
    }
    foreach ($slides as &$slide) {
        $slide['slideId'] = $id_map[$slide['slideId']];
        // remap branch parent reference
        if (!empty($slide['branchParentSlideId']) && isset($id_map[$slide['branchParentSlideId']])) {
            $slide['branchParentSlideId'] = $id_map[$slide['branchParentSlideId']];
        }
        // remap sourceSlideId inside branchConfig
        if (!empty($slide['branchConfig']['sourceSlideId']) && isset($id_map[$slide['branchConfig']['sourceSlideId']])) {
            $slide['branchConfig']['sourceSlideId'] = $id_map[$slide['branchConfig']['sourceSlideId']];
        }
    }
    unset($slide);

    // save the duplicated slides
    if (!empty($slides)) {
        $slides_to_save = $slides;
    } else {
        // if the original had no slides, create 2 empty ones by default like a new tutorial
        $slides_to_save = array(
            gots_create_empty_slide(1),
            gots_create_empty_slide(2),
        );
    }

    $slides_json_to_save = wp_json_encode($slides_to_save);
    // Write slides JSON directly to the postmeta table to avoid WP meta handling
    // corrupting JSON that contains HTML/escaped quotes (same as slides-merge path).
    global $wpdb;
    $existing_meta_id = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_gots_slides' LIMIT 1",
            $new_post_id
        )
    );
    if ($existing_meta_id) {
        $saved = $wpdb->update(
            $wpdb->postmeta,
            array('meta_value' => $slides_json_to_save),
            array('meta_id' => $existing_meta_id),
            array('%s'),
            array('%d')
        );
    } else {
        $saved = $wpdb->insert(
            $wpdb->postmeta,
            array('post_id' => $new_post_id, 'meta_key' => '_gots_slides', 'meta_value' => $slides_json_to_save),
            array('%d', '%s', '%s')
        );
    }
    if ($saved === false) {
        return new WP_Error(
            'duplicate_slides_failed',
            __('Failed to save slides for the duplicated tutorial.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }
    wp_cache_delete($new_post_id, 'post_meta');
    clean_post_cache($new_post_id);

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
    delete_post_meta($id, '_gots_theme_id');
    
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

// ── Certificate REST callbacks ─────────────────────────────────────────────────

/**
 * POST /tutorials/{id}/certificate/completion-proof
 *
 * Issues a signed completion-proof token at the moment the student actually
 * finishes the tutorial in their browser.  The proof is required by the issue
 * endpoint, keeping the server in control of when proofs may be obtained.
 *
 * Rate-limited to 5 proof requests per student per tutorial per hour to
 * prevent proof farming while still allowing retries on network failures.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_request_completion_proof($request) {
    $tutorial_id = absint($request->get_param('id'));

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial' || $post->post_status !== 'publish') {
        return new WP_Error('tutorial_unavailable', 'Tutorial not available.', array('status' => 404));
    }

    if (empty(get_post_meta($tutorial_id, '_gots_certificate_enabled', true))) {
        return new WP_Error('cert_disabled', 'Certificates are not enabled for this tutorial.', array('status' => 403));
    }

    $student_id = gots_get_student_identifier();

    // Rate-limit proof requests: 5 per student per tutorial per hour
    $rl_key   = 'gots_proof_rl_' . substr(hash('sha256', $student_id . $tutorial_id), 0, 24);
    $rl_count = (int) get_transient($rl_key);
    if ($rl_count >= 5) {
        return new WP_Error('rate_limited', 'Too many proof requests. Please wait before trying again.', array('status' => 429));
    }
    set_transient($rl_key, $rl_count + 1, HOUR_IN_SECONDS);

    $proof = gots_generate_completion_proof($tutorial_id, $student_id);
    return rest_ensure_response(array('completionProof' => $proof));
}

/**
 * POST /tutorials/{id}/certificate/issue
 *
 * Request body:
 *   recipientName    string  — display name for the certificate
 *   completionProof  string  — signed proof token from gotsStudentConfig
 *   idempotencyKey   string  — (optional) client-supplied dedup key
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function gots_rest_issue_certificate($request) {
    $tutorial_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    $recipient_name   = isset($params['recipientName'])   ? sanitize_text_field($params['recipientName'])   : '';
    $completion_proof = isset($params['completionProof']) ? sanitize_text_field($params['completionProof']) : '';
    $idempotency_key  = isset($params['idempotencyKey'])  ? sanitize_text_field($params['idempotencyKey'])  : '';

    if (empty($recipient_name)) {
        return new WP_Error('missing_name', 'recipientName is required.', array('status' => 400));
    }

    if (empty($completion_proof)) {
        return new WP_Error('missing_proof', 'completionProof is required.', array('status' => 400));
    }

    // Optional idempotency check
    if (!empty($idempotency_key) && !gots_check_idempotency_key($idempotency_key)) {
        // Duplicate in-flight request — return a 409 so the client can retry after a short delay
        return new WP_Error('duplicate_request', 'Duplicate issuance request. Please wait a moment and try again.', array('status' => 409));
    }

    $student_id = gots_get_student_identifier();

    $result = gots_issue_certificate($tutorial_id, $recipient_name, $completion_proof, $student_id);

    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

/**
 * POST /tutorials/{id}/certificate/preview
 *
 * Renders a real certificate PDF using the tutorial's configured template but
 * with a PREVIEW-0000 certificate ID. Nothing is written to the database.
 * Requires write (editor) permission so only admins previewing can call it.
 *
 * @param WP_REST_Request $request
 * @return WP_Error  Only on failure; success streams PDF and exits.
 */
function gots_rest_preview_tutorial_certificate($request) {
    $tutorial_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    $recipient_name = isset($params['recipientName']) ? sanitize_text_field($params['recipientName']) : 'Jane Student';

    $template = gots_resolve_tutorial_template($tutorial_id);

    $cert_settings = gots_get_tutorial_cert_settings($tutorial_id);
    $issuer_name   = !empty($cert_settings['issuer_name'])
        ? $cert_settings['issuer_name']
        : get_bloginfo('name');

    $values = array(
        'recipient_name'  => $recipient_name,
        'tutorial_title'  => get_the_title($tutorial_id),
        'completion_date' => current_time('Y-m-d'),
        'issuer_name'     => $issuer_name,
        'certificate_id'  => 'PREVIEW-0000',
    );

    $html  = gots_render_certificate_html($template, $values);
    $bytes = gots_render_pdf($html, array('paper_size' => 'letter', 'orientation' => 'landscape'));

    if (is_wp_error($bytes)) {
        return $bytes;
    }

    nocache_headers();
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="certificate-preview.pdf"');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
    exit;
}

/**
 * GET /certificates/{token}/download
 *
 * Streams the certificate PDF to the browser.
 *
 * @param WP_REST_Request $request
 * @return WP_Error  Only on failure; success causes exit via gots_stream_certificate_pdf().
 */
function gots_rest_download_certificate($request) {
    $token = $request->get_param('token');

    if (empty($token)) {
        return new WP_Error('missing_token', 'Download token is required.', array('status' => 400));
    }

    $result = gots_stream_certificate_pdf(urldecode($token));

    // If we get here, streaming failed
    if (is_wp_error($result)) {
        return $result;
    }

    // Should not reach here — gots_stream_certificate_pdf exits on success
    return new WP_Error('stream_error', 'Failed to stream certificate.', array('status' => 500));
}

/**
 * GET /certificates/verify/{verification_id}
 *
 * Public verification by the Certificate ID (UUID) printed on the PDF.
 * Does not expose the recipient name.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function gots_rest_verify_certificate($request) {
    $vid = $request->get_param('verification_id');
    $vid = is_string($vid) ? sanitize_text_field($vid) : '';

    // Rate-limit public verify: 60 lookups per IP per hour to prevent enumeration
    $ip_hash  = substr(hash('sha256', gots_get_client_ip()), 0, 24);
    $rl_key   = 'gots_verify_rl_' . $ip_hash;
    $rl_count = (int) get_transient($rl_key);
    if ($rl_count >= 60) {
        return new WP_Error('rate_limited', 'Too many verification requests. Please wait before trying again.', array('status' => 429));
    }
    set_transient($rl_key, $rl_count + 1, HOUR_IN_SECONDS);

    $row = gots_lookup_certificate_by_verification_token($vid);
    if (!$row || $row->status !== 'issued') {
        return rest_ensure_response(array('valid' => false));
    }

    return rest_ensure_response(array(
        'valid'          => true,
        'issued_at'      => $row->issued_at,
        'tutorial_title' => get_the_title((int) $row->tutorial_id),
    ));
}

// ── Admin certificate template REST callbacks ──────────────────────────────────

/**
 * GET /certificate-templates
 */
function gots_rest_list_cert_templates($request) {
    $templates = gots_list_templates();
    return rest_ensure_response($templates);
}

/**
 * POST /certificate-templates
 */
function gots_rest_create_cert_template($request) {
    $params = $request->get_json_params() ?: array();

    $data = gots_validate_template_data($params);
    if (is_wp_error($data)) {
        return $data;
    }

    $id = gots_create_template($data);
    if (is_wp_error($id)) {
        return $id;
    }

    return rest_ensure_response(gots_get_template($id));
}

/**
 * PUT /certificate-templates/{id}
 */
function gots_rest_update_cert_template($request) {
    $template_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    $data = gots_validate_template_data($params);
    if (is_wp_error($data)) {
        return $data;
    }

    $result = gots_update_template($template_id, $data);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response(gots_get_template($template_id));
}

/**
 * DELETE /certificate-templates/{id}
 */
function gots_rest_delete_cert_template($request) {
    $template_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();
    $confirmed   = !empty($params['confirmed']);

    // First call (no confirmed flag): always return usage info so the frontend
    // can show a confirmation dialog before any data is destroyed.
    if (!$confirmed) {
        $affected = gots_get_tutorials_using_template($template_id);
        return rest_ensure_response(array(
            'deleted'            => false,
            'confirmRequired'    => !empty($affected),
            'affectedTutorials'  => $affected ?: array(),
        ));
    }

    $result = gots_delete_template($template_id);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response(array('deleted' => true, 'id' => $template_id));
}

/**
 * POST /certificate-templates/{id}/preview
 *
 * Renders a preview PDF and streams it inline to the browser.
 */
function gots_rest_preview_cert_template($request) {
    $template_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    // Allow previewing with optional unsaved config overrides
    if ($template_id > 0) {
        $template = gots_get_template($template_id);
        if (!$template) {
            return new WP_Error('not_found', 'Template not found.', array('status' => 404));
        }
        // Apply any preview overrides to config
        if (!empty($params['config_json']) && is_array($params['config_json'])) {
            $config_result = gots_validate_template_config($params['config_json']);
            if (is_wp_error($config_result)) {
                return $config_result;
            }
            $template->config_json = $config_result;
        }
    } else {
        $template = gots_get_builtin_fallback_template();
        if (!empty($params['config_json']) && is_array($params['config_json'])) {
            $config_result = gots_validate_template_config($params['config_json']);
            if (is_wp_error($config_result)) {
                return $config_result;
            }
            $template->config_json = array_merge($template->config_json, $config_result);
        }
    }

    // Unsaved layout (e.g. custom_html while creating a template)
    if (!empty($params['layout_type']) && is_string($params['layout_type'])) {
        $lt = sanitize_key($params['layout_type']);
        if (in_array($lt, GOTS_CERT_PRESETS, true)) {
            $template->layout_type = $lt;
        }
    }

    // Optional logo override for preview (null clears unsaved preview; attachment must be an image)
    if (array_key_exists('logo_media_id', $params)) {
        $raw_logo = $params['logo_media_id'];
        $template->logo_media_id = ($raw_logo === null || $raw_logo === '' || (int) $raw_logo === 0)
            ? null
            : gots_sanitize_certificate_logo_media_id($raw_logo);
    }

    $values = array(
        'recipient_name'  => 'Jane Student',
        'tutorial_title'  => 'Sample Tutorial',
        'completion_date' => current_time('Y-m-d'),
        'issuer_name'     => get_bloginfo('name'),
        'certificate_id'  => 'PREVIEW-0000',
    );

    $html  = gots_render_certificate_html($template, $values);
    $bytes = gots_render_pdf($html, array('paper_size' => 'letter', 'orientation' => 'landscape'));

    if (is_wp_error($bytes)) {
        return $bytes;
    }

    nocache_headers();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="certificate-preview.pdf"');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
    exit;
}

/**
 * PUT /tutorials/{id}/certificate-settings
 */
function gots_rest_update_tutorial_cert_settings($request) {
    $tutorial_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    $settings = array(
        'enabled'     => !empty($params['enabled']),
        'template_id' => isset($params['templateId']) ? absint($params['templateId']) : 0,
        'issuer_name' => isset($params['issuerName']) ? sanitize_text_field($params['issuerName']) : '',
    );

    gots_save_tutorial_cert_settings($tutorial_id, $settings);

    return rest_ensure_response(gots_get_tutorial_cert_settings($tutorial_id));
}

/**
 * GET /tutorials/{id}/certificate-settings
 */
function gots_rest_get_tutorial_cert_settings_endpoint($request) {
    $tutorial_id = absint($request->get_param('id'));

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    return rest_ensure_response(gots_get_tutorial_cert_settings($tutorial_id));
}

//Tutorial theme REST callbacks 

/**
 * GET /tutorial-themes
 */
function gots_rest_list_tutorial_themes($request) {
    return rest_ensure_response(gots_list_themes());
}

/**
 * POST /tutorial-themes
 */
function gots_rest_create_tutorial_theme($request) {
    $params = $request->get_json_params() ?: array();

    $data = gots_validate_theme_data($params);
    if (is_wp_error($data)) {
        return $data;
    }

    $id = gots_create_theme($data);
    if (is_wp_error($id)) {
        return $id;
    }

    return rest_ensure_response(gots_get_theme($id));
}

/**
 * PUT /tutorial-themes/{id}
 */
function gots_rest_update_tutorial_theme($request) {
    $theme_id = absint($request->get_param('id'));
    $params   = $request->get_json_params() ?: array();

    $data = gots_validate_theme_data($params);
    if (is_wp_error($data)) {
        return $data;
    }

    $result = gots_update_theme($theme_id, $data);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response(gots_get_theme($theme_id));
}

/**
 * DELETE /tutorial-themes/{id}
 *
 * Mirrors the cert template delete pattern: first call returns usage info so
 * the frontend can show a confirmation dialog; second call (confirmed=true) deletes.
 */
function gots_rest_delete_tutorial_theme($request) {
    $theme_id = absint($request->get_param('id'));
    $params   = $request->get_json_params() ?: array();
    $confirmed = !empty($params['confirmed']);

    // First call (no confirmed flag): always return usage info so the frontend
    // can show a confirmation dialog before any data is destroyed.
    if (!$confirmed) {
        $affected = gots_get_tutorials_using_theme($theme_id);
        return rest_ensure_response(array(
            'deleted'           => false,
            'confirmRequired'   => !empty($affected),
            'affectedTutorials' => $affected ?: array(),
        ));
    }

    $result = gots_delete_theme($theme_id);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response(array('deleted' => true, 'id' => $theme_id));
}

/**
 * GET /tutorials/{id}/theme-settings
 */
function gots_rest_get_tutorial_theme_settings_endpoint($request) {
    $tutorial_id = absint($request->get_param('id'));

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    return rest_ensure_response(gots_get_tutorial_theme_settings($tutorial_id));
}

/**
 * PUT /tutorials/{id}/theme-settings
 *
 * Dedicated endpoint — only writes _gots_theme_id. Never touches slides.
 * Mirrors gots_rest_update_tutorial_cert_settings() exactly.
 */
function gots_rest_update_tutorial_theme_settings($request) {
    $tutorial_id = absint($request->get_param('id'));
    $params      = $request->get_json_params() ?: array();

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    // Sanitize and validate theme_id
    $theme_id = isset($params['themeId']) ? absint($params['themeId']) : 0;

    // If a non-zero theme_id is supplied, verify it exists and is active
    if ($theme_id > 0 && !gots_get_theme($theme_id)) {
        return new WP_Error(
            'invalid_theme',
            'The selected theme does not exist or has been deactivated.',
            array('status' => 400)
        );
    }

    gots_save_tutorial_theme_settings($tutorial_id, array('theme_id' => $theme_id ?: null));

    return rest_ensure_response(gots_get_tutorial_theme_settings($tutorial_id));
}

/**
 * GET /tutorials/{id}/certificates
 */
function gots_rest_list_tutorial_certificates($request) {
    $tutorial_id = absint($request->get_param('id'));

    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_not_found', 'Tutorial not found.', array('status' => 404));
    }

    $limit  = min(absint($request->get_param('limit')  ?: 50), 200);
    $offset = absint($request->get_param('offset') ?: 0);

    $certs = gots_get_tutorial_certificates($tutorial_id, $limit, $offset);

    return rest_ensure_response(array(
        'tutorialId'   => $tutorial_id,
        'certificates' => $certs,
        'count'        => count($certs),
    ));
}