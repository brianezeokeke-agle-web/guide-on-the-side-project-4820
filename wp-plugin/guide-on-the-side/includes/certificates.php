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

define('GOTS_CERT_DB_VERSION', '1.1.0');

define('GOTS_CERT_DOWNLOAD_TTL', DAY_IN_SECONDS);

define('GOTS_CERT_PROOF_TTL', 60 * MINUTE_IN_SECONDS);

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
        pdf_path TEXT NOT NULL,
        issued_by VARCHAR(32) NOT NULL DEFAULT 'server',
        issued_at DATETIME NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'issued',
        download_count INT(10) UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (id),
        UNIQUE KEY uq_verification_token (verification_token),
        KEY idx_tutorial_issued (tutorial_id, issued_at),
        UNIQUE KEY uq_student_tutorial (student_identifier_hash, tutorial_id)
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
        // 1.0.0 → 1.1.0: promote the non-unique student+tutorial index to a UNIQUE KEY
        // so the DB itself enforces one certificate per student per tutorial and
        // prevents race-condition duplicate inserts.  dbDelta will not convert an
        // existing KEY to a UNIQUE KEY automatically, so we drop it manually first.
        if (version_compare($installed, '1.1.0', '<') && version_compare($installed, '1.0.0', '>=')) {
            global $wpdb;
            $table      = $wpdb->prefix . 'gots_certificates';
            $index_exists = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE table_schema = DATABASE()
                   AND table_name   = %s
                   AND index_name   = 'idx_student_tutorial'",
                $table
            ));
            if ($index_exists) {
                $wpdb->query("ALTER TABLE $table DROP INDEX idx_student_tutorial");
            }
        }
        gots_create_certificates_table();
    }
}
add_action('admin_init', 'gots_maybe_create_certificates_table');

// HMAC signing helpers

/**
 * Return the plugin-specific signing secret derived from WP AUTH_KEY.
 *
 * @return string
 */
function gots_cert_signing_secret() {
    return hash('sha256', AUTH_KEY . 'gots_cert_v1');
}

/**
 * Build a URL-safe base64 string from arbitrary data.
 *
 * @param string $data
 * @return string
 */
function gots_cert_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Decode a URL-safe base64 string.
 *
 * Re-adds the `=` padding that gots_cert_base64url_encode() stripped, then
 * decodes in strict mode so corrupted tokens return false instead of garbage.
 *
 * @param string $data
 * @return string|false
 */
function gots_cert_base64url_decode($data) {
    $data = strtr($data, '-_', '+/');
    $pad  = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode($data, true);
}

// Completion-proof helpers

/**
 * Generate a short-lived, signed completion-proof token for a tutorial.
 *
 * Payload: {tid, sid, iat}  — tutorial ID, student identifier hash, issued-at.
 * Signed with HMAC-SHA256.  Valid for GOTS_CERT_PROOF_TTL seconds.
 *
 * @param int    $tutorial_id
 * @param string $student_id  Hashed student identifier (IP-hash or user-ID-hash).
 * @param bool   $for_preview When true, payload is marked so issuance may allow non-published tutorials for editors only.
 * @return string  Compact token: <base64url-payload>.<base64url-sig>
 */
function gots_generate_completion_proof($tutorial_id, $student_id, $for_preview = false) {
    $payload = wp_json_encode(array(
        'tid' => (int) $tutorial_id,
        'sid' => (string) $student_id,
        'iat' => time(),
        'pv'  => $for_preview ? 1 : 0,
    ));

    $encoded_payload = gots_cert_base64url_encode($payload);
    $sig             = gots_cert_base64url_encode(
        hash_hmac('sha256', $encoded_payload, gots_cert_signing_secret(), true)
    );

    return $encoded_payload . '.' . $sig;
}

/**
 * Validate a completion-proof token.
 *
 * @param string $token
 * @param int    $tutorial_id  Expected tutorial ID.
 * @return array|WP_Error  Decoded payload on success, WP_Error on failure.
 */
