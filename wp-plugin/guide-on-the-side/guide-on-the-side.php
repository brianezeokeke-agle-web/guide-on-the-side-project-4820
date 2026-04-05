<?php
/**
 * Wordpress setup stuff
 * plugin name: Guide on the Side
 * github URL: https://github.com/brianezeokeke-agle-web/guide-on-the-side-project-4820
 * description: Interactive tutorial creator for WordPress/Pressbooks. Create interactive web tutorials, like that of libwizard
 * version: 1.0.0
 * authors: group 9 cs4820
 * Text Domain: guide-on-the-side
 * Domain Path: /languages
 * Requires at least: 5.9
 * Requires PHP: 7.4
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// plugin constants
define('GOTS_VERSION', '1.0.0');
define('GOTS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GOTS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GOTS_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Composer autoload (for Dompdf and dependencies)
if (file_exists(GOTS_PLUGIN_DIR . 'vendor/autoload.php')) {
    require_once GOTS_PLUGIN_DIR . 'vendor/autoload.php';
}

// include the required files
require_once GOTS_PLUGIN_DIR . 'includes/util.php';
require_once GOTS_PLUGIN_DIR . 'includes/post-types.php';
require_once GOTS_PLUGIN_DIR . 'includes/rest-routes.php';
require_once GOTS_PLUGIN_DIR . 'includes/enqueue.php';
require_once GOTS_PLUGIN_DIR . 'includes/public-playback.php';
require_once GOTS_PLUGIN_DIR . 'includes/certificate-pdf.php';
require_once GOTS_PLUGIN_DIR . 'includes/analytics.php';
require_once GOTS_PLUGIN_DIR . 'includes/pdf-renderer.php';
require_once GOTS_PLUGIN_DIR . 'includes/certificate-templates.php';
require_once GOTS_PLUGIN_DIR . 'includes/certificates.php';
require_once GOTS_PLUGIN_DIR . 'includes/tutorial-themes.php';

/**
 * the plugin activation hook
 */
function gots_activate() {
    // register post types on activation
    gots_register_post_types();
    
    // register public playback rewrite rules
    gots_register_public_rewrite_rules();
    
    // create the analytics table
    gots_create_analytics_table();

    // create the certificate tables
    gots_create_certificate_templates_table();
    gots_create_certificates_table();

    // create the tutorial themes table
    gots_create_tutorial_themes_table();
    
    // flush rewrite rules to ensure CPT permalinks work
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'gots_activate');

/**
 * plugin deactivation hook
 */
function gots_deactivate() {
    // flush rewrite rules on deactivation
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'gots_deactivate');

/**
 * initialize the plugin
 */
function gots_init() {
    // register post types
    gots_register_post_types();
    
    // register REST API routes
    add_action('rest_api_init', 'gots_register_rest_routes');
    
    // add admin menu
    add_action('admin_menu', 'gots_add_admin_menu');
    
    // enqueue admin scripts
    add_action('admin_enqueue_scripts', 'gots_enqueue_admin_scripts');
}
add_action('init', 'gots_init');

/**
 * add admin menu page
 */
function gots_add_admin_menu() {
    add_menu_page(
        __('Guide on the Side', 'guide-on-the-side'),  // page title
        __('Guide on the Side', 'guide-on-the-side'),  // menu title
        'edit_posts',  // capability required
        'gots-admin',  // menu slug
        'gots_render_admin_page', // callback function
        'dashicons-welcome-learn-more',  // icon
        30  // position
    );
}

/**
 * render in the admin page
 */
function gots_render_admin_page() {
    // check the user capabilities
    if (!current_user_can('edit_posts')) {
        wp_die(__('You do not have sufficient permissions to access this page.', 'guide-on-the-side'));
    }
    
    // include the admin page template
    include GOTS_PLUGIN_DIR . 'admin/page.php';
}
