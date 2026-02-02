const request = require('supertest');
const app = require('../index');
const fs = require('fs');
const multer = require('multer');

// Let's not mock fs globally, as it causes too many issues with module loading.
// Instead, we will spy on specific methods within our tests.

// Mock multer's diskStorage to use memoryStorage to avoid disk I/O.
jest.spyOn(multer, 'diskStorage').mockImplementation(multer.memoryStorage);

describe('File Upload Endpoint', () => {
  const UPLOAD_URL = '/api/uploads';
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

  const dummyImageBuffer = Buffer.from('dummy image data');
  const dummyVideoBuffer = Buffer.from('dummy video data');
  
  let unlinkSpy;

  beforeEach(() => {
    // Clear any previous spies or mocks
    jest.clearAllMocks();
    // Spy on unlinkSync and provide a mock implementation so it doesn't actually delete files
    unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the spy to its original implementation after each test
    unlinkSpy.mockRestore();
  });

  test('should successfully upload a valid image file', async () => {
    const res = await request(app)
      .post(UPLOAD_URL)
      .attach('file', dummyImageBuffer, { filename: 'test_image.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.file.url).toMatch(/^\/uploads\/images\/[a-f0-9-]+\.jpg$/);
  });

  test('should reject an invalid file type', async () => {
    const res = await request(app)
      .post(UPLOAD_URL)
      .attach('file', Buffer.from('some data'), { filename: 'document.pdf', contentType: 'application/pdf' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/Invalid file type/i);
  });

  test('should reject an oversized image file (over 10MB)', async () => {
    const largeImageBuffer = Buffer.alloc(MAX_IMAGE_SIZE + 1, 'a');
    const res = await request(app)
      .post(UPLOAD_URL)
      .attach('file', largeImageBuffer, { filename: 'large_image.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/Image file too large/i);
    // The route logic calls unlinkSync for oversized images after upload
    expect(unlinkSpy).toHaveBeenCalledTimes(1);
  });
  
  test('should successfully upload a valid video file', async () => {
    const res = await request(app)
      .post(UPLOAD_URL)
      .attach('file', dummyVideoBuffer, { filename: 'test_video.mp4', contentType: 'video/mp4' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.file.mediaType).toEqual('video');
  });

  // Increase timeout for this specific test as it handles a large buffer
  test('should reject an oversized video file (over 100MB)', async () => {
    const largeVideoBuffer = Buffer.alloc(MAX_VIDEO_SIZE + 1, 'b');
    const res = await request(app)
      .post(UPLOAD_URL)
      .attach('file', largeVideoBuffer, { filename: 'large_video.mp4', contentType: 'video/mp4' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/File too large/i);
  }, 15000); // Increased timeout to 15 seconds
});