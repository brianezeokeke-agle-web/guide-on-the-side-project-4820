<?php
/**
 * Certificate template CRUD, validation, and preset rendering.
 *
 * Responsibilities:
 *  - Create/upgrade the gots_certificate_templates table.
 *  - Enforce preset types: classic, minimal, formal.
 *  - Validate and sanitize template config fields.
 *  - Enforce placeholder allowlist during merge.
 *  - Resolve the active template for a given tutorial.
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// ─── DB version ──────────────────────────────────────────────────────────────

define('GOTS_CERT_TMPL_DB_VERSION', '1.0.0');

/**
 * Create or upgrade the gots_certificate_templates table.
 * Called on activation and lazily on admin_init.
 */
function gots_create_certificate_templates_table() {
    global $wpdb;

    $table           = $wpdb->prefix . 'gots_certificate_templates';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        layout_type VARCHAR(50) NOT NULL DEFAULT 'classic',
        background_media_id BIGINT(20) UNSIGNED NULL DEFAULT NULL,
        logo_media_id BIGINT(20) UNSIGNED NULL DEFAULT NULL,
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

    update_option('gots_cert_tmpl_db_version', GOTS_CERT_TMPL_DB_VERSION);
}

/**
 * Lazily create/upgrade certificate_templates table if version is behind.
 */
function gots_maybe_create_certificate_templates_table() {
    $installed = get_option('gots_cert_tmpl_db_version', '0');
    if (version_compare($installed, GOTS_CERT_TMPL_DB_VERSION, '<')) {
        gots_create_certificate_templates_table();
    }
}
add_action('admin_init', 'gots_maybe_create_certificate_templates_table');

// ─── Preset constants ─────────────────────────────────────────────────────────

/** Supported layout preset types. */
define('GOTS_CERT_PRESETS', array('classic', 'minimal', 'formal'));

/** Allowed placeholder tokens in template text fields. */
define('GOTS_CERT_PLACEHOLDERS', array(
    '{{recipient_name}}',
    '{{tutorial_title}}',
    '{{completion_date}}',
    '{{issuer_name}}',
    '{{certificate_id}}',
));

/**
 * Allowed config keys per preset (keys the librarian may edit).
 * All other keys are rejected.
 */
define('GOTS_CERT_CONFIG_KEYS', array(
    'title',             // main heading text
    'subtitle',          // sub-heading / "Certificate of Completion"
    'body_text',         // body paragraph
    'issuer_name',       // library / organization display name
    'signature_label',   // label below signature line
    'accent_color',      // hex color code
    'font_family',       // approved font name (see GOTS_CERT_FONTS)
    'show_border',       // bool
    'show_seal',         // bool
));

/** Approved font families (subset of safe CSS web-safe fonts + common system fonts). */
define('GOTS_CERT_FONTS', array(
    'Georgia',
    'Times New Roman',
    'Arial',
    'Helvetica',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Palatino Linotype',
));

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate and sanitize template input data from a REST request.
 *
 * @param array $data  Raw input (from REST request params).
 * @return array|WP_Error  Sanitized data array or WP_Error on validation failure.
 */
function gots_validate_template_data($data) {
    $errors = array();

    // name — required string
    if (empty($data['name'])) {
        $errors[] = 'name is required';
    }

    // layout_type — must be a known preset
    $layout = isset($data['layout_type']) ? $data['layout_type'] : 'classic';
    if (!in_array($layout, GOTS_CERT_PRESETS, true)) {
        $errors[] = 'layout_type must be one of: ' . implode(', ', GOTS_CERT_PRESETS);
    }

    // config_json — must be array if present
    $config = array();
    if (!empty($data['config_json'])) {
        if (is_string($data['config_json'])) {
            $config = json_decode($data['config_json'], true);
            if (!is_array($config)) {
                $errors[] = 'config_json must be a valid JSON object';
            }
        } elseif (is_array($data['config_json'])) {
            $config = $data['config_json'];
        } else {
            $errors[] = 'config_json must be a JSON object or array';
        }
    }

    if (!empty($errors)) {
        return new WP_Error('validation_error', implode('; ', $errors), array('status' => 400));
    }

    // Validate the config fields individually
    $config_result = gots_validate_template_config($config);
    if (is_wp_error($config_result)) {
        return $config_result;
    }

    return array(
        'name'                => sanitize_text_field($data['name']),
        'slug'                => gots_generate_template_slug(isset($data['slug']) ? $data['slug'] : $data['name']),
        'layout_type'         => $layout,
        'background_media_id' => !empty($data['background_media_id']) ? absint($data['background_media_id']) : null,
        'logo_media_id'       => !empty($data['logo_media_id'])       ? absint($data['logo_media_id'])       : null,
        'config_json'         => $config_result,
        'is_default'          => !empty($data['is_default']) ? 1 : 0,
        'is_active'           => isset($data['is_active']) ? (int) (bool) $data['is_active'] : 1,
    );
}

