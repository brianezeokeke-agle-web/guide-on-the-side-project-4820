<?php
/**
 * Per-student completion tracking.
 *
 * Records a server-side completion record when a student finishes a tutorial,
 * so that certificate issuance can verify actual completion rather than
 * trusting the frontend alone.
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

define('GOTS_COMPLETION_DB_VERSION', '1.0.0');

/**
 * Create or upgrade the gots_completions table.
 */
function gots_create_completions_table() {
    global $wpdb;

    $table           = $wpdb->prefix . 'gots_completions';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        tutorial_id BIGINT(20) UNSIGNED NOT NULL,
        student_identifier_hash VARCHAR(128) NOT NULL,
        completed_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY uq_student_tutorial (student_identifier_hash, tutorial_id)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('gots_completion_db_version', GOTS_COMPLETION_DB_VERSION);
}

/**
 * Lazily create/upgrade the completions table if version is behind.
 */
function gots_maybe_create_completions_table() {
    $installed = get_option('gots_completion_db_version', '0');
    if (version_compare($installed, GOTS_COMPLETION_DB_VERSION, '<')) {
        gots_create_completions_table();
    }
}
add_action('admin_init', 'gots_maybe_create_completions_table');

/**
 * Record that a student completed a tutorial.
 *
 * Uses an upsert so repeated completions (e.g. restarting and finishing again)
 * simply update the timestamp without creating duplicates.
 *
 * @param int    $tutorial_id
 * @param string $student_id  Hashed student identifier.
 * @return bool  True on success.
 */
function gots_record_completion($tutorial_id, $student_id) {
    global $wpdb;

    $table  = $wpdb->prefix . 'gots_completions';
    $result = $wpdb->query($wpdb->prepare(
        "INSERT INTO $table (tutorial_id, student_identifier_hash, completed_at)
         VALUES (%d, %s, %s)
         ON DUPLICATE KEY UPDATE completed_at = VALUES(completed_at)",
        absint($tutorial_id),
        sanitize_text_field($student_id),
        current_time('mysql')
    ));

    return $result !== false;
}

/**
 * Check whether a student has a server-side completion record for a tutorial.
 *
 * @param int    $tutorial_id
 * @param string $student_id  Hashed student identifier.
 * @return bool
 */
function gots_has_completed($tutorial_id, $student_id) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_completions';

    $row = $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM $table WHERE tutorial_id = %d AND student_identifier_hash = %s LIMIT 1",
        absint($tutorial_id),
        $student_id
    ));

    return $row !== null;
}
