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
        'slideId'             => gots_generate_uuid(),
        'title'               => sprintf('Slide %d', $order),
        'order'               => $order,
        'leftPane'            => null,
        'rightPane'           => null,
        'isBranchSlide'       => false,
        'branchParentSlideId' => null,
        'branchConfig'        => null,
    );
}

// Returns true if a pane is null, has no type, or is missing type-specific content.
function gots_is_pane_empty($pane) {
    if (!is_array($pane) || empty($pane['type'])) return true;
    $data = isset($pane['data']) && is_array($pane['data']) ? $pane['data'] : array();
    switch ($pane['type']) {
        case 'text':
            $content = isset($data['content']) ? $data['content'] : '';
            return trim(strip_tags($content)) === '';
        case 'question':
        case 'textQuestion':
            $title = isset($data['questionTitle']) ? trim($data['questionTitle']) : '';
            return $title === '';
        case 'embed':
            $url = isset($data['url']) ? trim($data['url']) : '';
            return $url === '';
        case 'media':
            return empty($data['url']);
        default:
            return true;
    }
}

// Returns true when at least one slide has an empty left or right pane.
// Branch slides are included in this check — they still need content.
function gots_has_empty_slides($slides) {
    if (empty($slides)) return true;
    foreach ($slides as $slide) {
        $left  = isset($slide['leftPane'])  ? $slide['leftPane']  : null;
        $right = isset($slide['rightPane']) ? $slide['rightPane'] : null;
        if (gots_is_pane_empty($left) || gots_is_pane_empty($right)) {
            return true;
        }
    }
    return false;
}

/**
 * Validate all branch configurations in a slides array.
 * Returns an array of error strings; empty array means all configs are valid.
 *
 * @param array $slides
 * @return array  Error messages (empty if clean)
 */
