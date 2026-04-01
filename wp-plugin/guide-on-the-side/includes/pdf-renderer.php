<?php
/**
 * PDF rendering service — thin wrapper around dompdf.
 *
 * Design intent:
 *  - All dompdf coupling lives here so the renderer can be swapped in future
 *    (e.g. mPDF, Gotenberg) without touching business logic.
 *  - Input:  sanitized HTML string + option array.
 *  - Output: raw PDF bytes (string) or WP_Error.
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// ─── Autoload ─────────────────────────────────────────────────────────────────

/**
 * Load the dompdf autoloader if not already loaded.
 * Called lazily before any render attempt.
 *
 * @return bool  True if autoloader loaded successfully.
 */
function gots_pdf_load_autoloader() {
    static $loaded = null;

    if ($loaded !== null) {
        return $loaded;
    }

    $autoload = GOTS_PLUGIN_DIR . 'vendor/autoload.php';
    if (!file_exists($autoload)) {
        error_log('[GOTS PDF] vendor/autoload.php not found. Run composer install in the plugin directory.');
        $loaded = false;
        return false;
    }

    require_once $autoload;
    $loaded = true;
    return true;
}

// ─── Upload path helper ───────────────────────────────────────────────────────

/**
 * Build the upload path and URL for a certificate PDF file.
 *
 * Creates the certificates sub-directory inside wp-uploads if needed.
 *
 * @param string $filename  Base filename (no directory, e.g. "cert-abc123.pdf").
 * @return array{path: string, url: string}|WP_Error
 */
function gots_get_certificate_upload_path($filename) {
    $upload_dir = wp_upload_dir();

    if ($upload_dir['error']) {
        return new WP_Error(
            'upload_dir_error',
            'Could not determine WordPress upload directory: ' . $upload_dir['error']
        );
    }

    $cert_dir     = trailingslashit($upload_dir['basedir']) . 'gots-certificates';
    $cert_url_dir = trailingslashit($upload_dir['baseurl']) . 'gots-certificates';

    // Create directory if it doesn't exist
    if (!file_exists($cert_dir)) {
        $created = wp_mkdir_p($cert_dir);
        if (!$created) {
            return new WP_Error(
                'mkdir_error',
                'Could not create certificate upload directory: ' . $cert_dir
            );
        }

        // Protect the directory from direct web access
        $htaccess = $cert_dir . '/.htaccess';
        if (!file_exists($htaccess)) {
            file_put_contents($htaccess, "Options -Indexes\nDeny from all\n");
        }
    }

    $filename = sanitize_file_name(basename($filename));

    return array(
        'path' => trailingslashit($cert_dir) . $filename,
        'url'  => trailingslashit($cert_url_dir) . $filename,
    );
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Build a configured Dompdf instance.
 *
 * @param array $options  Render options (paper_size, orientation, dpi).
 * @return \Dompdf\Dompdf|WP_Error
 */
function gots_pdf_create_dompdf($options = array()) {
    if (!gots_pdf_load_autoloader()) {
        return new WP_Error(
            'dompdf_missing',
            'dompdf is not installed. Run composer install in the plugin directory.'
        );
    }

    if (!class_exists('\\Dompdf\\Dompdf')) {
        return new WP_Error(
            'dompdf_missing',
            'Dompdf class not found after autoload. Ensure dompdf/dompdf is installed via Composer.'
        );
    }

    $defaults = array(
        'paper_size'  => 'letter',
        'orientation' => 'landscape',
        'dpi'         => 96,
    );
    $opts = array_merge($defaults, $options);

    $dompdf_options = new \Dompdf\Options();
    $dompdf_options->set('isRemoteEnabled', false); // security: no remote resource fetching
    $dompdf_options->set('isHtml5ParserEnabled', true);
    $dompdf_options->set('defaultDpi', (int) $opts['dpi']);
    $dompdf_options->set('tempDir', sys_get_temp_dir());

    // Allow local file access for images stored in uploads
    $upload_dir = wp_upload_dir();
    if (!empty($upload_dir['basedir'])) {
        $dompdf_options->set('isRemoteEnabled', false);
        $dompdf_options->set('chroot', $upload_dir['basedir']);
    }

    $dompdf = new \Dompdf\Dompdf($dompdf_options);
    $dompdf->setPaper($opts['paper_size'], $opts['orientation']);

    return $dompdf;
}

/**
 * Render HTML to a PDF and return the raw bytes.
 *
 * @param string $html     Sanitized HTML content.
 * @param array  $options  Optional overrides:
 *                          - paper_size   string  e.g. 'A4', 'letter'   (default 'letter')
 *                          - orientation  string  'portrait'|'landscape' (default 'landscape')
 *                          - dpi          int     Render DPI              (default 96)
 * @return string|WP_Error  Raw PDF bytes on success, WP_Error on failure.
 */
function gots_render_pdf($html, $options = array()) {
    $dompdf = gots_pdf_create_dompdf($options);

    if (is_wp_error($dompdf)) {
        return $dompdf;
    }

    try {
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->render();
        return $dompdf->output();
    } catch (\Exception $e) {
        error_log('[GOTS PDF] Render error: ' . $e->getMessage());
        return new WP_Error('pdf_render_error', 'Failed to render PDF: ' . $e->getMessage());
    }
}

/**
 * Render HTML to a PDF and save it to a file path.
 *
 * @param string $html      Sanitized HTML content.
 * @param string $file_path Absolute path where the PDF should be written.
 * @param array  $options   Same options as gots_render_pdf().
 * @return true|WP_Error  True on success, WP_Error on failure.
 */
function gots_render_pdf_to_file($html, $file_path, $options = array()) {
    $bytes = gots_render_pdf($html, $options);

    if (is_wp_error($bytes)) {
        return $bytes;
    }

    // Ensure parent directory exists
    $dir = dirname($file_path);
    if (!file_exists($dir) && !wp_mkdir_p($dir)) {
        return new WP_Error('mkdir_error', 'Could not create directory for certificate PDF: ' . $dir);
    }

    $written = file_put_contents($file_path, $bytes);
    if ($written === false) {
        return new WP_Error('write_error', 'Could not write certificate PDF to: ' . $file_path);
    }

    return true;
}