/**
 * Validate and sanitize a config array against the allowed key list.
 *
 * @param array $config  Raw config array.
 * @return array|WP_Error  Sanitized config array on success, WP_Error on error.
 */
function gots_validate_template_config($config) {
    if (!is_array($config)) {
        return new WP_Error('validation_error', 'config must be an array', array('status' => 400));
    }

    $allowed_keys = GOTS_CERT_CONFIG_KEYS;
    $sanitized    = array();

    foreach ($config as $key => $value) {
        if (!in_array($key, $allowed_keys, true)) {
            return new WP_Error(
                'validation_error',
                'config contains unsupported key: ' . sanitize_key($key),
                array('status' => 400)
            );
        }

        switch ($key) {
            case 'accent_color':
                // hex color only
                if (!preg_match('/^#[0-9A-Fa-f]{3,6}$/', $value)) {
                    return new WP_Error(
                        'validation_error',
                        'accent_color must be a valid hex color (e.g. #3b82f6)',
                        array('status' => 400)
                    );
                }
                $sanitized[$key] = sanitize_text_field($value);
                break;

            case 'font_family':
                if (!in_array($value, GOTS_CERT_FONTS, true)) {
                    return new WP_Error(
                        'validation_error',
                        'font_family must be one of: ' . implode(', ', GOTS_CERT_FONTS),
                        array('status' => 400)
                    );
                }
                $sanitized[$key] = $value;
                break;

            case 'show_border':
            case 'show_seal':
                $sanitized[$key] = (bool) $value;
                break;

            case 'title':
            case 'subtitle':
            case 'body_text':
            case 'issuer_name':
            case 'signature_label':
                // Allow placeholder tokens but strip arbitrary HTML
                $sanitized[$key] = gots_sanitize_placeholders(wp_kses($value, array()));
                break;

            default:
                $sanitized[$key] = sanitize_text_field($value);
        }
    }

    return $sanitized;
}

/**
 * Remove any {{token}} occurrences that are not in the allowlist.
 *
 * @param string $text
 * @return string
 */
function gots_sanitize_placeholders($text) {
    // Remove any {{...}} token that is NOT in the allowlist
    return preg_replace_callback('/\{\{([^}]+)\}\}/', function ($matches) {
        $token = '{{' . $matches[1] . '}}';
        return in_array($token, GOTS_CERT_PLACEHOLDERS, true) ? $token : '';
    }, $text);
}

/**
 * Generate a unique slug for a template name.
 *
 * @param string $base  Name or desired slug.
 * @return string
 */
function gots_generate_template_slug($base) {
    global $wpdb;

    $slug      = sanitize_title($base);
    $table     = $wpdb->prefix . 'gots_certificate_templates';
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

// ─── Template CRUD ────────────────────────────────────────────────────────────

/**
 * List all active certificate templates.
 *
 * @return array  Array of template objects with config_json decoded.
 */
function gots_list_templates() {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_certificate_templates';
    $rows  = $wpdb->get_results(
        "SELECT * FROM $table WHERE is_active = 1 ORDER BY is_default DESC, name ASC",
        OBJECT
    );

    foreach ($rows as $row) {
        $row->config_json = json_decode($row->config_json, true) ?: array();
    }

    return $rows ?: array();
}

/**
 * Get a single template by ID.
 *
 * @param int $template_id
 * @return object|null  Template object with config_json decoded, or null.
 */
function gots_get_template($template_id) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_certificate_templates';
    $row   = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE id = %d AND is_active = 1",
        absint($template_id)
    ), OBJECT);

    if (!$row) {
        return null;
    }

    $row->config_json = json_decode($row->config_json, true) ?: array();
    return $row;
}

/**
 * Create a new certificate template.
 *
 * @param array $data  Already validated/sanitized template data.
 * @return int|WP_Error  New template ID or WP_Error.
 */
