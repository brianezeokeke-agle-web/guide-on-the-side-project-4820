<?php
/**
 * utility functions for to be used throughout the proj
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * generate a UUID v4
 * Used for creating unique slide IDs
 *
 * @return string UUID v4 string
 */
function gots_generate_uuid() {
    // use wordpress's built-in wp_generate_uuid4() if available (WP 4.7+)
    if (function_exists('wp_generate_uuid4')) {
        return wp_generate_uuid4();
    }
    
    // fallback implementation
    $data = random_bytes(16);
    
    // set version to 0100 (UUID version 4)
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    // set bits 6-7 to 10 (UUID variant)
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * create an empty slide with default values
 *
 * @param int $order The order/position of the slide (1-based)
 * @return array Slide data structure
 */
function gots_create_empty_slide($order) {
    return array(
        'slideId'   => gots_generate_uuid(),
        'title'     => sprintf('Slide %d', $order),
        'order'     => $order,
        'leftPane'  => null,
        'rightPane' => null,
    );
}

/**
 * Merge incoming slides with existing slides
 * 
 * THE inhouse algorithm:
 * 1. match slides by slideId
 * 2. for matched slides, merge fields shallowly (incoming overwrites existing)
 * 3. slideId is immutable
 * 4. if slideId not found in existing, append as new slide
 * 5. sort by order ascending
 * 6. null panes are valid and preserved
 *
 * @param array $existing_slides Array of existing slides
 * @param array $incoming_slides Array of incoming slides to merge
 * @return array Merged slides array
 */
function gots_merge_slides($existing_slides, $incoming_slides) {
    if (!is_array($incoming_slides)) {
        return $existing_slides;
    }
    
    if (!is_array($existing_slides)) {
        $existing_slides = array();
    }
    
    // create a map of existing slides by slideId for quick lookup
    $existing_map = array();
    foreach ($existing_slides as $slide) {
        if (isset($slide['slideId'])) {
            $existing_map[$slide['slideId']] = $slide;
        }
    }
    
    // track which existing slides have been updated
    $updated_ids = array();
    
    // process incoming slides
    foreach ($incoming_slides as $incoming) {
        if (!isset($incoming['slideId'])) {
            continue;
        }
        
        $slide_id = $incoming['slideId'];
        
        if (isset($existing_map[$slide_id])) {
            // merge with existing slide - shallow merge where incoming overwrites
            $merged = $existing_map[$slide_id];
            
            // merge each field if present in incoming
            if (array_key_exists('title', $incoming)) {
                $merged['title'] = $incoming['title'];
            }
            if (array_key_exists('order', $incoming)) {
                $merged['order'] = $incoming['order'];
            }
            if (array_key_exists('leftPane', $incoming)) {
                $merged['leftPane'] = $incoming['leftPane'];
            }
            if (array_key_exists('rightPane', $incoming)) {
                $merged['rightPane'] = $incoming['rightPane'];
            }
            
            // ensure that slideId is preserved (immutable)
            $merged['slideId'] = $slide_id;
            
            $existing_map[$slide_id] = $merged;
            $updated_ids[] = $slide_id;
        } else {
            // new slide - append it
            $new_slide = array(
                'slideId'   => $slide_id,
                'title'     => isset($incoming['title']) ? $incoming['title'] : 'Untitled Slide',
                'order'     => isset($incoming['order']) ? $incoming['order'] : count($existing_map) + 1,
                'leftPane'  => isset($incoming['leftPane']) ? $incoming['leftPane'] : null,
                'rightPane' => isset($incoming['rightPane']) ? $incoming['rightPane'] : null,
            );
            $existing_map[$slide_id] = $new_slide;
        }
    }
    
    // convert map back to array
    $merged_slides = array_values($existing_map);
    
    // sort by order ascending
    usort($merged_slides, function($a, $b) {
        $order_a = isset($a['order']) ? (int) $a['order'] : 0;
        $order_b = isset($b['order']) ? (int) $b['order'] : 0;
        return $order_a - $order_b;
    });
    
    return $merged_slides;
}

/**
 * Map wordpress post status to API status
 *
 * @param string $wp_status wordpress post status
 * @return string API status ('draft' or 'published')
 */
function gots_map_wp_status_to_api($wp_status) {
    if ($wp_status === 'publish') {
        return 'published';
    }
    return 'draft';
}

/**
 * map API status to wordpress post status
 *
 * @param string $api_status API status ('draft' or 'published')
 * @return string|false wordpress post status or false if invalid
 */
function gots_map_api_status_to_wp($api_status) {
    switch ($api_status) {
        case 'published':
            return 'publish';
        case 'draft':
            return 'draft';
        default:
            return false;
    }
}

/**
 * convert a tutorial post to API response format
 *
 * @param WP_Post $post The tutorial post object
 * @return array Tutorial data in API response format
 */
function gots_format_tutorial_response($post) {
    // get meta values
    $description = get_post_meta($post->ID, '_gots_description', true);
    $archived = get_post_meta($post->ID, '_gots_archived', true);
    $slides_json = get_post_meta($post->ID, '_gots_slides', true);
    
    // parse slides from JSON
    $slides = array();
    if (!empty($slides_json)) {
        $decoded = json_decode($slides_json, true);
        if (is_array($decoded)) {
            $slides = $decoded;
        }
    }
    
    // format dates as ISO 8601
    $created_at = get_post_time('c', true, $post);
    $updated_at = get_post_modified_time('c', true, $post);
    
    return array(
        'tutorialId'  => (string) $post->ID,
        'title'       => $post->post_title,
        'description' => $description ?: '',
        'status'      => gots_map_wp_status_to_api($post->post_status),
        'archived'    => (bool) $archived,
        'createdAt'   => $created_at,
        'updatedAt'   => $updated_at,
        'slides'      => $slides,
    );
}

/**
 * sanitize and validate tutorial data for saving
 *
 * @param array $data Raw tutorial data
 * @param bool $is_create Whether this is a create operation
 * @return array|WP_Error Sanitized data or WP_Error on validation failure
 */
function gots_sanitize_tutorial_data($data, $is_create = false) {
    $sanitized = array();
    
    // title validation (required for create)
    if (isset($data['title'])) {
        $title = trim($data['title']);
        if ($is_create && empty($title)) {
            return new WP_Error(
                'invalid_title',
                __('Title is required and cannot be empty or whitespace only.', 'guide-on-the-side'),
                array('status' => 400)
            );
        }
        $sanitized['title'] = sanitize_text_field($title);
    } elseif ($is_create) {
        return new WP_Error(
            'missing_title',
            __('Title is required.', 'guide-on-the-side'),
            array('status' => 400)
        );
    }
    
    // description (optional)
    if (isset($data['description'])) {
        $sanitized['description'] = sanitize_textarea_field($data['description']);
    }
    
    // status validation
    if (isset($data['status'])) {
        $wp_status = gots_map_api_status_to_wp($data['status']);
        if ($wp_status === false) {
            return new WP_Error(
                'invalid_status',
                __('Invalid status. Must be "draft" or "published".', 'guide-on-the-side'),
                array('status' => 400)
            );
        }
        $sanitized['status'] = $wp_status;
    }
    
    // archived flag
    if (isset($data['archived'])) {
        $sanitized['archived'] = (bool) $data['archived'];
    }
    
    // slides - validate structure but preserve data
    if (isset($data['slides']) && is_array($data['slides'])) {
        $sanitized['slides'] = gots_sanitize_slides($data['slides']);
    }
    
    return $sanitized;
}

/**
 * sanitize slides array while preserving structure
 *
 * @param array $slides Raw slides data
 * @return array Sanitized slides
 */
function gots_sanitize_slides($slides) {
    if (!is_array($slides)) {
        return array();
    }
    
    $sanitized = array();
    
    foreach ($slides as $slide) {
        if (!is_array($slide)) {
            continue;
        }
        
        $clean_slide = array();
        
        // slideId is required and must be a valid UUID-like string
        if (isset($slide['slideId'])) {
            $clean_slide['slideId'] = sanitize_text_field($slide['slideId']);
        }
        
        // title
        if (isset($slide['title'])) {
            $clean_slide['title'] = sanitize_text_field($slide['title']);
        }
        
        // the order must be numeric
        if (isset($slide['order'])) {
            $clean_slide['order'] = absint($slide['order']);
        }
        
        // leftPane and rightPane - preserve the structure including null
        if (array_key_exists('leftPane', $slide)) {
            $clean_slide['leftPane'] = gots_sanitize_pane($slide['leftPane']);
        }
        
        if (array_key_exists('rightPane', $slide)) {
            $clean_slide['rightPane'] = gots_sanitize_pane($slide['rightPane']);
        }
        
        $sanitized[] = $clean_slide;
    }
    
    return $sanitized;
}

/**
 * Sanitize a pane while preserving its structure
 * Panes can be null, which is valid
 *
 * @param mixed $pane Raw pane data
 * @return mixed Sanitized pane or null
 */
function gots_sanitize_pane($pane) {
    // null panes are valid
    if ($pane === null) {
        return null;
    }
    
    if (!is_array($pane)) {
        return null;
    }
    
    $clean_pane = array();
    
    // type field
    if (isset($pane['type'])) {
        $allowed_types = array('text', 'embed', 'question', 'textQuestion', 'media');
        $type = sanitize_text_field($pane['type']);
        if (in_array($type, $allowed_types, true)) {
            $clean_pane['type'] = $type;
        }
    }
    
    // data field - preserve structure based on type
    if (isset($pane['data']) && is_array($pane['data'])) {
        // we preserve the data structure as-is since it varies by pane type
        // the frontend is responsible for proper structure
        $clean_pane['data'] = gots_deep_sanitize_array($pane['data']);
    }
    
    return !empty($clean_pane) ? $clean_pane : null;
}

/**
 * deep sanitize an array while preserving its structure
 *
 * @param array $data Array to sanitize
 * @return array Sanitized array
 */
function gots_deep_sanitize_array($data) {
    if (!is_array($data)) {
        if (is_string($data)) {
            // allow HTML content for rich text by using wp_kses_post
            return wp_kses_post($data);
        }
        return $data;
    }
    
    $clean = array();
    foreach ($data as $key => $value) {
        $clean_key = sanitize_key($key);
        
        if (is_array($value)) {
            $clean[$clean_key] = gots_deep_sanitize_array($value);
        } elseif (is_string($value)) {
            // allow HTML content for text panes
            $clean[$clean_key] = wp_kses_post($value);
        } elseif (is_bool($value)) {
            $clean[$clean_key] = $value;
        } elseif (is_numeric($value)) {
            $clean[$clean_key] = $value;
        } elseif ($value === null) {
            $clean[$clean_key] = null;
        }
    }
    
    return $clean;
}