function gots_validate_completion_proof($token, $tutorial_id) {
    if (empty($token) || !is_string($token)) {
        return new WP_Error('invalid_proof', 'Missing completion proof.', array('status' => 400));
    }

    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return new WP_Error('invalid_proof', 'Malformed completion proof.', array('status' => 400));
    }

    list($encoded_payload, $provided_sig) = $parts;

    // Verify signature
    $expected_sig = gots_cert_base64url_encode(
        hash_hmac('sha256', $encoded_payload, gots_cert_signing_secret(), true)
    );

    if (!hash_equals($expected_sig, $provided_sig)) {
        return new WP_Error('invalid_proof', 'Invalid completion proof signature.', array('status' => 403));
    }

    // Decode payload
    $json    = gots_cert_base64url_decode($encoded_payload);
    $payload = json_decode($json, true);

    if (!is_array($payload)) {
        return new WP_Error('invalid_proof', 'Malformed proof payload.', array('status' => 400));
    }

    // Check expiry
    $age = time() - (int) ($payload['iat'] ?? 0);
    if ($age > GOTS_CERT_PROOF_TTL) {
        return new WP_Error('proof_expired', 'Completion proof has expired.', array('status' => 403));
    }

    // Check tutorial ID matches
    if ((int) ($payload['tid'] ?? 0) !== (int) $tutorial_id) {
        return new WP_Error('invalid_proof', 'Proof is not valid for this tutorial.', array('status' => 403));
    }

    return $payload;
}

// Signed download URL helpers

/**
 * Generate a signed, time-limited download token for an issued certificate.
 *
 * @param int $certificate_id
 * @return array{token: string, expires_at: string}
 */
function gots_generate_download_token($certificate_id) {
    $expires = time() + GOTS_CERT_DOWNLOAD_TTL;
    $payload = wp_json_encode(array(
        'cid' => (int) $certificate_id,
        'exp' => $expires,
    ));

    $encoded = gots_cert_base64url_encode($payload);
    $sig     = gots_cert_base64url_encode(
        hash_hmac('sha256', $encoded, gots_cert_signing_secret(), true)
    );

    return array(
        'token'      => $encoded . '.' . $sig,
        'expires_at' => gmdate('Y-m-d\TH:i:s\Z', $expires),
    );
}

/**
 * Validate a signed download token and return the certificate record.
 *
 * @param string $token
 * @return object|WP_Error  Certificate row on success, WP_Error on failure.
 */
function gots_validate_download_token($token) {
    if (empty($token) || !is_string($token)) {
        return new WP_Error('invalid_token', 'Missing download token.', array('status' => 400));
    }

    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return new WP_Error('invalid_token', 'Malformed download token.', array('status' => 400));
    }

    list($encoded, $provided_sig) = $parts;

    $expected_sig = gots_cert_base64url_encode(
        hash_hmac('sha256', $encoded, gots_cert_signing_secret(), true)
    );

    if (!hash_equals($expected_sig, $provided_sig)) {
        return new WP_Error('invalid_token', 'Invalid download token signature.', array('status' => 403));
    }

    $json    = gots_cert_base64url_decode($encoded);
    $payload = json_decode($json, true);

    if (!is_array($payload)) {
        return new WP_Error('invalid_token', 'Malformed token payload.', array('status' => 400));
    }

    if (time() > (int) ($payload['exp'] ?? 0)) {
        return new WP_Error('token_expired', 'Download link has expired.', array('status' => 403));
    }

    // Fetch the certificate record
    global $wpdb;
    $table = $wpdb->prefix . 'gots_certificates';
    $cert  = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE id = %d AND status = 'issued'",
        absint($payload['cid'])
    ), OBJECT);

    if (!$cert) {
        return new WP_Error('cert_not_found', 'Certificate not found.', array('status' => 404));
    }

    return $cert;
}

/**
 * Re-render certificate PDF bytes from DB row + current HTML template.
 * Download uses this so layout/CSS updates apply without re-issuing.
 *
 * @param object $cert Row from gots_certificates (SELECT *).
 * @return string|WP_Error Raw PDF bytes or error.
 */
function gots_rerender_certificate_pdf_bytes($cert) {
    $tutorial_id = (int) $cert->tutorial_id;
    $template    = null;

    if (!empty($cert->template_id)) {
        $template = gots_get_template((int) $cert->template_id);
    }
    if (!$template) {
        $template = gots_resolve_tutorial_template($tutorial_id);
    }

    $cert_settings = gots_get_tutorial_cert_settings($tutorial_id);
    $issuer        = !empty($cert_settings['issuer_name']) ? $cert_settings['issuer_name'] : get_bloginfo('name');
    $issued_day    = (!empty($cert->issued_at) && strlen($cert->issued_at) >= 10)
        ? substr($cert->issued_at, 0, 10)
        : current_time('Y-m-d');

    $values = array(
        'recipient_name'  => $cert->recipient_name,
        'tutorial_title'  => get_the_title($tutorial_id),
        'completion_date' => $issued_day,
        'issuer_name'     => $issuer,
        'certificate_id'  => $cert->verification_token,
    );

    $html = gots_render_certificate_html($template, $values);

    return gots_render_pdf($html, array('paper_size' => 'letter', 'orientation' => 'landscape'));
}