function gots_create_template($data) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_certificate_templates';
    $now   = current_time('mysql');

    // If this is being set as default, unset previous defaults first
    if (!empty($data['is_default'])) {
        $wpdb->update($table, array('is_default' => 0), array('is_default' => 1));
    }

    $inserted = $wpdb->insert(
        $table,
        array(
            'name'                => $data['name'],
            'slug'                => $data['slug'],
            'layout_type'         => $data['layout_type'],
            'background_media_id' => $data['background_media_id'],
            'logo_media_id'       => $data['logo_media_id'],
            'config_json'         => wp_json_encode($data['config_json']),
            'is_default'          => (int) $data['is_default'],
            'is_active'           => (int) $data['is_active'],
            'created_at'          => $now,
            'updated_at'          => $now,
        ),
        array('%s', '%s', '%s', '%d', '%d', '%s', '%d', '%d', '%s', '%s')
    );

    if ($inserted === false) {
        error_log('[GOTS Cert] Failed to insert template: ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Could not create template.', array('status' => 500));
    }

    return (int) $wpdb->insert_id;
}

/**
 * Update an existing certificate template.
 *
 * @param int   $template_id
 * @param array $data  Already validated/sanitized template data.
 * @return bool|WP_Error  True on success, WP_Error on failure.
 */
function gots_update_template($template_id, $data) {
    global $wpdb;

    $table       = $wpdb->prefix . 'gots_certificate_templates';
    $template_id = absint($template_id);

    // Verify exists
    if (!gots_get_template($template_id)) {
        return new WP_Error('not_found', 'Template not found.', array('status' => 404));
    }

    // Handle default transition
    if (!empty($data['is_default'])) {
        $wpdb->update($table, array('is_default' => 0), array('is_default' => 1));
    }

    $updated = $wpdb->update(
        $table,
        array(
            'name'                => $data['name'],
            'layout_type'         => $data['layout_type'],
            'background_media_id' => $data['background_media_id'],
            'logo_media_id'       => $data['logo_media_id'],
            'config_json'         => wp_json_encode($data['config_json']),
            'is_default'          => (int) $data['is_default'],
            'is_active'           => (int) $data['is_active'],
            'updated_at'          => current_time('mysql'),
        ),
        array('id' => $template_id),
        array('%s', '%s', '%d', '%d', '%s', '%d', '%d', '%s'),
        array('%d')
    );

    if ($updated === false) {
        error_log('[GOTS Cert] Failed to update template ' . $template_id . ': ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Could not update template.', array('status' => 500));
    }

    return true;
}

/**
 * Soft-delete (deactivate) a certificate template.
 *
 * @param int $template_id
 * @return bool|WP_Error  True on success, WP_Error on failure.
 */
function gots_delete_template($template_id) {
    global $wpdb;

    $table       = $wpdb->prefix . 'gots_certificate_templates';
    $template_id = absint($template_id);

    if (!gots_get_template($template_id)) {
        return new WP_Error('not_found', 'Template not found.', array('status' => 404));
    }

    $updated = $wpdb->update(
        $table,
        array('is_active' => 0, 'updated_at' => current_time('mysql')),
        array('id' => $template_id),
        array('%d', '%s'),
        array('%d')
    );

    if ($updated === false) {
        return new WP_Error('db_error', 'Could not delete template.', array('status' => 500));
    }

    return true;
}

// ─── Tutorial linkage ─────────────────────────────────────────────────────────

/**
 * Resolve the effective template for a tutorial.
 *
 * Priority: tutorial-assigned template → site default template → built-in fallback.
 *
 * @param int $tutorial_id
 * @return object  Template object (never null — falls back to built-in).
 */
function gots_resolve_tutorial_template($tutorial_id) {
    $assigned_id = (int) get_post_meta($tutorial_id, '_gots_certificate_template_id', true);

    if ($assigned_id > 0) {
        $template = gots_get_template($assigned_id);
        if ($template) {
            return $template;
        }
    }

    // Try site default
    global $wpdb;
    $table = $wpdb->prefix . 'gots_certificate_templates';
    $row   = $wpdb->get_row(
        "SELECT * FROM $table WHERE is_active = 1 AND is_default = 1 LIMIT 1",
        OBJECT
    );

    if ($row) {
        $row->config_json = json_decode($row->config_json, true) ?: array();
        return $row;
    }

    // Built-in fallback (no DB row — synthesize a plain object)
    return gots_get_builtin_fallback_template();
}

