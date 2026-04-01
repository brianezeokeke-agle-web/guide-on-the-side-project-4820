<?php
/**
 * Certificate issuance, storage, download, and token helpers.
 *
 * Responsibilities:
 *  - Create/upgrade the gots_certificates table.
 *  - Issue a certificate after server-side eligibility checks.
 *  - Generate and validate signed download tokens.
 *  - Stream issued PDFs to the client.
 *  - Provide rate-limiting and replay protection utilities.
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// ─── DB version ──────────────────────────────────────────────────────────────

define('GOTS_CERT_DB_VERSION', '1.0.0');

/**
 * Create or upgrade the gots_certificates table.
 * Called on activation and lazily on admin_init.
 */
function gots_create_certificates_table() {
    global $wpdb;

    $table           = $wpdb->prefix . 'gots_certificates';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        tutorial_id BIGINT(20) UNSIGNED NOT NULL,
        template_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        recipient_name VARCHAR(191) NOT NULL,
        student_identifier_hash VARCHAR(128) NOT NULL,
        verification_token VARCHAR(128) NOT NULL,
        pdf_path TEXT NOT NULL DEFAULT '',
        issued_by VARCHAR(32) NOT NULL DEFAULT 'server',
        issued_at DATETIME NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'issued',
        download_count INT(10) UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (id),
        UNIQUE KEY uq_verification_token (verification_token),
        KEY idx_tutorial_issued (tutorial_id, issued_at),
        KEY idx_student_tutorial (student_identifier_hash, tutorial_id)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('gots_cert_db_version', GOTS_CERT_DB_VERSION);
}

/**
 * Lazily create/upgrade certificates table if version is behind.
 */
function gots_maybe_create_certificates_table() {
    $installed = get_option('gots_cert_db_version', '0');
    if (version_compare($installed, GOTS_CERT_DB_VERSION, '<')) {
        gots_create_certificates_table();
    }
}
add_action('admin_init', 'gots_maybe_create_certificates_table');

// ─── Completion-proof helpers ─────────────────────────────────────────────────

/**
 * Generate a short-lived, signed completion-proof token for a tutorial.
 *
 * The token embeds: tutorial_id, student_identifier_hash, issued timestamp.
 * It is HMAC-signed so the server can verify it without a DB round-trip.
 *
 * @param int    $tutorial_id
 * @param string $student_id  Hashed student identifier (IP or user ID hash).
 * @return string  Base64-url-safe token.
 */
function gots_generate_completion_proof($tutorial_id, $student_id) {
    // stub — implemented in Commit 5
    return '';
}

/**
 * Validate a completion-proof token.
 *
 * @param string $token
 * @param int    $tutorial_id
 * @return array|WP_Error  Decoded payload on success, WP_Error on failure.
 */
function gots_validate_completion_proof($token, $tutorial_id) {
    // stub — implemented in Commit 5
    return new WP_Error('not_implemented', 'Completion proof validation not yet implemented.');
}

// ─── Signed download URL helpers ─────────────────────────────────────────────

/**
 * Generate a signed, time-limited download token for an issued certificate.
 *
 * @param int $certificate_id
 * @return array{token: string, expires_at: string}
 */
function gots_generate_download_token($certificate_id) {
    // stub — implemented in Commit 5
    return array('token' => '', 'expires_at' => '');
}

/**
 * Validate a signed download token and return the certificate record.
 *
 * @param string $token
 * @return object|WP_Error  Certificate row on success, WP_Error on failure.
 */
function gots_validate_download_token($token) {
    // stub — implemented in Commit 5
    return new WP_Error('not_implemented', 'Download token validation not yet implemented.');
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Check whether the current request exceeds issuance rate limits.
 *
 * Limits: max 5 certificates per IP per tutorial per hour.
 *
 * @param int    $tutorial_id
 * @param string $ip  Client IP address.
 * @return bool  True if within limits, false if rate-limited.
 */
function gots_check_certificate_rate_limit($tutorial_id, $ip) {
    // stub — implemented in Commit 5
    return true;
}

// ─── Issuance ─────────────────────────────────────────────────────────────────

/**
 * Issue a certificate for a student who has completed a tutorial.
 *
 * Validates eligibility, renders the PDF, persists the record, and returns
 * a signed download URL.
 *
 * @param int    $tutorial_id
 * @param string $recipient_name  Sanitized recipient name.
 * @param string $completion_proof  Short-lived proof token.
 * @param string $student_id       Hashed student identifier.
 * @return array|WP_Error  {certificateId, downloadUrl, expiresAt} or WP_Error.
 */
function gots_issue_certificate($tutorial_id, $recipient_name, $completion_proof, $student_id) {
    // stub — implemented in Commit 5
    return new WP_Error('not_implemented', 'Certificate issuance not yet implemented.');
}

// ─── Download streaming ───────────────────────────────────────────────────────

/**
 * Stream a certificate PDF to the browser.
 *
 * Validates the token, increments the download counter, and sends the file.
 *
 * @param string $token  Signed download token.
 * @return void|WP_Error  Exits on success; WP_Error on failure.
 */
function gots_stream_certificate_pdf($token) {
    // stub — implemented in Commit 5
    return new WP_Error('not_implemented', 'PDF streaming not yet implemented.');
}

// ─── Admin query helpers ──────────────────────────────────────────────────────

/**
 * List issued certificates for a tutorial.
 *
 * @param int $tutorial_id
 * @param int $limit
 * @param int $offset
 * @return array
 */
function gots_get_tutorial_certificates($tutorial_id, $limit = 50, $offset = 0) {
    // stub — implemented in Commit 6
    return array();
}
