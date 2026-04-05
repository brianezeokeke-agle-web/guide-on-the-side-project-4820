<?php
/**
 * Tutorial theme template CRUD, validation, and fallback resolution.
 *
 * Mirrors the certificate-templates.php pattern exactly.
 *
 * Responsibilities:
 *  - Create/upgrade the gots_tutorial_themes table.
 *  - Define constrained theme token schema (allowlists, types, defaults).
 *  - Validate and sanitize theme config tokens.
 *  - CRUD: create, update, soft-delete, list, get.
 *  - Resolve the active theme for a tutorial with a safe fallback chain.
 *  - Tutorial theme settings: get/save _gots_theme_id postmeta.
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

//DB version 

define('GOTS_THEME_DB_VERSION', '1.0.0');

/**
 * Create or upgrade the gots_tutorial_themes table.
 * Called on plugin activation and lazily on admin_init.
 */
function gots_create_tutorial_themes_table() {
    global $wpdb;

    $table           = $wpdb->prefix . 'gots_tutorial_themes';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        config_json LONGTEXT NOT NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY uq_slug (slug)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('gots_theme_db_version', GOTS_THEME_DB_VERSION);
}

/**
 * Lazily create/upgrade tutorial_themes table if version is behind.
 */
function gots_maybe_create_tutorial_themes_table() {
    $installed = get_option('gots_theme_db_version', '0');
    if (version_compare($installed, GOTS_THEME_DB_VERSION, '<')) {
        gots_create_tutorial_themes_table();
    }
}
add_action('admin_init', 'gots_maybe_create_tutorial_themes_table');

//Token schema constants 

/**
 * All keys a theme config_json may contain.
 * Any unknown key sent by a client is rejected with a 400 error.
 *
 * schema_version is always stamped as 1 so future migrations can detect format.
 */
define('GOTS_THEME_CONFIG_KEYS', array(
    'primaryColor',    // hex — accent/button/link color
    'backgroundColor', // hex — slide background color
    'textColor',       // hex — primary text color
    'fontFamily',      // approved font name (see GOTS_THEME_FONTS)
    'showProgressBar', // bool — show/hide progress bar
    'buttonStyle',     // 'filled' | 'outline'
    'schema_version',  // int — always 1; used for future migration detection
));

/** Approved font families. Kept in sync with GOTS_CERT_FONTS for consistency. */
define('GOTS_THEME_FONTS', array(
    'Georgia',
    'Times New Roman',
    'Arial',
    'Helvetica',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Palatino Linotype',
));

/** Allowed values for buttonStyle token. */
define('GOTS_THEME_BUTTON_STYLES', array('filled', 'outline'));

//Validation 

/**
 * Validate and sanitize a full theme payload (name + config) from a REST request.
 *
 * @param array $data  Raw input from request.
 * @return array|WP_Error  Sanitized data array or WP_Error on failure.
 */
function gots_validate_theme_data($data) {
    if (empty($data['name'])) {
        return new WP_Error('validation_error', 'name is required', array('status' => 400));
    }

    $config = array();
    if (!empty($data['config_json'])) {
        if (is_string($data['config_json'])) {
            $config = json_decode($data['config_json'], true);
            if (!is_array($config)) {
                return new WP_Error('validation_error', 'config_json must be a valid JSON object', array('status' => 400));
            }
        } elseif (is_array($data['config_json'])) {
            $config = $data['config_json'];
        } else {
            return new WP_Error('validation_error', 'config_json must be a JSON object or array', array('status' => 400));
        }
    }

    $config_result = gots_validate_theme_config($config);
    if (is_wp_error($config_result)) {
        return $config_result;
    }

    return array(
        'name'        => sanitize_text_field($data['name']),
        'slug'        => gots_generate_theme_slug(isset($data['slug']) ? $data['slug'] : $data['name']),
        'config_json' => $config_result,
        'is_default'  => !empty($data['is_default']) ? 1 : 0,
        'is_active'   => isset($data['is_active']) ? (int)(bool) $data['is_active'] : 1,
    );
}

