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

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate and sanitize template input data.
 *
 * @param array $data  Raw input (from REST request params).
 * @return array|WP_Error  Sanitized data array or WP_Error on validation failure.
 */
function gots_validate_template_data($data) {
    // stub — implemented in Commit 4
    return new WP_Error('not_implemented', 'Template validation not yet implemented.');
}

/**
 * Validate that a config_json array only contains supported keys.
 *
 * @param array $config
 * @return bool|WP_Error
 */
function gots_validate_template_config($config) {
    // stub — implemented in Commit 4
    return new WP_Error('not_implemented', 'Template config validation not yet implemented.');
}

/**
 * Strip any placeholder tokens that are not in the allowlist from a string.
 *
 * @param string $text
 * @return string
 */
function gots_sanitize_placeholders($text) {
    // stub — implemented in Commit 4
    return sanitize_text_field($text);
}

// ─── Template CRUD ────────────────────────────────────────────────────────────

/**
 * List all active certificate templates.
 *
 * @return array
 */
function gots_list_templates() {
    // stub — implemented in Commit 4
    return array();
}

/**
 * Get a single template by ID.
 *
 * @param int $template_id
 * @return object|null
 */
function gots_get_template($template_id) {
    // stub — implemented in Commit 4
    return null;
}

/**
 * Create a new certificate template.
 *
 * @param array $data  Validated/sanitized template data.
 * @return int|WP_Error  New template ID or WP_Error.
 */
function gots_create_template($data) {
    // stub — implemented in Commit 4
    return new WP_Error('not_implemented', 'Template creation not yet implemented.');
}

/**
 * Update an existing certificate template.
 *
 * @param int   $template_id
 * @param array $data  Validated/sanitized template data.
 * @return bool|WP_Error
 */
function gots_update_template($template_id, $data) {
    // stub — implemented in Commit 4
    return new WP_Error('not_implemented', 'Template update not yet implemented.');
}

/**
 * Soft-delete (deactivate) a certificate template.
 *
 * @param int $template_id
 * @return bool|WP_Error
 */
function gots_delete_template($template_id) {
    // stub — implemented in Commit 4
    return new WP_Error('not_implemented', 'Template deletion not yet implemented.');
}

// ─── Tutorial linkage ─────────────────────────────────────────────────────────

/**
 * Resolve the effective template for a tutorial.
 *
 * Returns the template assigned to the tutorial, the site default, or a
 * built-in fallback in that order of priority.
 *
 * @param int $tutorial_id
 * @return object|null  Template row or null if none configured.
 */
function gots_resolve_tutorial_template($tutorial_id) {
    // stub — implemented in Commit 4
    return null;
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
            get_post_meta($tutorial_id, '_gots_certificate_issuer_name', true)
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
    // stub — implemented in Commit 6
}

// ─── Placeholder merge ────────────────────────────────────────────────────────

/**
 * Merge placeholders into a template text field value.
 *
 * @param string $text   Raw text with {{placeholder}} tokens.
 * @param array  $values Associative array of placeholder => replacement.
 * @return string
 */
function gots_merge_placeholders($text, $values) {
    // stub — implemented in Commit 4
    return $text;
}

// ─── HTML generation ──────────────────────────────────────────────────────────

/**
 * Produce the sanitized, rendered HTML for a certificate.
 *
 * @param object $template  Template row from the DB.
 * @param array  $values    Placeholder values.
 * @return string  HTML ready for dompdf.
 */
function gots_render_certificate_html($template, $values) {
    // stub — implemented in Commit 4 / Commit 5
    return '';
}