// Rate limiting

/** Max successful new certificate issuances per IP per tutorial per hour (abuse protection). */
define('GOTS_CERT_ISSUE_RATE_LIMIT_MAX', 25);

/**
 * Transient key for certificate issuance rate limit (per IP + tutorial).
 *
 * @param int    $tutorial_id
 * @param string $ip
 * @return string
 */
function gots_certificate_rate_limit_key($tutorial_id, $ip) {
    $ip_hash = hash('sha256', $ip);
    // v2 suffix resets counters after logic change (success-only counting, higher cap).
    return 'gots_cert_rl_v2_' . substr($ip_hash, 0, 16) . '_' . absint($tutorial_id);
}

/**
 * Whether a new (non-duplicate) certificate may be issued under the hourly cap.
 * Does not increment — call gots_certificate_rate_limit_record_success() after a successful insert.
 *
 * @param int    $tutorial_id
 * @param string $ip
 * @return bool
 */
function gots_certificate_rate_limit_allowed($tutorial_id, $ip) {
    $max = (int) apply_filters('gots_certificate_rate_limit_max', GOTS_CERT_ISSUE_RATE_LIMIT_MAX);
    if ($max < 1) {
        $max = GOTS_CERT_ISSUE_RATE_LIMIT_MAX;
    }
    $key   = gots_certificate_rate_limit_key($tutorial_id, $ip);
    $count = (int) get_transient($key);
    return $count < $max;
}

/**
 * Record one successful new certificate issuance toward the hourly rate limit.
 *
 * @param int    $tutorial_id
 * @param string $ip
 * @return void
 */
function gots_certificate_rate_limit_record_success($tutorial_id, $ip) {
    $window = HOUR_IN_SECONDS;
    $key    = gots_certificate_rate_limit_key($tutorial_id, $ip);
    $count  = (int) get_transient($key);
    set_transient($key, $count + 1, $window);
}

/**
 * Check (and consume) an idempotency key to prevent duplicate rapid issuance.
 *
 * A key is considered "used" for 60 seconds after first use.
 *
 * @param string $idempotency_key  Client-supplied key (will be hashed).
 * @return bool  True if the key is fresh (not seen before), false if duplicate.
 */
function gots_check_idempotency_key($idempotency_key) {
    $hashed = hash('sha256', $idempotency_key);
    $key    = 'gots_cert_idem_' . substr($hashed, 0, 32);

    if (get_transient($key) !== false) {
        return false;
    }

    set_transient($key, 1, 60);
    return true;
}

// Student identifier

/**
 * Build a hashed, anonymous student identifier for the current request.
 *
 * For logged-in users: hash of user ID + salt.
 * For anonymous users: persistent first-party cookie (gots_student_id) so
 * the same person on the same browser always gets the same identity regardless
 * of IP changes or user-agent variations.  If no valid cookie exists one is
 * set for one year.
 *
 * @return string  Hex-encoded 64-char hash.
 */
function gots_get_student_identifier() {
    if (is_user_logged_in()) {
        return hash('sha256', (string) get_current_user_id() . AUTH_SALT);
    }

    $cookie_name = 'gots_student_id';

    // Validate an existing cookie — must look like a v4 UUID
    if (!empty($_COOKIE[$cookie_name])) {
        $val = sanitize_text_field($_COOKIE[$cookie_name]);
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $val)) {
            return hash('sha256', $val . AUTH_SALT);
        }
    }

    // No valid cookie — generate a new UUID.  Only set it as a cookie if headers
    // have not been sent yet; on REST API requests this is always the case, but
    // guard defensively to avoid a PHP warning if something flushes output early.
    $new_id = wp_generate_uuid4();
    if (!headers_sent()) {
        setcookie($cookie_name, $new_id, array(
            'expires'  => time() + YEAR_IN_SECONDS,
            'path'     => '/',
            'secure'   => is_ssl(),
            'httponly' => true,
            'samesite' => 'Lax',
        ));
    }

    return hash('sha256', $new_id . AUTH_SALT);
}

