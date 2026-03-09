<?php
/**
 * This page handles analytics event storage and aggregation queries using a custom database table.
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Create/upgrade the analytics table.
 * Called on plugin activation and on admin_init (version check).
 */
function gots_create_analytics_table() {
    global $wpdb;

    $table_name      = $wpdb->prefix . 'gots_analytics';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        tutorial_id BIGINT(20) UNSIGNED NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        slide_id VARCHAR(100) NOT NULL DEFAULT '',
        event_date DATE NOT NULL,
        event_count INT(11) NOT NULL DEFAULT 1,
        PRIMARY KEY  (id),
        UNIQUE KEY uq_event (tutorial_id, event_type, slide_id, event_date),
        KEY idx_tutorial_event_date (tutorial_id, event_type, event_date),
        KEY idx_tutorial_slide (tutorial_id, slide_id, event_type, event_date)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('gots_analytics_db_version', '1.1.0');
}


 //Check if the analytics table needs to be created/upgraded
function gots_maybe_create_analytics_table() {
    $installed_version = get_option('gots_analytics_db_version', '0');
    if (version_compare($installed_version, '1.1.0', '<')) {
        gots_create_analytics_table();
    }
}
add_action('admin_init', 'gots_maybe_create_analytics_table');

//we record analytics events here
function gots_record_analytics_event($tutorial_id, $event_type, $slide_id = null, $date = null) {
    global $wpdb;

    $table_name = $wpdb->prefix . 'gots_analytics';

    $allowed_events = array('tutorial_started', 'tutorial_completed', 'slide_viewed', 'slide_proceeded');
    if (!in_array($event_type, $allowed_events, true)) {
        return false;
    }

    $tutorial_id = absint($tutorial_id);
    if (!$tutorial_id) {
        return false;
    }

    if ($date === null) {
        // Use the WordPress site's configured timezone so that the stored
        // date matches what the admin sees in the dashboard date picker.
        // current_time() is the most reliable way to get the site-local
        // date in all PHP contexts (REST callbacks, cron, etc.).
        $date = current_time('Y-m-d');
    }

    // Use empty string instead of NULL so the UNIQUE index works correctly
    $slide_id = $slide_id ? sanitize_text_field($slide_id) : '';

    // Atomic upsert — the UNIQUE KEY (tutorial_id, event_type, slide_id, event_date)
    // ensures no duplicate rows, even under concurrent requests.
    $result = $wpdb->query($wpdb->prepare(
        "INSERT INTO $table_name (tutorial_id, event_type, slide_id, event_date, event_count)
         VALUES (%d, %s, %s, %s, 1)
         ON DUPLICATE KEY UPDATE event_count = event_count + 1",
        $tutorial_id,
        $event_type,
        $slide_id,
        $date
    ));

    return $result !== false;
}

//get tutorial level analytics
function gots_get_analytics_summary($tutorial_id, $date_from = null, $date_to = null) {
    global $wpdb;

    $table_name  = $wpdb->prefix . 'gots_analytics';
    $tutorial_id = absint($tutorial_id);

    $where = $wpdb->prepare("tutorial_id = %d AND slide_id = ''", $tutorial_id);
    if ($date_from) {
        $where .= $wpdb->prepare(" AND event_date >= %s", $date_from);
    }
    if ($date_to) {
        $where .= $wpdb->prepare(" AND event_date <= %s", $date_to);
    }

    $rows = $wpdb->get_results(
        "SELECT event_type, SUM(event_count) as total FROM $table_name WHERE $where GROUP BY event_type",
        ARRAY_A
    );

    $totals = array();
    foreach ($rows as $row) {
        $totals[$row['event_type']] = (int) $row['total'];
    }

    $starts      = isset($totals['tutorial_started']) ? $totals['tutorial_started'] : 0;
    $completions = isset($totals['tutorial_completed']) ? $totals['tutorial_completed'] : 0;

    $completion_rate  = $starts > 0 ? round($completions / $starts, 4) : 0;
    $abandonment_rate = $starts > 0 ? round(1 - ($completions / $starts), 4) : 0;

    return array(
        'starts'           => $starts,
        'completions'      => $completions,
        'completionRate'   => $completion_rate,
        'abandonmentRate'  => $abandonment_rate,
    );
}