/**
 * Return a synthesized built-in template object used when no DB template exists.
 *
 * @return object
 */
function gots_get_builtin_fallback_template() {
    $t = new stdClass();
    $t->id                  = 0;
    $t->name                = 'Default';
    $t->slug                = 'default';
    $t->layout_type         = 'classic';
    $t->background_media_id = null;
    $t->logo_media_id       = null;
    $t->is_default          = 1;
    $t->is_active           = 1;
    $t->config_json         = array(
        'title'           => 'Certificate of Completion',
        'subtitle'        => 'This certifies that',
        'body_text'       => '{{recipient_name}} has successfully completed {{tutorial_title}} on {{completion_date}}.',
        'issuer_name'     => '{{issuer_name}}',
        'signature_label' => 'Authorized Signature',
        'accent_color'    => '#2563eb',
        'font_family'     => 'Georgia',
        'show_border'     => true,
        'show_seal'       => false,
    );
    return $t;
}

/**
 * Get certificate settings for a tutorial.
 *
 * @param int $tutorial_id
 * @return array{enabled: bool, template_id: int|null, issuer_name: string}
 */
function gots_get_tutorial_cert_settings($tutorial_id) {
    return array(
        'enabled'     => (bool) get_post_meta($tutorial_id, '_gots_certificate_enabled', true),
        'template_id' => (int) get_post_meta($tutorial_id, '_gots_certificate_template_id', true) ?: null,
        'issuer_name' => sanitize_text_field(
            (string) get_post_meta($tutorial_id, '_gots_certificate_issuer_name', true)
        ),
    );
}

/**
 * Save certificate settings for a tutorial.
 *
 * @param int   $tutorial_id
 * @param array $settings  {enabled, template_id, issuer_name}
 * @return void
 */
function gots_save_tutorial_cert_settings($tutorial_id, $settings) {
    $tutorial_id = absint($tutorial_id);

    update_post_meta($tutorial_id, '_gots_certificate_enabled',     !empty($settings['enabled']) ? '1' : '');
    update_post_meta($tutorial_id, '_gots_certificate_template_id', absint($settings['template_id'] ?? 0));
    update_post_meta($tutorial_id, '_gots_certificate_issuer_name', sanitize_text_field($settings['issuer_name'] ?? ''));
}

// ─── Placeholder merge ────────────────────────────────────────────────────────

/**
 * Merge placeholders into a text string.
 *
 * @param string $text   Text with {{placeholder}} tokens.
 * @param array  $values Associative map: placeholder_key => replacement value.
 *                       Keys should not include the braces (e.g. 'recipient_name').
 * @return string
 */
function gots_merge_placeholders($text, $values) {
    foreach ($values as $key => $value) {
        $token = '{{' . $key . '}}';
        if (in_array($token, GOTS_CERT_PLACEHOLDERS, true)) {
            $text = str_replace($token, esc_html($value), $text);
        }
    }
    return $text;
}

// ─── HTML generation ──────────────────────────────────────────────────────────

/**
 * Produce the sanitized, rendered HTML for a certificate preset.
 *
 * @param object $template  Template object (from DB or built-in fallback).
 * @param array  $values    Placeholder values keyed without braces.
 * @return string  HTML ready for dompdf rendering.
 */
