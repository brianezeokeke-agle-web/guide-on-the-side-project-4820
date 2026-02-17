<?php
/**
 * custom POST type registration for guide on the side
 *
 * @package GuideOnTheSide
 */

// prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * register the gots_tutorial custom post type
 */
function gots_register_post_types() {
    $labels = array(
        'name'                  => _x('Tutorials', 'Post type general name', 'guide-on-the-side'),
        'singular_name'         => _x('Tutorial', 'Post type singular name', 'guide-on-the-side'),
        'menu_name'             => _x('GOTS Tutorials', 'Admin Menu text', 'guide-on-the-side'),
        'name_admin_bar'        => _x('Tutorial', 'Add New on Toolbar', 'guide-on-the-side'),
        'add_new'               => __('Add New', 'guide-on-the-side'),
        'add_new_item'          => __('Add New Tutorial', 'guide-on-the-side'),
        'new_item'              => __('New Tutorial', 'guide-on-the-side'),
        'edit_item'             => __('Edit Tutorial', 'guide-on-the-side'),
        'view_item'             => __('View Tutorial', 'guide-on-the-side'),
        'all_items'             => __('All Tutorials', 'guide-on-the-side'),
        'search_items'          => __('Search Tutorials', 'guide-on-the-side'),
        'parent_item_colon'     => __('Parent Tutorials:', 'guide-on-the-side'),
        'not_found'             => __('No tutorials found.', 'guide-on-the-side'),
        'not_found_in_trash'    => __('No tutorials found in Trash.', 'guide-on-the-side'),
        'featured_image'        => _x('Tutorial Cover Image', 'Overrides the "Featured Image" phrase', 'guide-on-the-side'),
        'set_featured_image'    => _x('Set cover image', 'Overrides the "Set featured image" phrase', 'guide-on-the-side'),
        'remove_featured_image' => _x('Remove cover image', 'Overrides the "Remove featured image" phrase', 'guide-on-the-side'),
        'use_featured_image'    => _x('Use as cover image', 'Overrides the "Use as featured image" phrase', 'guide-on-the-side'),
        'archives'              => _x('Tutorial archives', 'The post type archive label', 'guide-on-the-side'),
        'insert_into_item'      => _x('Insert into tutorial', 'Overrides the "Insert into post" phrase', 'guide-on-the-side'),
        'uploaded_to_this_item' => _x('Uploaded to this tutorial', 'Overrides the "Uploaded to this post" phrase', 'guide-on-the-side'),
        'filter_items_list'     => _x('Filter tutorials list', 'Screen reader text', 'guide-on-the-side'),
        'items_list_navigation' => _x('Tutorials list navigation', 'Screen reader text', 'guide-on-the-side'),
        'items_list'            => _x('Tutorials list', 'Screen reader text', 'guide-on-the-side'),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => false,  // tgis is not publicly queryable on frontend
        'publicly_queryable' => false,
        'show_ui'            => false,  // we use our own React UI
        'show_in_menu'       => false,  // we add our own menu
        'query_var'          => false,
        'rewrite'            => false,
        'capability_type'    => 'post',
        'has_archive'        => false,
        'hierarchical'       => false,
        'menu_position'      => null,
        'supports'           => array('title', 'custom-fields'),
        'show_in_rest'       => false,  // we use our own REST routes
    );

    register_post_type('gots_tutorial', $args);
    
    // register meta keys for REST API access
    gots_register_post_meta();
}

/**
 * register post meta for the tutorial CPT
 */
function gots_register_post_meta() {
    // description meta
    register_post_meta('gots_tutorial', '_gots_description', array(
        'type'              => 'string',
        'description'       => 'Tutorial description',
        'single'            => true,
        'sanitize_callback' => 'sanitize_textarea_field',
        'auth_callback'     => function() {
            return current_user_can('edit_posts');
        },
        'show_in_rest'      => false,
    ));
    
    // archived flag meta
    register_post_meta('gots_tutorial', '_gots_archived', array(
        'type'              => 'boolean',
        'description'       => 'Whether the tutorial is archived',
        'single'            => true,
        'default'           => false,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'auth_callback'     => function() {
            return current_user_can('edit_posts');
        },
        'show_in_rest'      => false,
    ));
    
    // slides JSON meta
    register_post_meta('gots_tutorial', '_gots_slides', array(
        'type'              => 'string',
        'description'       => 'JSON encoded slides array',
        'single'            => true,
        'sanitize_callback' => null,  // we handle sanitization in our routes
        'auth_callback'     => function() {
            return current_user_can('edit_posts');
        },
        'show_in_rest'      => false,
    ));
}
