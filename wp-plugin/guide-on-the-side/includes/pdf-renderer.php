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
    $autoload = GOTS_PLUGIN_DIR . 'vendor/autoload.php';
    if (!file_exists($autoload)) {
        return false;
    }
    require_once $autoload;
    return true;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

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
    // stub — implemented in Commit 3
    return new WP_Error('not_implemented', 'PDF renderer not yet implemented.');
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
    // stub — implemented in Commit 3
    return new WP_Error('not_implemented', 'PDF renderer not yet implemented.');
}

/**
 * Build the upload path and URL for a certificate PDF file.
 *
 * Creates the certificates sub-directory inside wp-uploads if needed.
 *
 * @param string $filename  Base filename (no directory).
 * @return array{path: string, url: string}|WP_Error
 */
function gots_get_certificate_upload_path($filename) {
    // stub — implemented in Commit 3
    return new WP_Error('not_implemented', 'Upload path helper not yet implemented.');
}
