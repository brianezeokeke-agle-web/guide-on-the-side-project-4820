/**
 * Unit Test: Media Library Service (WordPress Environment)
 */

import {
  openMediaLibrary,
  selectImage,
  selectVideo,
  selectMedia,
  isMediaLibraryAvailable,
} from './mediaLibrary';

describe('Media Library Service (WordPress)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Delete global wp before each test to ensure a clean state
    delete global.wp;
    // Suppress console.error output during tests that trigger it
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- isMediaLibraryAvailable ---

  // Verify availability check returns false when wp global is missing
  test('isMediaLibraryAvailable should return false if wp is not defined', () => {
    expect(isMediaLibraryAvailable()).toBe(false);
  });

  // Verify availability check returns false when wp exists but wp.media does not
  test('isMediaLibraryAvailable should return false if wp.media is not defined', () => {
    global.wp = {};
    expect(isMediaLibraryAvailable()).toBe(false);
  });

  // Verify availability check returns true when wp.media is defined
  test('isMediaLibraryAvailable should return true if wp.media is defined', () => {
    global.wp = { media: jest.fn() };
    expect(isMediaLibraryAvailable()).toBe(true);
  });

  // --- selectImage ---

  // Simulate selecting an image from the WP media library and verify formatted output
  test('selectImage should attempt to open media library with image filter', async () => {
    const mockAttachment = {
      id: 123,
      type: 'image',
      url: 'https://example.com/image.jpg',
      title: 'Image Title',
      filename: 'image.jpg',
      sizes: {
        full: { url: 'https://example.com/image.jpg' }
      }
    };

    // Mock wp.media
    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') {
          // Store callback to trigger later
          mockFrame._selectCallback = callback;
        }
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({
            toJSON: () => mockAttachment
          }))
        }))
      }))
    };

    global.wp = {
      media: jest.fn(() => mockFrame)
    };

    // Start the selection
    const promise = selectImage();

    // Verify wp.media was called with correct options
    expect(global.wp.media).toHaveBeenCalledWith(expect.objectContaining({
      library: { type: 'image' }
    }));
    expect(mockFrame.open).toHaveBeenCalled();

    // Trigger the select callback
    mockFrame._selectCallback();

    const result = await promise;

    expect(result).toEqual({
      mediaType: 'image',
      url: 'https://example.com/image.jpg',
      attachmentId: 123,
      altText: 'Image Title',
      filename: 'image.jpg',
      originalName: 'Image Title',
    });
  });

  // Verify image selection uses the alt text field when provided instead of title
  test('selectImage should use alt text from attachment when available', async () => {
    const mockAttachment = {
      id: 200,
      type: 'image',
      url: 'https://example.com/photo.png',
      alt: 'Descriptive alt text',
      title: 'Photo Title',
      filename: 'photo.png',
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = selectImage();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result.altText).toBe('Descriptive alt text');
    expect(result.originalName).toBe('Photo Title');
  });

  // Verify image URL falls back to attachment.url when sizes.full is not present
  test('selectImage should fall back to attachment url when sizes.full is missing', async () => {
    const mockAttachment = {
      id: 300,
      type: 'image',
      url: 'https://example.com/fallback.jpg',
      title: 'Fallback',
      filename: 'fallback.jpg',
      // no sizes property
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = selectImage();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result.url).toBe('https://example.com/fallback.jpg');
  });

  // --- selectVideo ---

  // Simulate selecting a video from the WP media library and verify formatted output
  test('selectVideo should attempt to open media library with video filter', async () => {
    const mockAttachment = {
      id: 456,
      type: 'video',
      url: 'https://example.com/video.mp4',
      title: 'Video Title',
      filename: 'video.mp4'
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') {
          mockFrame._selectCallback = callback;
        }
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({
            toJSON: () => mockAttachment
          }))
        }))
      }))
    };

    global.wp = {
      media: jest.fn(() => mockFrame)
    };

    const promise = selectVideo();

    expect(global.wp.media).toHaveBeenCalledWith(expect.objectContaining({
      library: { type: 'video' }
    }));

    mockFrame._selectCallback();
    const result = await promise;

    expect(result.mediaType).toBe('video');
    expect(result.attachmentId).toBe(456);
  });

  // Verify video selection formats all expected fields correctly
  test('selectVideo should return fully formatted video attachment', async () => {
    const mockAttachment = {
      id: 789,
      type: 'video',
      url: 'https://example.com/clip.mp4',
      title: 'Clip Title',
      filename: 'clip.mp4',
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = selectVideo();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result).toEqual({
      mediaType: 'video',
      url: 'https://example.com/clip.mp4',
      attachmentId: 789,
      altText: 'Clip Title',
      filename: 'clip.mp4',
      originalName: 'Clip Title',
    });
  });

  // --- selectMedia ---

  // Verify selectMedia opens the picker with no type filter (allows images and videos)
  test('selectMedia should open media library with no type filter', async () => {
    const mockAttachment = {
      id: 500,
      type: 'image',
      url: 'https://example.com/any.jpg',
      title: 'Any Media',
      filename: 'any.jpg',
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = selectMedia();

    // Should pass empty string for type to allow all media
    expect(global.wp.media).toHaveBeenCalledWith(expect.objectContaining({
      library: { type: '' }
    }));

    mockFrame._selectCallback();
    const result = await promise;

    expect(result.attachmentId).toBe(500);
  });

  // --- openMediaLibrary ---

  // Verify openMediaLibrary resolves null and logs error when wp global is missing
  test('openMediaLibrary should resolve null if wp is undefined', async () => {
    const result = await openMediaLibrary();
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('WordPress media library is not available');
  });

  // Verify openMediaLibrary resolves null when wp exists but wp.media is undefined
  test('openMediaLibrary should resolve null if wp.media is undefined', async () => {
    global.wp = {};
    const result = await openMediaLibrary();
    expect(result).toBeNull();
  });

  // Simulate closing the media modal without making a selection
  test('openMediaLibrary should resolve null when modal is closed without selection', async () => {
    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'close') mockFrame._closeCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => null) // no selection
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = openMediaLibrary({ title: 'Pick' });

    // Trigger close without a selection
    mockFrame._closeCallback();
    const result = await promise;

    expect(result).toBeNull();
  });

  // Simulate selecting when selection.first() returns null (edge case)
  test('openMediaLibrary should resolve null when selection.first() is null', async () => {
    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => null)
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = openMediaLibrary();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result).toBeNull();
  });

  // Verify custom title and button text options are passed through to wp.media
  test('openMediaLibrary should pass custom title and button text to wp.media', async () => {
    const mockFrame = {
      open: jest.fn(),
      on: jest.fn(),
      state: jest.fn(),
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    openMediaLibrary({ title: 'Custom Title', buttonText: 'Choose' });

    expect(global.wp.media).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Custom Title',
      button: { text: 'Choose' },
    }));
  });

  // Simulate selecting multiple attachments when multiple option is enabled
  test('openMediaLibrary should return array when multiple is true', async () => {
    const mockAttachments = [
      { id: 10, type: 'image', url: 'https://example.com/a.jpg', title: 'A', filename: 'a.jpg' },
      { id: 11, type: 'image', url: 'https://example.com/b.jpg', title: 'B', filename: 'b.jpg' },
    ];

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          map: jest.fn((fn) => mockAttachments.map((att) => fn({ toJSON: () => att })))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = openMediaLibrary({ multiple: true });

    // Should pass multiple: true
    expect(global.wp.media).toHaveBeenCalledWith(expect.objectContaining({
      multiple: true,
    }));

    mockFrame._selectCallback();
    const result = await promise;

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].attachmentId).toBe(10);
    expect(result[1].attachmentId).toBe(11);
  });

  // --- formatAttachment edge cases ---

  // Verify that an unrecognized attachment type (e.g. audio) sets mediaType to null
  test('formatAttachment should set mediaType to null for unknown types', async () => {
    const mockAttachment = {
      id: 600,
      type: 'audio', // not image or video
      url: 'https://example.com/track.mp3',
      title: 'Audio Track',
      filename: 'track.mp3',
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = openMediaLibrary();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result.mediaType).toBeNull();
    expect(result.attachmentId).toBe(600);
  });

  // Verify fallback values when alt, title, and filename are all missing
  test('formatAttachment should handle missing alt, title, and filename gracefully', async () => {
    const mockAttachment = {
      id: 700,
      type: 'image',
      url: 'https://example.com/noname.jpg',
      // no alt, title, or filename
    };

    const mockFrame = {
      open: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'select') mockFrame._selectCallback = callback;
      }),
      state: jest.fn(() => ({
        get: jest.fn(() => ({
          first: jest.fn(() => ({ toJSON: () => mockAttachment }))
        }))
      }))
    };

    global.wp = { media: jest.fn(() => mockFrame) };

    const promise = openMediaLibrary();
    mockFrame._selectCallback();
    const result = await promise;

    expect(result.altText).toBe('');
    expect(result.filename).toBe('');
    expect(result.originalName).toBe('');
  });
});
