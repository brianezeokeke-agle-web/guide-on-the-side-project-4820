<?php
/**
 * script and style enqueue for the proj
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * enqueue admin scripts and styles
 *
 * @param string $hook The current admin page hook
 */
function gots_enqueue_admin_scripts($hook) {
    // only load on our admin page
    if ($hook !== 'toplevel_page_gots-admin') {
        return;
    }
    
    // check if the build files exist
    $build_dir = GOTS_PLUGIN_DIR . 'build/';
    $assets_file = $build_dir . 'assets/index.js';
    $assets_css = $build_dir . 'assets/index.css';
    
    // determine if we're using built assets or dev mode
    $use_built_assets = file_exists($build_dir . 'index.html');
    
    if ($use_built_assets) {
        // production mode - use built assets
        $manifest_file = $build_dir . '.vite/manifest.json';
        
        if (file_exists($manifest_file)) {
            $manifest = json_decode(file_get_contents($manifest_file), true);
            
            // get the entry point from manifest
            if (isset($manifest['index.html'])) {
                $entry = $manifest['index.html'];
                
                // enqueue the CSS
                if (isset($entry['css']) && is_array($entry['css'])) {
                    foreach ($entry['css'] as $index => $css_file) {
                        wp_enqueue_style(
                            'gots-admin-style-' . $index,
                            GOTS_PLUGIN_URL . 'build/' . $css_file,
                            array(),
                            GOTS_VERSION
                        );
                    }
                }
                
                // enqueue the JS
                if (isset($entry['file'])) {
                    wp_enqueue_script(
                        'gots-admin-script',
                        GOTS_PLUGIN_URL . 'build/' . $entry['file'],
                        array(),
                        GOTS_VERSION,
                        true
                    );
                }
            }
        } else {
            // fallback: try standard asset paths
            $js_files = glob($build_dir . 'assets/*.js');
            $css_files = glob($build_dir . 'assets/*.css');
            
            if (!empty($css_files)) {
                foreach ($css_files as $index => $css_file) {
                    $css_url = GOTS_PLUGIN_URL . 'build/assets/' . basename($css_file);
                    wp_enqueue_style(
                        'gots-admin-style-' . $index,
                        $css_url,
                        array(),
                        GOTS_VERSION
                    );
                }
            }
            
            if (!empty($js_files)) {
                // there's uaually one main JS file
                $js_url = GOTS_PLUGIN_URL . 'build/assets/' . basename($js_files[0]);
                wp_enqueue_script(
                    'gots-admin-script',
                    $js_url,
                    array(),
                    GOTS_VERSION,
                    true
                );
            }
        }
    }
    
    // localize script with configuration
    $config = array(
        'restUrl'  => esc_url_raw(rest_url('gots/v1')),
        'nonce'    => wp_create_nonce('wp_rest'),
        'adminUrl' => admin_url(),
        'pluginUrl' => GOTS_PLUGIN_URL,
    );
    
    // if script is enqueued, localize it
    if (wp_script_is('gots-admin-script', 'enqueued')) {
        wp_localize_script('gots-admin-script', 'gotsConfig', $config);
    } else {
        // output config directly if no script to localize
        add_action('admin_footer', function() use ($config) {
            echo '<script>window.gotsConfig = ' . wp_json_encode($config) . ';</script>';
        });
    }
    
    // add the WordPress media library scripts for media upload integration
    wp_enqueue_media();
    
    // enqueue WordPress editor (TinyMCE) for WYSIWYG editing
    wp_enqueue_editor();
}

/**
 * add module type to script tag for ESM support
 *
 * @param string $tag    The script tag
 * @param string $handle The script handle
 * @param string $src    The script source
 * @return string Modified script tag
 */
function gots_add_module_type_to_script($tag, $handle, $src) {
    if ($handle === 'gots-admin-script') {
        // replace type to module for ESM support
        $tag = str_replace(' src', ' type="module" src', $tag);
    }
    return $tag;
}
add_filter('script_loader_tag', 'gots_add_module_type_to_script', 10, 3);