/**
 * Validate and sanitize a theme config_json object against the token allowlist.
 *
 * Called both for theme template CRUD and for slide-level themeOverride.tokens.
 * Unknown keys are rejected (no arbitrary CSS injection possible).
 *
 * @param array $config  Raw config array.
 * @return array|WP_Error  Sanitized config on success, WP_Error on failure.
 */
function gots_validate_theme_config($config) {
    if (!is_array($config)) {
        return new WP_Error('validation_error', 'theme config must be an array', array('status' => 400));
    }

    $allowed_keys = GOTS_THEME_CONFIG_KEYS;
    $sanitized    = array();

    foreach ($config as $key => $value) {
        if (!in_array($key, $allowed_keys, true)) {
            return new WP_Error(
                'validation_error',
                'theme config contains unsupported key: ' . sanitize_key($key),
                array('status' => 400)
            );
        }

        switch ($key) {
            case 'primaryColor':
            case 'backgroundColor':
            case 'textColor':
                // Strict hex validation — no arbitrary CSS values
                if (!is_string($value) || !preg_match('/^#(?:[0-9A-Fa-f]{3}){1,2}$/', $value)) {
                    return new WP_Error(
                        'validation_error',
                        $key . ' must be a valid hex color (e.g. #3b82f6)',
                        array('status' => 400)
                    );
                }
                $sanitized[$key] = sanitize_text_field($value);
                break;

            case 'fontFamily':
                if (!in_array($value, GOTS_THEME_FONTS, true)) {
                    return new WP_Error(
                        'validation_error',
                        'fontFamily must be one of: ' . implode(', ', GOTS_THEME_FONTS),
                        array('status' => 400)
                    );
                }
                $sanitized[$key] = $value;
                break;

            case 'showProgressBar':
                $sanitized[$key] = (bool) $value;
                break;

            case 'buttonStyle':
                if (!in_array($value, GOTS_THEME_BUTTON_STYLES, true)) {
                    return new WP_Error(
                        'validation_error',
                        'buttonStyle must be one of: ' . implode(', ', GOTS_THEME_BUTTON_STYLES),
                        array('status' => 400)
                    );
                }
                $sanitized[$key] = $value;
                break;

            case 'schema_version':
                // Always normalize to 1; client value ignored
                $sanitized[$key] = 1;
                break;

            default:
                $sanitized[$key] = sanitize_text_field((string) $value);
        }
    }

    // Always stamp schema_version so future migrations can detect saved format
    $sanitized['schema_version'] = 1;

    return $sanitized;
}

//Slug generation

/**
 * Generate a unique slug for a theme name.
 *
 * @param string $base  Name or desired slug.
 * @return string
 */
function gots_generate_theme_slug($base) {
    global $wpdb;

    $slug      = sanitize_title($base);
    $table     = $wpdb->prefix . 'gots_tutorial_themes';
    $candidate = $slug;
    $i         = 1;

    while (
        $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table WHERE slug = %s LIMIT 1",
            $candidate
        ))
    ) {
        $candidate = $slug . '-' . $i;
        $i++;
    }

    return $candidate;
}

//CRUD activities

/**
 * List all active tutorial themes.
 *
 * @return array  Array of theme objects with config_json decoded.
 */
function gots_list_themes() {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_tutorial_themes';
    $rows  = $wpdb->get_results(
        "SELECT * FROM $table WHERE is_active = 1 ORDER BY is_default DESC, name ASC",
        OBJECT
    );

    // Defensive: ensure at most one theme is marked as default
    $found_default = false;
    foreach ($rows as $row) {
        $row->config_json = json_decode($row->config_json, true) ?: array();
        $row->id          = (int) $row->id;
        $row->is_default  = (int) $row->is_default;
        $row->is_active   = (int) $row->is_active;

        if ($row->is_default === 1) {
            if ($found_default) {
                $row->is_default = 0;
                $wpdb->update($table, array('is_default' => 0), array('id' => $row->id), array('%d'), array('%d'));
            } else {
                $found_default = true;
            }
        }
    }

    return $rows ?: array();
}