function gots_render_certificate_html($template, $values) {
    $config = is_array($template->config_json) ? $template->config_json : array();

    // Merge placeholder defaults
    $defaults = array(
        'title'           => 'Certificate of Completion',
        'subtitle'        => 'This certifies that',
        'body_text'       => '{{recipient_name}} has successfully completed {{tutorial_title}} on {{completion_date}}.',
        'issuer_name'     => '{{issuer_name}}',
        'signature_label' => 'Authorized Signature',
        'accent_color'    => '#2563eb',
        'font_family'     => 'Georgia',
        'show_border'     => true,
        'show_seal'       => false,
    );
    $cfg = array_merge($defaults, $config);

    // Sanitize style values
    $accent_color = preg_match('/^#[0-9A-Fa-f]{3,6}$/', $cfg['accent_color'])
        ? $cfg['accent_color'] : '#2563eb';

    $font_family = in_array($cfg['font_family'], GOTS_CERT_FONTS, true)
        ? $cfg['font_family'] : 'Georgia';

    // Merge placeholders into text fields
    $title           = gots_merge_placeholders($cfg['title'],           $values);
    $subtitle        = gots_merge_placeholders($cfg['subtitle'],        $values);
    $body_text       = gots_merge_placeholders($cfg['body_text'],       $values);
    $issuer_name     = gots_merge_placeholders($cfg['issuer_name'],     $values);
    $signature_label = gots_merge_placeholders($cfg['signature_label'], $values);

    // Layout-specific styles
    $layout = in_array($template->layout_type, GOTS_CERT_PRESETS, true)
        ? $template->layout_type : 'classic';

    $border_style = $cfg['show_border']
        ? "border: 6px double {$accent_color}; padding: 40px;"
        : "padding: 40px;";

    // Background image (local file path → data URI for dompdf)
    $bg_style = '';
    if (!empty($template->background_media_id)) {
        $bg_path = get_attached_file($template->background_media_id);
        if ($bg_path && file_exists($bg_path)) {
            $mime = mime_content_type($bg_path);
            if (in_array($mime, array('image/jpeg', 'image/png', 'image/gif'), true)) {
                $b64      = base64_encode(file_get_contents($bg_path));
                $bg_style = "background-image: url('data:{$mime};base64,{$b64}'); background-size: cover; background-position: center;";
            }
        }
    }

    // Logo image
    $logo_html = '';
    if (!empty($template->logo_media_id)) {
        $logo_path = get_attached_file($template->logo_media_id);
        if ($logo_path && file_exists($logo_path)) {
            $mime = mime_content_type($logo_path);
            if (in_array($mime, array('image/jpeg', 'image/png', 'image/gif'), true)) {
                $b64       = base64_encode(file_get_contents($logo_path));
                $logo_html = '<img src="data:' . $mime . ';base64,' . $b64
                    . '" alt="Logo" style="max-height:80px;max-width:200px;margin-bottom:16px;" />';
            }
        }
    }

    // Build layout-specific inner styles
    $layout_styles = array(
        'classic' => "text-align: center;",
        'minimal' => "text-align: left; max-width: 600px; margin: 0 auto;",
        'formal'  => "text-align: center; letter-spacing: 0.02em;",
    );
    $layout_style = isset($layout_styles[$layout]) ? $layout_styles[$layout] : $layout_styles['classic'];

    ob_start();
    ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: <?php echo esc_attr($font_family); ?>, serif;
    background: #fff;
    color: #1a1a1a;
    width: 100%;
    height: 100%;
  }
  .cert-wrap {
    width: 100%;
    min-height: 540px;
    <?php echo $border_style; ?>
    <?php echo $bg_style; ?>
    <?php echo $layout_style; ?>
    display: flex;
    flex-direction: column;
    align-items: <?php echo ($layout === 'minimal') ? 'flex-start' : 'center'; ?>;
    justify-content: center;
    gap: 12px;
  }
  .cert-logo { margin-bottom: 8px; }
  .cert-title {
    font-size: 28pt;
    font-weight: bold;
    color: <?php echo esc_attr($accent_color); ?>;
    margin-bottom: 4px;
  }
  .cert-subtitle {
    font-size: 13pt;
    color: #555;
    margin-bottom: 8px;
    font-style: italic;
  }
  .cert-body {
    font-size: 14pt;
    line-height: 1.6;
    max-width: 520px;
    margin: 0 auto 16px;
  }
  .cert-id {
    font-size: 8pt;
    color: #888;
    margin-top: 16px;
  }
  .cert-signature {
    margin-top: 32px;
    border-top: 1px solid #ccc;
    padding-top: 8px;
    font-size: 10pt;
    color: #555;
    min-width: 200px;
  }
</style>
</head>
<body>
  <div class="cert-wrap">
    <?php if ($logo_html): ?>
      <div class="cert-logo"><?php echo $logo_html; ?></div>
    <?php endif; ?>
    <div class="cert-title"><?php echo esc_html($title); ?></div>
    <div class="cert-subtitle"><?php echo esc_html($subtitle); ?></div>
    <div class="cert-body"><?php echo esc_html($body_text); ?></div>
    <div class="cert-signature">
      <div><?php echo esc_html($issuer_name); ?></div>
      <div><?php echo esc_html($signature_label); ?></div>
    </div>
    <div class="cert-id">Certificate ID: <?php echo esc_html($values['certificate_id'] ?? ''); ?></div>
  </div>
</body>
</html>
    <?php
    return ob_get_clean();
}