function gots_validate_branch_configs($slides) {
    if (!is_array($slides)) return array();

    // Build look-up maps
    $slides_by_id   = array();
    $children_by_id = array(); // parentId- array of branch children
    foreach ($slides as $slide) {
        if (!isset($slide['slideId'])) continue;
        $slides_by_id[$slide['slideId']] = $slide;
        if (!empty($slide['isBranchSlide']) && !empty($slide['branchParentSlideId'])) {
            $pid = $slide['branchParentSlideId'];
            if (!isset($children_by_id[$pid])) $children_by_id[$pid] = array();
            $children_by_id[$pid][] = $slide;
        }
    }

    $errors = array();

    foreach ($slides as $slide) {
        if (empty($slide['isBranchSlide'])) continue;

        $sid = isset($slide['slideId']) ? $slide['slideId'] : '(unknown)';

        // a parent must exist for a branch question
        if (empty($slide['branchParentSlideId'])) {
            $errors[] = sprintf('Slide "%s": branch slide must have a parent slide.', $sid);
            continue;
        }
        $pid    = $slide['branchParentSlideId'];
        $parent = isset($slides_by_id[$pid]) ? $slides_by_id[$pid] : null;
        if (!$parent) {
            $errors[] = sprintf('Slide "%s": parent slide "%s" does not exist.', $sid, $pid);
            continue;
        }

        $cfg = isset($slide['branchConfig']) && is_array($slide['branchConfig'])
             ? $slide['branchConfig'] : null;

        if (!$cfg) {
            $errors[] = sprintf('Slide "%s": branch condition is required for conditional slides.', $sid);
            continue;
        }

        // sourceSlideId must equal the branchParentSlideId
        $source_id = isset($cfg['sourceSlideId']) ? $cfg['sourceSlideId'] : '';
        if ($source_id !== $pid) {
            $errors[] = sprintf('Slide "%s": sourceSlideId must equal branchParentSlideId (v1 constraint).', $sid);
            continue;
        }

        // source slide must be a question slide (we cant collect input via the rich text editor)
        $source = isset($slides_by_id[$source_id]) ? $slides_by_id[$source_id] : null;
        if (!$source) {
            $errors[] = sprintf('Slide "%s": source slide does not exist.', $sid);
            continue;
        }
        $source_pane = isset($source['leftPane']) && is_array($source['leftPane']) ? $source['leftPane'] : null;
        $source_type = isset($source_pane['type']) ? $source_pane['type'] : '';
        if (!in_array($source_type, array('question', 'textQuestion'), true)) {
            $errors[] = sprintf('Slide "%s": source slide must be a question slide (MCQ or text question).', $sid);
            continue;
        }

        $operator  = isset($cfg['operator'])   ? $cfg['operator']   : '';
        $matchType = isset($cfg['matchType'])  ? $cfg['matchType']  : '';
        $optionId  = isset($cfg['optionId'])   ? $cfg['optionId']   : null;
        $correct   = isset($cfg['correctness'])? $cfg['correctness']: null;

        if ($source_type === 'textQuestion') {
            if ($operator !== 'isNot' || $matchType !== 'correctness' || $correct !== 'correct') {
                $errors[] = sprintf('Slide "%s": text question sources only support "is not correct" branching.', $sid);
            }
            if ($optionId !== null) {
                $errors[] = sprintf('Slide "%s": correctness-based branches must not have an optionId set.', $sid);
            }
        } elseif ($source_type === 'question') {
            if ($operator === 'is') {
                if ($matchType !== 'option' || empty($optionId)) {
                    $errors[] = sprintf('Slide "%s": MCQ "is" operator requires a specific wrong option.', $sid);
                } else {
                    // verify that optionId exists and is not the correct option
                    $pane_data   = isset($source_pane['data']) && is_array($source_pane['data']) ? $source_pane['data'] : array();
                    $options     = isset($pane_data['options']) && is_array($pane_data['options']) ? $pane_data['options'] : array();
                    $correct_id  = isset($pane_data['correctOptionId']) ? $pane_data['correctOptionId'] : null;
                    $option_ids  = array_column($options, 'id');
                    if (!in_array($optionId, $option_ids, true)) {
                        $errors[] = sprintf('Slide "%s": option "%s" no longer exists on the source slide.', $sid, $optionId);
                    } elseif ($optionId === $correct_id) {
                        $errors[] = sprintf('Slide "%s": cannot branch on the correct option.', $sid);
                    }
                }
            } elseif ($operator === 'isNot') {
                if ($matchType !== 'correctness' || $correct !== 'correct') {
                    $errors[] = sprintf('Slide "%s": MCQ "is not" operator must use correctness="correct".', $sid);
                }
                if ($optionId !== null) {
                    $errors[] = sprintf('Slide "%s": correctness-based branches must not have an optionId set.', $sid);
                }
            } else {
                $errors[] = sprintf('Slide "%s": invalid branch operator "%s".', $sid, $operator);
            }
        }

        // cycle detection: walk the ancestry chain and error if we revisit a slide
        $visited  = array();
        $ancestor = $slide;
        $has_cycle = false;
        while ($ancestor && !empty($ancestor['isBranchSlide']) && !empty($ancestor['branchParentSlideId'])) {
            $ancestor_id = $ancestor['slideId'];
            if (isset($visited[$ancestor_id])) {
                $has_cycle = true;
                break;
            }
            $visited[$ancestor_id] = true;
            $ancestor = isset($slides_by_id[$ancestor['branchParentSlideId']]) ? $slides_by_id[$ancestor['branchParentSlideId']] : null;
        }
        if ($has_cycle) {
            $errors[] = sprintf('Slide "%s": cycle detected in branch ancestry chain. A slide cannot be its own ancestor.', $sid);
            continue;
        }

        // duplicate-condition check among siblings, so we dont break the playback
        $siblings = isset($children_by_id[$pid]) ? $children_by_id[$pid] : array();
        foreach ($siblings as $sib) {
            if ($sib['slideId'] === $sid) continue;
            $sib_cfg = isset($sib['branchConfig']) && is_array($sib['branchConfig']) ? $sib['branchConfig'] : null;
            if (!$sib_cfg) continue;
            if (
                (isset($sib_cfg['operator'])    ? $sib_cfg['operator']    : '') === $operator  &&
                (isset($sib_cfg['matchType'])   ? $sib_cfg['matchType']   : '') === $matchType &&
                (isset($sib_cfg['optionId'])    ? $sib_cfg['optionId']    : null) === $optionId &&
                (isset($sib_cfg['correctness']) ? $sib_cfg['correctness'] : null) === $correct
            ) {
                $errors[] = sprintf('Slide "%s": duplicate branch condition exists for parent "%s".', $sid, $pid);
                break;
            }
        }
    }

    return $errors;
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
            // branch fields
            if (array_key_exists('isBranchSlide', $incoming)) {
                $merged['isBranchSlide'] = (bool) $incoming['isBranchSlide'];
            }
            if (array_key_exists('branchParentSlideId', $incoming)) {
                $merged['branchParentSlideId'] = $incoming['branchParentSlideId'];
            }
            if (array_key_exists('branchConfig', $incoming)) {
                $merged['branchConfig'] = $incoming['branchConfig'];
            }
            // themeOverride: absent = preserve existing; explicit null = clear override
            if (array_key_exists('themeOverride', $incoming)) {
                $merged['themeOverride'] = $incoming['themeOverride'];
            }

            // ensure that slideId is preserved (immutable)
            $merged['slideId'] = $slide_id;

            $existing_map[$slide_id] = $merged;
            $updated_ids[] = $slide_id;
        } else {
            // new slide - append it
            $new_slide = array(
                'slideId'             => $slide_id,
                'title'               => isset($incoming['title']) ? $incoming['title'] : 'Untitled Slide',
                'order'               => isset($incoming['order']) ? $incoming['order'] : count($existing_map) + 1,
                'leftPane'            => isset($incoming['leftPane']) ? $incoming['leftPane'] : null,
                'rightPane'           => isset($incoming['rightPane']) ? $incoming['rightPane'] : null,
                'isBranchSlide'       => isset($incoming['isBranchSlide']) ? (bool) $incoming['isBranchSlide'] : false,
                'branchParentSlideId' => isset($incoming['branchParentSlideId']) ? $incoming['branchParentSlideId'] : null,
                'branchConfig'        => isset($incoming['branchConfig']) ? $incoming['branchConfig'] : null,
                'themeOverride'       => isset($incoming['themeOverride']) ? $incoming['themeOverride'] : null,
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
    
    // Format dates as ISO 8601 using LOCAL time (second param = false).
    // WordPress zeroes out post_date_gmt / post_modified_gmt for draft
    // posts, so using GMT (true) returns "0000-00-00" or false.
    // Local time (false) uses post_date / post_modified which WP always
    // populates regardless of post status.
    $created_at = get_post_time('c', false, $post);
    $updated_at = get_post_modified_time('c', false, $post);

    // fallback here: if either is still falsy, just use the other (or current time)
    if (empty($created_at) || strpos($created_at, '0000') === 0) {
        $created_at = $updated_at ?: current_time('c');
    }
    if (empty($updated_at) || strpos($updated_at, '0000') === 0) {
        $updated_at = $created_at;
    }
    
    // Read theme_id; return null if not set (existing tutorials default to no theme)
    $raw_theme_id = (int) get_post_meta($post->ID, '_gots_theme_id', true);

    // Resolve the effective theme config so the student player can apply tokens
    // without a second round-trip. gots_resolve_tutorial_theme() never returns
    // null — it falls back to the built-in default if no theme is assigned.
    $resolved_theme = gots_resolve_tutorial_theme($post->ID);
    $theme_config   = isset($resolved_theme->config_json) ? $resolved_theme->config_json : null;

    return array(
        'tutorialId'   => (string) $post->ID,
        'title'        => $post->post_title,
        'description'  => $description ?: '',
        'status'       => gots_map_wp_status_to_api($post->post_status),
        'archived'     => (bool) $archived,
        'createdAt'    => $created_at,
        'updatedAt'    => $updated_at,
        'slides'       => $slides,
        'theme_id'     => $raw_theme_id > 0 ? $raw_theme_id : null,
        'theme_config' => $theme_config,
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
    
    // deleteSlideIds - array of slide IDs to remove
    if (isset($data['deleteSlideIds']) && is_array($data['deleteSlideIds'])) {
        $sanitized['deleteSlideIds'] = array_map('sanitize_text_field', $data['deleteSlideIds']);
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

        // branch fields
        if (array_key_exists('isBranchSlide', $slide)) {
            $clean_slide['isBranchSlide'] = (bool) $slide['isBranchSlide'];
        }
        if (array_key_exists('branchParentSlideId', $slide)) {
            $clean_slide['branchParentSlideId'] = $slide['branchParentSlideId'] !== null
                ? sanitize_text_field($slide['branchParentSlideId'])
                : null;
        }
        if (array_key_exists('branchConfig', $slide)) {
            $clean_slide['branchConfig'] = gots_sanitize_branch_config($slide['branchConfig']);
        }

        // themeOverride: null clears the override; object is validated against the theme token schema
        if (array_key_exists('themeOverride', $slide)) {
            $sanitized_override = gots_sanitize_slide_theme_override($slide['themeOverride']);
            if (is_wp_error($sanitized_override)) {
                return $sanitized_override;
            }
            $clean_slide['themeOverride'] = $sanitized_override;
        }

        $sanitized[] = $clean_slide;
    }
    
    return $sanitized;
}

/**
 * Sanitize a branchConfig object.
 * Returns null if the input is null or invalid.
 *
 * @param mixed $cfg Raw branch config
 * @return array|null
 */
function gots_sanitize_branch_config($cfg) {
    if ($cfg === null) return null;
    if (!is_array($cfg)) return null;

    $allowed_operators  = array('is', 'isNot');
    $allowed_matchtypes = array('option', 'correctness');
    $allowed_correct    = array('correct', 'incorrect');

    $clean = array();

    if (isset($cfg['sourceSlideId'])) {
        $clean['sourceSlideId'] = sanitize_text_field($cfg['sourceSlideId']);
    }
    if (isset($cfg['operator']) && in_array($cfg['operator'], $allowed_operators, true)) {
        $clean['operator'] = $cfg['operator'];
    }
    if (isset($cfg['matchType']) && in_array($cfg['matchType'], $allowed_matchtypes, true)) {
        $clean['matchType'] = $cfg['matchType'];
    }
    // optionId: single character like "a", "b" – allow null
    if (array_key_exists('optionId', $cfg)) {
        $clean['optionId'] = $cfg['optionId'] !== null
            ? sanitize_text_field($cfg['optionId'])
            : null;
    }
    // correctness: "correct" | "incorrect" | null
    if (array_key_exists('correctness', $cfg)) {
        $clean['correctness'] = ($cfg['correctness'] !== null && in_array($cfg['correctness'], $allowed_correct, true))
            ? $cfg['correctness']
            : null;
    }

    return !empty($clean) ? $clean : null;
}

/**
 * Sanitize a slide-level themeOverride object.
 *
 * Shape when active: { enabled: true, tokens: { ...partialTokens } }
 * Returns null if input is null, disabled, or tokens are empty/invalid.
 * Returns WP_Error propagated up if tokens contain invalid keys/values.
 *
 * @param mixed $override  Raw themeOverride value from incoming slide.
 * @return array|null|WP_Error
 */
function gots_sanitize_slide_theme_override($override) {
    // Explicit null — caller wants to clear the override
    if ($override === null) {
        return null;
    }

    if (!is_array($override)) {
        return null;
    }

    $enabled = !empty($override['enabled']);

    if (!$enabled) {
        // Disabled override is stored as null to keep the payload minimal
        return null;
    }

    $raw_tokens = isset($override['tokens']) && is_array($override['tokens'])
        ? $override['tokens']
        : array();

    // Empty tokens with enabled=true behaves like no override
    if (empty($raw_tokens)) {
        return null;
    }

    // Validate tokens against the theme token allowlist (prevents arbitrary CSS injection)
    $validated_tokens = gots_validate_theme_config($raw_tokens);
    if (is_wp_error($validated_tokens)) {
        // Propagate the validation error up so the REST handler returns a 400
        return $validated_tokens;
    }

    return array(
        'enabled' => true,
        'tokens'  => $validated_tokens,
    );
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
 * Strip browser-injected junk HTML (Google Translate spans, etc.) from content
 * These attributes and elements break JSON storage and serve no purpose in saved content
 *
 * @param string $html Raw HTML string
 * @return string Cleaned HTML
 */
function gots_strip_junk_html($html) {
    if (!is_string($html)) {
        return $html;
    }
    
    // remove Google Translate injected spans entirely (they have data-wiz-* attributes)
    $html = preg_replace('/<span[^>]*data-wiz-[^>]*>.*?<\/span>/is', '', $html);
    // also remove spans with notranslate class injected by browser
    $html = preg_replace('/<span[^>]*class=["\'][^"\'>]*notranslate[^"\'>]*["\'][^>]*>.*?<\/span>/is', '', $html);
    
    return $html;
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
            // Strip browser-injected junk before allowing HTML content
            $data = gots_strip_junk_html($data);
            // allow HTML content for rich text by using wp_kses_post
            return wp_kses_post($data);
        }
        return $data;
    }
    
    $clean = array();
    foreach ($data as $key => $value) {
        // Preserve the original key - don't use sanitize_key as it lowercases
        // Just ensure it's a valid string key
        $clean_key = is_string($key) ? $key : (string) $key;
        
        if (is_array($value)) {
            $clean[$clean_key] = gots_deep_sanitize_array($value);
        } elseif (is_string($value)) {
            // Strip browser-injected junk then allow HTML content for text panes
            $value = gots_strip_junk_html($value);
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