/**
 * Get the client IP address.
 *
 * @return string
 */
function gots_get_client_ip() {
    foreach (array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR') as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip  = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

// Issuance

/**
 * Issue a certificate for a student who has completed a tutorial.
 *
 * Validates eligibility, renders the PDF, persists the record, and returns
 * a signed download URL.
 *
 * @param int    $tutorial_id
 * @param string $recipient_name   Sanitized recipient name.
 * @param string $completion_proof Short-lived signed proof token.
 * @param string $student_id       Hashed student identifier.
 * @return array|WP_Error  {certificateId, downloadUrl, expiresAt} or WP_Error.
 */
function gots_issue_certificate($tutorial_id, $recipient_name, $completion_proof, $student_id) {
    global $wpdb;

    $tutorial_id = absint($tutorial_id);

    // 1. Validate completion proof
    $proof = gots_validate_completion_proof($completion_proof, $tutorial_id);
    if (is_wp_error($proof)) {
        error_log('[GOTS Cert] Proof validation failed for tutorial ' . $tutorial_id . ': ' . $proof->get_error_message());
        return $proof;
    }

    // 2. Confirm student_id in proof matches the caller
    if ((string) ($proof['sid'] ?? '') !== (string) $student_id) {
        return new WP_Error('proof_mismatch', 'Completion proof is not valid for this student.', array('status' => 403));
    }

    $ip = gots_get_client_ip();

    // 3. Tutorial exists; published required unless proof was issued in admin preview (signed pv flag + editor session).
    $post = get_post($tutorial_id);
    if (!$post || $post->post_type !== 'gots_tutorial') {
        return new WP_Error('tutorial_unavailable', 'Tutorial not available.', array('status' => 404));
    }
    if ($post->post_status !== 'publish') {
        $preview_issuance = !empty($proof['pv']) && is_user_logged_in() && current_user_can('edit_posts');
        if (!$preview_issuance) {
            return new WP_Error(
                'tutorial_not_published',
                'This tutorial must be published before certificates can be issued. Open the public playback link after publishing.',
                array('status' => 403)
            );
        }
    }

    // 4. Certificate feature is enabled for this tutorial
    $cert_settings = gots_get_tutorial_cert_settings($tutorial_id);
    if (empty($cert_settings['enabled'])) {
        return new WP_Error('cert_disabled', 'Certificates are not enabled for this tutorial.', array('status' => 403));
    }

    // 5. Existing active certificate for this student + tutorial — return without consuming rate limit.
    // Rows with status != 'issued' (e.g. revoked) must NOT be reused here: download validation only
    // accepts 'issued', otherwise the client gets a link that fails with "Certificate not found."
    $table    = $wpdb->prefix . 'gots_certificates';
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT id, verification_token FROM $table
         WHERE tutorial_id = %d AND student_identifier_hash = %s AND status = 'issued'
         ORDER BY issued_at DESC LIMIT 1",
        $tutorial_id,
        $student_id
    ), OBJECT);

    if ($existing) {
        $dl       = gots_generate_download_token($existing->id);
        $rest_url = rest_url('gots/v1/certificates/' . urlencode($dl['token']) . '/download');
        return array(
            'certificateId' => (int) $existing->id,
            'downloadUrl'   => $rest_url,
            'expiresAt'     => $dl['expires_at'],
        );
    }

    // 6. New issuance only: hourly cap (counted only after successful DB insert, so failed attempts do not burn quota)
    if (!gots_certificate_rate_limit_allowed($tutorial_id, $ip)) {
        return new WP_Error('rate_limited', 'Too many certificate requests. Please wait before trying again.', array('status' => 429));
    }

    // 7. Resolve template and render HTML
    $template = gots_resolve_tutorial_template($tutorial_id);

    $issuer_name = !empty($cert_settings['issuer_name'])
        ? $cert_settings['issuer_name']
        : get_bloginfo('name');

    $verification_token = wp_generate_uuid4();

    $values = array(
        'recipient_name'  => $recipient_name,
        'tutorial_title'  => get_the_title($tutorial_id),
        'completion_date' => current_time('Y-m-d'),
        'issuer_name'     => $issuer_name,
        'certificate_id'  => $verification_token,
    );

    $html = gots_render_certificate_html($template, $values);

    // 8. Render PDF
    $pdf_bytes = gots_render_pdf($html, array('paper_size' => 'letter', 'orientation' => 'landscape'));
    if (is_wp_error($pdf_bytes)) {
        error_log('[GOTS Cert] PDF render failed: ' . $pdf_bytes->get_error_message());
        return new WP_Error('pdf_error', 'Could not generate certificate PDF.', array('status' => 500));
    }

    // 9. Save PDF to uploads
    $filename = 'cert-' . sanitize_file_name($verification_token) . '.pdf';
    $upload   = gots_get_certificate_upload_path($filename);
    if (is_wp_error($upload)) {
        return $upload;
    }

    if (file_put_contents($upload['path'], $pdf_bytes) === false) {
        return new WP_Error('write_error', 'Could not save certificate PDF.', array('status' => 500));
    }

    // 10. Persist the certificate record
    $issued_by = is_user_logged_in() ? 'user:' . get_current_user_id() : 'anon';

    $inserted = $wpdb->insert(
        $table,
        array(
            'tutorial_id'              => $tutorial_id,
            'template_id'              => (int) ($template->id ?? 0),
            'recipient_name'           => $recipient_name,
            'student_identifier_hash'  => $student_id,
            'verification_token'       => $verification_token,
            'pdf_path'                 => $upload['path'],
            'issued_by'                => $issued_by,
            'issued_at'                => current_time('mysql'),
            'status'                   => 'issued',
            'download_count'           => 0,
        ),
        array('%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d')
    );

    if (!$inserted) {
        // Duplicate student+tutorial: either a concurrent issue won the race, or a revoked row
        // still occupies the unique key — handle both without deleting the new PDF until we know.
        if (strpos($wpdb->last_error, 'Duplicate entry') !== false) {
            $dup = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $table
                 WHERE tutorial_id = %d AND student_identifier_hash = %s
                 ORDER BY issued_at DESC LIMIT 1",
                $tutorial_id,
                $student_id
            ), OBJECT);
            if ($dup && $dup->status === 'issued') {
                @unlink($upload['path']);
                $dl       = gots_generate_download_token((int) $dup->id);
                $rest_url = rest_url('gots/v1/certificates/' . urlencode($dl['token']) . '/download');
                return array(
                    'certificateId' => (int) $dup->id,
                    'downloadUrl'   => $rest_url,
                    'expiresAt'     => $dl['expires_at'],
                );
            }
            if ($dup && $dup->status !== 'issued') {
                // Update DB first; only delete the old PDF file after confirming the row is saved.
                // If we deleted it first and the update failed, the old PDF would be gone but
                // the row would still show a non-issued status — leaving a broken state.
                $old_pdf_path = (!empty($dup->pdf_path) && is_string($dup->pdf_path)) ? $dup->pdf_path : '';
                $updated = $wpdb->update(
                    $table,
                    array(
                        'template_id'             => (int) ($template->id ?? 0),
                        'recipient_name'          => $recipient_name,
                        'verification_token'      => $verification_token,
                        'pdf_path'                => $upload['path'],
                        'issued_by'               => $issued_by,
                        'issued_at'               => current_time('mysql'),
                        'status'                  => 'issued',
                        'download_count'          => 0,
                    ),
                    array('id' => (int) $dup->id),
                    array('%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d'),
                    array('%d')
                );
                if ($updated === false) {
                    @unlink($upload['path']);
                    error_log('[GOTS Cert] Re-issue after duplicate failed: ' . $wpdb->last_error);
                    return new WP_Error('db_error', 'Could not save certificate record.', array('status' => 500));
                }
                if ($old_pdf_path !== '' && file_exists($old_pdf_path)) {
                    @unlink($old_pdf_path);
                }
                gots_certificate_rate_limit_record_success($tutorial_id, $ip);
                $cert_id  = (int) $dup->id;
                $dl       = gots_generate_download_token($cert_id);
                $rest_url = rest_url('gots/v1/certificates/' . urlencode($dl['token']) . '/download');
                return array(
                    'certificateId' => $cert_id,
                    'downloadUrl'   => $rest_url,
                    'expiresAt'     => $dl['expires_at'],
                );
            }
        }
        @unlink($upload['path']);
        error_log('[GOTS Cert] DB insert failed: ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Could not save certificate record.', array('status' => 500));
    }

    gots_certificate_rate_limit_record_success($tutorial_id, $ip);

    $cert_id = (int) $wpdb->insert_id;

    // 11. Generate signed download token
    $dl       = gots_generate_download_token($cert_id);
    $rest_url = rest_url('gots/v1/certificates/' . urlencode($dl['token']) . '/download');

    return array(
        'certificateId' => $cert_id,
        'downloadUrl'   => $rest_url,
        'expiresAt'     => $dl['expires_at'],
    );
}

