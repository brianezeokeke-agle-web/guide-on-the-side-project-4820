<?php
/**
 * admin Page Template for guide on the side
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap gots-admin-wrap">
    <style>
        .gots-admin-wrap {
            margin: 0;
            padding: 0;
            position: absolute;
            top: 32px; /* account for WP admin bar */
            left: 160px; /* account for WP admin menu */
            right: 0;
            bottom: 0;
            background: #fff;
        }
        
        /* Collapsed menu adjustment */
        .folded .gots-admin-wrap {
            left: 36px;
        }
        
        /* mobile responsive */
        @media screen and (max-width: 782px) {
            .gots-admin-wrap {
                top: 46px;
                left: 0;
            }
        }
        
        #gots-root {
            width: 100%;
            height: 100%;
            min-height: calc(100vh - 32px);
        }
        
        /* loading state */
        .gots-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 400px;
            font-family: system-ui, -apple-system, sans-serif;
            color: #666;
        }
        
        .gots-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #7B2D26;
            border-radius: 50%;
            animation: gots-spin 1s linear infinite;
            margin-right: 12px;
        }
        
        @keyframes gots-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    
    <div id="gots-root">
        <div class="gots-loading">
            <div class="gots-loading-spinner"></div>
            <span>Loading Guide on the Side...</span>
        </div>
    </div>
</div>
