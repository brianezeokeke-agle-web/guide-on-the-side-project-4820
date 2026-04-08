<?php
/**
 * public Playback Routes for the published tutorials
 * 
 * this handles the /gots/play/{id} public route for student viewing
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * register rewrite rules for public playback
 */
function gots_register_public_rewrite_rules() {
    // add rewrite rule: /gots/play/{id}
    add_rewrite_rule(
        '^gots/play/([0-9]+)/?$',
        'index.php?gots_play=$matches[1]',
        'top'
    );
}
add_action('init', 'gots_register_public_rewrite_rules');

/**
 * flush rewrite rules if needed (version-based)
 * this ensures rules are flushed when the plugin is updated with new rules
 */
function gots_maybe_flush_rewrite_rules() {
    $current_version = '1.0.1'; // increment this when adding new rewrite rules
    $stored_version = get_option('gots_rewrite_version', '0');
    
    if (version_compare($stored_version, $current_version, '<')) {
        flush_rewrite_rules();
        update_option('gots_rewrite_version', $current_version);
    }
}
add_action('init', 'gots_maybe_flush_rewrite_rules', 20);


//register query var for public playback
function gots_register_query_vars($vars) {
    $vars[] = 'gots_play';
    return $vars;
}
add_filter('query_vars', 'gots_register_query_vars');


 //handle the public playback template
function gots_handle_public_playback() {
    $tutorial_id = get_query_var('gots_play');
    
    if (empty($tutorial_id)) {
        return;
    }
    
    $tutorial_id = (int) $tutorial_id;
    
    // get the tutorial post
    $post = get_post($tutorial_id);
    
    // check if tutorial exists and is correct type
    if (!$post || $post->post_type !== 'gots_tutorial') {
        gots_render_unavailable_page('Tutorial not found.');
        exit;
    }
    
    // check if this is a preview request from a logged-in admin
    $is_preview = isset($_GET['preview']) && $_GET['preview'] === '1';
    $is_admin_user = is_user_logged_in() && current_user_can('edit_posts');
    
    if ($is_preview && $is_admin_user) {
        // admin preview mode - skip publish/archive checks
        gots_render_playback_page($tutorial_id, $post, true);
        exit;
    }
    
    // check if tutorial is published
    if ($post->post_status !== 'publish') {
        status_header(403);
        gots_render_unavailable_page('This tutorial is not available at the moment.');
        exit;
    }
    
    // check if tutorial is archived
    $archived = get_post_meta($tutorial_id, '_gots_archived', true);
    if ($archived) {
        status_header(403);
        gots_render_unavailable_page('This tutorial is currently unavailable.');
        exit;
    }
    
    // tutorial is valid - render the playback page
    gots_render_playback_page($tutorial_id, $post);
    exit;
}
add_action('template_redirect', 'gots_handle_public_playback');

/**
 * render the unavailable page
 * 
 * @param string $message The message to display
 */
function gots_render_unavailable_page($message) {
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?php echo esc_html__('Tutorial Unavailable', 'guide-on-the-side'); ?> - <?php bloginfo('name'); ?></title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f3f4f6;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .unavailable-container {
                text-align: center;
                padding: 48px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 480px;
                margin: 20px;
            }
            .unavailable-icon {
                font-size: 64px;
                margin-bottom: 24px;
            }
            .unavailable-title {
                font-size: 24px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 12px;
            }
            .unavailable-message {
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 24px;
            }
            .unavailable-link {
                color: #7B2D26;
                text-decoration: none;
                font-weight: 500;
            }
            .unavailable-link:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="unavailable-container">
            <h1 class="unavailable-title"><?php echo esc_html__('Tutorial Unavailable', 'guide-on-the-side'); ?></h1>
            <p class="unavailable-message"><?php echo esc_html($message); ?></p>
            <a href="<?php echo esc_url(home_url('/')); ?>" class="unavailable-link">
                <?php echo esc_html__('Return to Home', 'guide-on-the-side'); ?>
            </a>
        </div>
    </body>
    </html>
    <?php
}

/**
 * render the playback page
 * 
 * @param int $tutorial_id The tutorial ID
 * @param WP_Post $post The tutorial post object
 */
