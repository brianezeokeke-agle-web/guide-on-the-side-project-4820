/**
 * WordPress Media Library Integration
 * 
 * This module provides functions to interact with the WordPress media library
 * for uploading and selecting media files.
 */

/**
 * Open the WordPress media library picker
 * @param {Object} options - Configuration options
 * @param {string} options.title - Modal title
 * @param {string} options.buttonText - Select button text
 * @param {boolean} options.multiple - Allow multiple selections
 * @param {string} options.type - Media type filter ('image', 'video', or empty for all)
 * @returns {Promise<Object|Array|null>} Selected media object(s) or null if cancelled
 */
export function openMediaLibrary(options = {}) {
  return new Promise((resolve) => {
    // Check if wp.media is available
    if (typeof wp === 'undefined' || typeof wp.media === 'undefined') {
      console.error('WordPress media library is not available');
      resolve(null);
      return;
    }

    const {
      title = 'Select Media',
      buttonText = 'Select',
      multiple = false,
      type = '', // 'image', 'video', or '' for all
    } = options;

    // Create the media frame
    const frame = wp.media({
      title: title,
      button: {
        text: buttonText,
      },
      library: {
        type: type, // Filter by type if specified
      },
      multiple: multiple,
    });

    // When media is selected
    frame.on('select', () => {
      const selection = frame.state().get('selection');
      
      if (multiple) {
        const attachments = selection.map((attachment) => {
          return formatAttachment(attachment.toJSON());
        });
        resolve(attachments);
      } else {
        const attachment = selection.first();
        if (attachment) {
          resolve(formatAttachment(attachment.toJSON()));
        } else {
          resolve(null);
        }
      }
    });

    // When modal is closed without selection
    frame.on('close', () => {
      const selection = frame.state().get('selection');
      if (!selection || selection.length === 0) {
        resolve(null);
      }
    });

    // Open the modal
    frame.open();
  });
}

/**
 * Format a WordPress attachment object to our media pane data structure
 * @param {Object} attachment - WordPress attachment object
 * @returns {Object} Formatted media data
 */
function formatAttachment(attachment) {
  // Determine media type
  let mediaType = null;
  if (attachment.type === 'image') {
    mediaType = 'image';
  } else if (attachment.type === 'video') {
    mediaType = 'video';
  }

  // Get the appropriate URL (prefer full size for images)
  let url = attachment.url;
  if (attachment.sizes && attachment.sizes.full) {
    url = attachment.sizes.full.url;
  }

  return {
    mediaType: mediaType,
    url: url,
    attachmentId: attachment.id,
    altText: attachment.alt || attachment.title || '',
    filename: attachment.filename || '',
    originalName: attachment.title || attachment.filename || '',
  };
}

/**
 * Open media library for image selection
 * @returns {Promise<Object|null>} Selected image data or null
 */
export function selectImage() {
  return openMediaLibrary({
    title: 'Select Image',
    buttonText: 'Use this image',
    type: 'image',
  });
}

/**
 * Open media library for video selection
 * @returns {Promise<Object|null>} Selected video data or null
 */
export function selectVideo() {
  return openMediaLibrary({
    title: 'Select Video',
    buttonText: 'Use this video',
    type: 'video',
  });
}

/**
 * Open media library for image or video selection
 * @returns {Promise<Object|null>} Selected media data or null
 */
export function selectMedia() {
  return openMediaLibrary({
    title: 'Select Image or Video',
    buttonText: 'Select',
    type: '', // Allow both images and videos
  });
}

/**
 * Check if WordPress media library is available
 * @returns {boolean} True if wp.media is available
 */
export function isMediaLibraryAvailable() {
  return typeof wp !== 'undefined' && typeof wp.media !== 'undefined';
}

export default {
  openMediaLibrary,
  selectImage,
  selectVideo,
  selectMedia,
  isMediaLibraryAvailable,
};