// Download streaming

/**
 * Stream a certificate PDF to the browser.
 *
 * Validates the token, increments the download counter, and sends the file.
 * Calls exit() on success.
 *
 * @param string $token  Signed download token.
 * @return WP_Error  Only returned on failure; on success this function exits.
 */
function gots_stream_certificate_pdf($token) {
    global $wpdb;

    $cert = gots_validate_download_token($token);
    if (is_wp_error($cert)) {
        return $cert;
    }

    // Increment download counter
    $wpdb->query($wpdb->prepare(
        "UPDATE {$wpdb->prefix}gots_certificates SET download_count = download_count + 1 WHERE id = %d",
        $cert->id
    ));

    // Build a safe filename for the Content-Disposition header
    $filename = 'certificate-' . sanitize_file_name($cert->verification_token) . '.pdf';

    // Always render with current template/CSS (stored PDF on disk is only a backup).
    $bytes = gots_rerender_certificate_pdf_bytes($cert);
    if (is_wp_error($bytes)) {
        $pdf_path = $cert->pdf_path;
        if (!file_exists($pdf_path)) {
            return $bytes;
        }
        error_log('[GOTS Cert] Rerender failed, using stored file: ' . $bytes->get_error_message());
        $bytes = file_get_contents($pdf_path);
        if ($bytes === false) {
            return new WP_Error('read_error', 'Could not read certificate PDF.', array('status' => 500));
        }
    }

    nocache_headers();
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($bytes));
    header('X-Content-Type-Options: nosniff');

    echo $bytes;
    exit;
}