//Get tutorial-level trend data grouped by day.
function gots_get_analytics_trend($tutorial_id, $date_from = null, $date_to = null) {
    global $wpdb;

    $table_name  = $wpdb->prefix . 'gots_analytics';
    $tutorial_id = absint($tutorial_id);

    $where = $wpdb->prepare(
        "tutorial_id = %d AND slide_id = '' AND event_type IN ('tutorial_started', 'tutorial_completed')",
        $tutorial_id
    );
    if ($date_from) {
        $where .= $wpdb->prepare(" AND event_date >= %s", $date_from);
    }
    if ($date_to) {
        $where .= $wpdb->prepare(" AND event_date <= %s", $date_to);
    }

    $rows = $wpdb->get_results(
        "SELECT event_date, event_type, SUM(event_count) as total
         FROM $table_name
         WHERE $where
         GROUP BY event_date, event_type
         ORDER BY event_date ASC",
        ARRAY_A
    );

    // pivot into {date, starts, completions}
    $by_date = array();
    foreach ($rows as $row) {
        $d = $row['event_date'];
        if (!isset($by_date[$d])) {
            $by_date[$d] = array('date' => $d, 'starts' => 0, 'completions' => 0);
        }
        if ($row['event_type'] === 'tutorial_started') {
            $by_date[$d]['starts'] = (int) $row['total'];
        } elseif ($row['event_type'] === 'tutorial_completed') {
            $by_date[$d]['completions'] = (int) $row['total'];
        }
    }

    // fill in missing dates in the range so the chart has continuous data
    if ($date_from && $date_to) {
        $current = new DateTime($date_from);
        $end     = new DateTime($date_to);
        while ($current <= $end) {
            $d = $current->format('Y-m-d');
            if (!isset($by_date[$d])) {
                $by_date[$d] = array('date' => $d, 'starts' => 0, 'completions' => 0);
            }
            $current->modify('+1 day');
        }
        ksort($by_date);
    }

    return array_values($by_date);
}

//get the slide level performance data for a tutorial
function gots_get_slide_performance($tutorial_id, $date_from = null, $date_to = null) {
    global $wpdb;

    $table_name  = $wpdb->prefix . 'gots_analytics';
    $tutorial_id = absint($tutorial_id);

    $where = $wpdb->prepare(
        "tutorial_id = %d AND slide_id != '' AND event_type IN ('slide_viewed', 'slide_proceeded')",
        $tutorial_id
    );
    if ($date_from) {
        $where .= $wpdb->prepare(" AND event_date >= %s", $date_from);
    }
    if ($date_to) {
        $where .= $wpdb->prepare(" AND event_date <= %s", $date_to);
    }

    $rows = $wpdb->get_results(
        "SELECT slide_id, event_type, SUM(event_count) as total
         FROM $table_name
         WHERE $where
         GROUP BY slide_id, event_type",
        ARRAY_A
    );

    // pivot into {slideId => {views, proceeds}}
    $by_slide = array();
    foreach ($rows as $row) {
        $sid = $row['slide_id'];
        if (!isset($by_slide[$sid])) {
            $by_slide[$sid] = array('slideId' => $sid, 'views' => 0, 'proceeds' => 0);
        }
        if ($row['event_type'] === 'slide_viewed') {
            $by_slide[$sid]['views'] = (int) $row['total'];
        } elseif ($row['event_type'] === 'slide_proceeded') {
            $by_slide[$sid]['proceeds'] = (int) $row['total'];
        }
    }

    // compute conversion rate per slide
    foreach ($by_slide as &$slide) {
        $slide['conversionRate'] = $slide['views'] > 0
            ? round($slide['proceeds'] / $slide['views'], 4)
            : 0;
    }
    unset($slide);

    // Now enrich with slide titles/order from the tutorial's slide data
    $slides_json = get_post_meta($tutorial_id, '_gots_slides', true);
    $slide_meta  = array();
    if (!empty($slides_json)) {
        $decoded = json_decode($slides_json, true);
        if (is_array($decoded)) {
            foreach ($decoded as $s) {
                if (isset($s['slideId'])) {
                    $slide_meta[$s['slideId']] = array(
                        'title' => isset($s['title']) ? $s['title'] : 'Untitled',
                        'order' => isset($s['order']) ? (int) $s['order'] : 0,
                    );
                }
            }
        }
    }

    // merge meta into result and sort by order
    $result = array();
    foreach ($by_slide as $sid => $data) {
        if (isset($slide_meta[$sid])) {
            $data['title'] = $slide_meta[$sid]['title'];
            $data['order'] = $slide_meta[$sid]['order'];
        } else {
            $data['title'] = 'Deleted Slide';
            $data['order'] = 9999;
        }
        $result[] = $data;
    }

    // Also add slides that have meta but no analytics yet (zero counts)
    foreach ($slide_meta as $sid => $meta) {
        if (!isset($by_slide[$sid])) {
            $result[] = array(
                'slideId'        => $sid,
                'title'          => $meta['title'],
                'order'          => $meta['order'],
                'views'          => 0,
                'proceeds'       => 0,
                'conversionRate' => 0,
            );
        }
    }

    usort($result, function ($a, $b) {
        return $a['order'] - $b['order'];
    });

    return $result;
}