/**
 * Get a single active theme by ID.
 *
 * @param int $theme_id
 * @return object|null  Theme with config_json decoded, or null if not found/inactive.
 */
function gots_get_theme($theme_id) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_tutorial_themes';
    $row   = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE id = %d AND is_active = 1",
        absint($theme_id)
    ), OBJECT);

    if (!$row) {
        return null;
    }

    $row->config_json = json_decode($row->config_json, true) ?: array();
    $row->id          = (int) $row->id;
    $row->is_default  = (int) $row->is_default;
    $row->is_active   = (int) $row->is_active;

    return $row;
}

/**
 * Create a new tutorial theme.
 *
 * @param array $data  Already validated/sanitized data from gots_validate_theme_data().
 * @return int|WP_Error  New theme ID or WP_Error.
 */
function gots_create_theme($data) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_tutorial_themes';
    $now   = current_time('mysql');

    if (!empty($data['is_default'])) {
        $wpdb->update($table, array('is_default' => 0), array('is_default' => 1));
    }

    $inserted = $wpdb->insert(
        $table,
        array(
            'name'        => $data['name'],
            'slug'        => $data['slug'],
            'config_json' => wp_json_encode($data['config_json']),
            'is_default'  => (int) $data['is_default'],
            'is_active'   => (int) $data['is_active'],
            'created_at'  => $now,
            'updated_at'  => $now,
        ),
        array('%s', '%s', '%s', '%d', '%d', '%s', '%s')
    );

    if ($inserted === false) {
        error_log('[GOTS Theme] Failed to insert theme: ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Could not create theme.', array('status' => 500));
    }

    return (int) $wpdb->insert_id;
}

/**
 * Update an existing tutorial theme.
 *
 * @param int   $theme_id
 * @param array $data  Already validated/sanitized data.
 * @return bool|WP_Error  True on success, WP_Error on failure.
 */
function gots_update_theme($theme_id, $data) {
    global $wpdb;

    $table    = $wpdb->prefix . 'gots_tutorial_themes';
    $theme_id = absint($theme_id);

    if (!gots_get_theme($theme_id)) {
        return new WP_Error('not_found', 'Theme not found.', array('status' => 404));
    }

    if (!empty($data['is_default'])) {
        $wpdb->update($table, array('is_default' => 0), array('is_default' => 1));
    }

    $updated = $wpdb->update(
        $table,
        array(
            'name'        => $data['name'],
            'config_json' => wp_json_encode($data['config_json']),
            'is_default'  => (int) $data['is_default'],
            'is_active'   => (int) $data['is_active'],
            'updated_at'  => current_time('mysql'),
        ),
        array('id' => $theme_id),
        array('%s', '%s', '%d', '%d', '%s'),
        array('%d')
    );

    if ($updated === false) {
        error_log('[GOTS Theme] Failed to update theme ' . $theme_id . ': ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Could not update theme.', array('status' => 500));
    }

    return true;
}

/**
 * Soft-delete (deactivate) a tutorial theme.
 *
 * @param int $theme_id
 * @return bool|WP_Error  True on success, WP_Error on failure.
 */
function gots_delete_theme($theme_id) {
    global $wpdb;

    $table    = $wpdb->prefix . 'gots_tutorial_themes';
    $theme_id = absint($theme_id);

    if (!gots_get_theme($theme_id)) {
        return new WP_Error('not_found', 'Theme not found.', array('status' => 404));
    }

    $updated = $wpdb->update(
        $table,
        array('is_active' => 0, 'updated_at' => current_time('mysql')),
        array('id' => $theme_id),
        array('%d', '%s'),
        array('%d')
    );

    if ($updated === false) {
        return new WP_Error('db_error', 'Could not delete theme.', array('status' => 500));
    }

    return true;
}

/**
 * Find all tutorials that have a specific theme assigned.
 *
 * @param int $theme_id
 * @return array  Array of { id, title, status } objects.
 */