/**
 * Look up a certificate row by the verification_token (Certificate ID on the PDF).
 *
 * @param string $token
 * @return object|null  { id, tutorial_id, issued_at, status, recipient_name } or null
 */
function gots_lookup_certificate_by_verification_token($token) {
    global $wpdb;

    $token = sanitize_text_field((string) $token);
    if ($token === '') {
        return null;
    }

    $table = $wpdb->prefix . 'gots_certificates';
    $row   = $wpdb->get_row($wpdb->prepare(
        "SELECT id, tutorial_id, issued_at, status, recipient_name FROM $table WHERE verification_token = %s LIMIT 1",
        $token
    ), OBJECT);

    return $row ?: null;
}

// Orphan cleanup

/**
 * Mark all certificates for a deleted tutorial as 'revoked' so they can no
 * longer be downloaded or verified.  Fired on the WordPress delete_post action.
 *
 * @param int $post_id
 * @return void
 */
function gots_cleanup_tutorial_certificates($post_id) {
    if (get_post_type($post_id) !== 'gots_tutorial') {
        return;
    }

    global $wpdb;
    $table = $wpdb->prefix . 'gots_certificates';
    $wpdb->update(
        $table,
        array('status' => 'revoked'),
        array('tutorial_id' => absint($post_id)),
        array('%s'),
        array('%d')
    );
}
add_action('delete_post', 'gots_cleanup_tutorial_certificates');

// Admin query helpers

/**
 * List issued certificates for a tutorial.
 *
 * @param int $tutorial_id
 * @param int $limit
 * @param int $offset
 * @return array
 */
function gots_get_tutorial_certificates($tutorial_id, $limit = 50, $offset = 0) {
    global $wpdb;

    $table = $wpdb->prefix . 'gots_certificates';
    return $wpdb->get_results($wpdb->prepare(
        "SELECT id, tutorial_id, template_id, recipient_name, verification_token,
                issued_by, issued_at, status, download_count
         FROM $table
         WHERE tutorial_id = %d
         ORDER BY issued_at DESC
         LIMIT %d OFFSET %d",
        absint($tutorial_id),
        absint($limit),
        absint($offset)
    ), ARRAY_A) ?: array();
}
