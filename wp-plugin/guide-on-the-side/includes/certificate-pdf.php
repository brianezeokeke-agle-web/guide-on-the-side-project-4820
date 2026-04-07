<?php
/**
 * Certificate PDF generation using Dompdf
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Build the certificate HTML template.
 * Kept modular so the template can be improved later.
 *
 * @param string $user_name       Sanitized user display name.
 * @param string $course_name     Sanitized course/tutorial name.
 * @param string $completion_date Sanitized completion date string.
 * @return string HTML for the certificate.
 */
function gots_get_certificate_html($user_name, $course_name, $completion_date) {
    $user_name       = esc_html($user_name);
    $course_name     = esc_html($course_name);
    $completion_date = esc_html($completion_date);

    return '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>

body {
    font-family: "DejaVu Serif", "Times New Roman", serif;
    margin: 0;
    padding: 0;
    color: #1a1a1a;
}

.page {
    width: 100%;
    height: 100%;
    padding: 60px;
}

.certificate {
    border: 4px solid #2c3e50;
    padding: 60px 40px;
    text-align: center;
}

.header {
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 30px;
}

.title {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 40px;
    letter-spacing: 1px;
}

.statement {
    font-size: 18px;
    line-height: 1.8;
    margin-bottom: 40px;
}

.name {
    display: block;
    font-size: 26px;
    font-weight: 700;
    margin: 20px 0;
    border-bottom: 1px solid #999;
    padding-bottom: 6px;
}

.course {
    font-style: italic;
    font-weight: 700;
}

.date {
    margin-top: 40px;
    font-size: 16px;
}

.footer {
    margin-top: 60px;
}

.signature-line {
    width: 200px;
    border-top: 1px solid #000;
    margin: 0 auto;
    padding-top: 6px;
    font-size: 14px;
}

</style>
</head>

<body>

<div class="page">
<div class="certificate">

<div class="header">
Academic Certification
</div>

<div class="title">
Certificate of Completion
</div>

<div class="statement">
This certifies that
</div>

<div class="name">
' . $user_name . '
</div>

<div class="statement">
has successfully completed the course
</div>

<div class="statement">
<span class="course">' . $course_name . '</span>
</div>

<div class="date">
Issued on ' . $completion_date . '
</div>

<div class="footer">
<div class="signature-line">
Authorized Signature
</div>
</div>

</div>
</div>

</body>
</html>';
}

/**
 * Generate a PDF certificate using Dompdf.
 *
 * @param string $user_name       User display name (will be sanitized).
 * @param string $course_name     Course/tutorial name (will be sanitized).
 * @param string $completion_date Completion date string (will be sanitized).
 * @return string|WP_Error PDF binary content on success, WP_Error on failure.
 */
function gots_generate_certificate_pdf($user_name, $course_name, $completion_date) {
    if (!class_exists('Dompdf\Dompdf')) {
        return new WP_Error(
            'gots_dompdf_unavailable',
            __('PDF generation is not available.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }

    $user_name       = sanitize_text_field($user_name);
    $course_name     = sanitize_text_field($course_name);
    $completion_date = sanitize_text_field($completion_date);

    if (empty($user_name) || empty($course_name) || empty($completion_date)) {
        return new WP_Error(
            'gots_certificate_invalid_params',
            __('Invalid certificate parameters.', 'guide-on-the-side'),
            array('status' => 400)
        );
    }

    try {
        $dompdf = new \Dompdf\Dompdf();
        $html   = gots_get_certificate_html($user_name, $course_name, $completion_date);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        return $dompdf->output();
    } catch (Exception $e) {
        return new WP_Error(
            'gots_certificate_generation_failed',
            __('Could not generate certificate.', 'guide-on-the-side'),
            array('status' => 500)
        );
    }
}