function gots_get_tutorials_using_theme($theme_id) {
    $theme_id = absint($theme_id);
    if ($theme_id < 1) return array();

    $query = new WP_Query(array(
        'post_type'      => 'gots_tutorial',
        'post_status'    => array('publish', 'draft'),
        'posts_per_page' => -1,
        'meta_query'     => array(
            array(
                'key'     => '_gots_theme_id',
                'value'   => $theme_id,
                'compare' => '=',
                'type'    => 'NUMERIC',
            ),
        ),
        'fields' => 'ids',
    ));

    $results = array();
    foreach ($query->posts as $post_id) {
        $results[] = array(
            'id'     => (int) $post_id,
            'title'  => get_the_title($post_id),
            'status' => get_post_status($post_id),
        );
    }
    return $results;
}

//Fallback resolution here

/**
 * Resolve the effective theme for a tutorial.
 *
 * Priority chain (mirrors gots_resolve_tutorial_template()):
 *   1. Tutorial-assigned theme (if set and is_active)
 *   2. Site default theme (is_active + is_default)
 *   3. Built-in fallback (id=0, no DB row needed)
 *
 * Never returns null. Never throws. Never returns WP_Error.
 *
 * @param int $tutorial_id
 * @return object  Theme object with decoded config_json.
 */
function gots_resolve_tutorial_theme($tutorial_id) {
    $assigned_id = (int) get_post_meta($tutorial_id, '_gots_theme_id', true);

    if ($assigned_id > 0) {
        $theme = gots_get_theme($assigned_id); // checks is_active = 1
        if ($theme) {
            return $theme;
        }
    }

    // Try site default
    global $wpdb;
    $table = $wpdb->prefix . 'gots_tutorial_themes';
    $row   = $wpdb->get_row(
        "SELECT * FROM $table WHERE is_active = 1 AND is_default = 1 LIMIT 1",
        OBJECT
    );

    if ($row) {
        $row->config_json = json_decode($row->config_json, true) ?: array();
        $row->id          = (int) $row->id;
        $row->is_default  = (int) $row->is_default;
        $row->is_active   = (int) $row->is_active;
        return $row;
    }

    // Built-in fallback — always safe
    return gots_get_builtin_fallback_theme();
}

/**
 * Return a synthesized built-in theme used when no DB theme exists.
 * id = 0 so callers can detect it.
 *
 * @return object
 */
function gots_get_builtin_fallback_theme() {
    $t = new stdClass();
    $t->id          = 0;
    $t->name        = 'Default';
    $t->slug        = 'default';
    $t->is_default  = 1;
    $t->is_active   = 1;
    $t->config_json = array(
        'primaryColor'    => '#7B2D26',
        'backgroundColor' => '#ffffff',
        'textColor'       => '#111827',
        'fontFamily'      => 'Arial',
        'showProgressBar' => true,
        'buttonStyle'     => 'filled',
        'schema_version'  => 1,
    );
    return $t;
}

//Tutorial theme settings 

/**
 * Get the theme settings for a tutorial.
 *
 * @param int $tutorial_id
 * @return array{theme_id: int|null}
 */
function gots_get_tutorial_theme_settings($tutorial_id) {
    $raw = (int) get_post_meta($tutorial_id, '_gots_theme_id', true);
    if ($raw < 1) {
        return array(
            'theme_id' => null,
        );
    }
    // Soft-deleted or missing themes leave stale post meta; expose as unset so the editor can save.
    if (!gots_get_theme($raw)) {
        return array(
            'theme_id' => null,
        );
    }
    return array(
        'theme_id' => $raw,
    );
}

/**
 * Save the theme setting for a tutorial.
 * Only writes _gots_theme_id — never touches slides.
 *
 * @param int   $tutorial_id
 * @param array $settings  { theme_id: int|null }
 */
function gots_save_tutorial_theme_settings($tutorial_id, $settings) {
    $tutorial_id = absint($tutorial_id);
    $theme_id    = isset($settings['theme_id']) ? absint($settings['theme_id']) : 0;
    update_post_meta($tutorial_id, '_gots_theme_id', $theme_id);
}
