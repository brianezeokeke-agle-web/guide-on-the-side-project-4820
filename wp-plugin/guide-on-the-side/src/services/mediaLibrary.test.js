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
  beforeEach(() => {
    jest.clearAllMocks();
    // Delete global wp before each test to ensure a clean state
    delete global.wp;
  });

  test('isMediaLibraryAvailable should return false if wp is not defined', () => {
    expect(isMediaLibraryAvailable()).toBe(false);
  });

  test('isMediaLibraryAvailable should return true if wp.media is defined', () => {
    global.wp = { media: jest.fn() };
    expect(isMediaLibraryAvailable()).toBe(true);
  });

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

  test('openMediaLibrary should resolve null if wp is undefined', async () => {
    const result = await openMediaLibrary();
    expect(result).toBeNull();
  });
});