function gots_render_playback_page($tutorial_id, $post, $is_preview = false) {
    // get the tutorial data
    $description = get_post_meta($tutorial_id, '_gots_description', true);
    
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?php echo esc_html($post->post_title); ?> - <?php bloginfo('name'); ?></title>
        <?php
        // enqueue student playback styles
        $build_dir = GOTS_PLUGIN_DIR . 'build-student/';
        $manifest_file = $build_dir . '.vite/manifest.json';
        
        if (file_exists($manifest_file)) {
            $manifest = json_decode(file_get_contents($manifest_file), true);
            
            if (isset($manifest['student.html'])) {
                $entry = $manifest['student.html'];
                
                // output CSS
                if (isset($entry['css']) && is_array($entry['css'])) {
                    foreach ($entry['css'] as $css_file) {
                        echo '<link rel="stylesheet" href="' . esc_url(GOTS_PLUGIN_URL . 'build-student/' . $css_file) . '">';
                    }
                }
            }
        }
        ?>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f9fafb;
                min-height: 100vh;
            }
            #gots-student-root {
                min-height: 100vh;
            }
            .gots-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div id="gots-student-root">
            <div class="gots-loading">Loading tutorial...</div>
        </div>
        
        <?php
        // output configuration for the student app
        $user_name = 'Guest';
        if (is_user_logged_in()) {
            $user = wp_get_current_user();
            $user_name = !empty($user->display_name) ? $user->display_name : $user->user_login;
        }
        $config = array(
            'tutorialId' => $tutorial_id,
            'restUrl'    => esc_url_raw(rest_url('gots/v1')),
            'homeUrl'    => esc_url_raw(home_url('/')),
            'siteName'   => get_bloginfo('name'),
            'isPreview'  => $is_preview,
            'userName'   => $user_name,
            // HMAC token scoped to this tutorial — validates that analytics events originate from a real playback page
            'analyticsToken' => hash_hmac('sha256', 'gots_analytics_' . $tutorial_id, wp_salt('auth')),
        );

        // Certificate support: the completion proof is requested on-demand by the
        // student app at the moment the tutorial is actually completed, not pre-issued
        // here.  We only pass whether certificates are enabled so the UI can show
        // or hide the certificate section without an extra round-trip.
        $config['certificateEnabled'] = (bool) get_post_meta($tutorial_id, '_gots_certificate_enabled', true);

        // Per-session completion nonce — single-use, server-side validated.
        // Generated here (at page-render time) so it is tied to an actual page
        // load rather than to any callable API endpoint.  The proof endpoint
        // validates and consumes it before writing the completion record, which
        // is why the record is written there rather than from the analytics
        // handler (the analytics token is static per-tutorial and could be
        // harvested to forge completion events).
        if ($config['certificateEnabled'] && !$is_preview) {
            $student_hash         = gots_get_student_identifier();
            $completion_nonce     = wp_generate_password(32, false);
            $nonce_transient_key  = 'gots_cnonce_' . md5($student_hash . '_' . $tutorial_id);
            set_transient($nonce_transient_key, $completion_nonce, 8 * HOUR_IN_SECONDS);
            $config['completionNonce'] = $completion_nonce;
        }

        if (is_user_logged_in()) {
            $current_user              = wp_get_current_user();
            $config['currentUserName'] = $current_user->display_name;
            $config['isLoggedIn']      = true;
            // Required for REST cookie auth: without X-WP-Nonce, WP treats the user as logged out on API
            // requests, so gots_get_student_identifier() would not match the proof (user id vs IP hash).
            $config['nonce'] = wp_create_nonce('wp_rest');
        } else {
            $config['currentUserName'] = '';
            $config['isLoggedIn']      = false;
        }

        // Admin preview only: optional start slide (?slide=uuid).
        // Validate that the UUID belongs to THIS tutorial's slides to prevent
        // using a slide ID from a different tutorial.
        if ($is_preview && current_user_can('edit_posts')) {
            if (isset($_GET['slide'])) {
                $raw_slide = sanitize_text_field(wp_unslash($_GET['slide']));
                // slideId values are UUIDs from gots_generate_uuid()
                if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $raw_slide)) {
                    $slides_json = get_post_meta($tutorial_id, '_gots_slides', true);
                    $slides_arr  = !empty($slides_json) ? json_decode($slides_json, true) : array();
                    if (is_array($slides_arr) && in_array($raw_slide, array_column($slides_arr, 'slideId'), true)) {
                        $config['startSlideId'] = $raw_slide;
                    }
                }
            }
        }
        ?>
        <script>
            window.gotsStudentConfig = <?php echo wp_json_encode($config); ?>;
        </script>
        
        <?php
        // enqueue student playback script
        if (file_exists($manifest_file)) {
            $manifest = json_decode(file_get_contents($manifest_file), true);
            
            if (isset($manifest['student.html'])) {
                $entry = $manifest['student.html'];
                
                if (isset($entry['file'])) {
                    echo '<script type="module" src="' . esc_url(GOTS_PLUGIN_URL . 'build-student/' . $entry['file']) . '"></script>';
                }
            }
        }
        ?>
    </body>
    </html>
    <?php
}

/**
 * get the public playback URL for a tutorial
 * 
 * @param int $tutorial_id The tutorial ID
 * @return string The public URL
 */
function gots_get_public_url($tutorial_id) {
    return home_url('/gots/play/' . $tutorial_id);
}
