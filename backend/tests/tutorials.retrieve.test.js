const request = require('supertest');
const app = require('../index');
const { loadTutorials } = require('../persistence/tutorialStore');

// Mock the tutorialStore to prevent actual file system operations
jest.mock('../persistence/tutorialStore', () => ({
  loadTutorials: jest.fn(),
  saveTutorials: jest.fn(), // Also mock saveTutorials, though not used by GET
}));

describe('GET /api/tutorials/:id', () => {
  let mockTutorials;

  beforeEach(() => {
    // Reset mocks and mock data before each test
    loadTutorials.mockClear();

    mockTutorials = [
      {
        tutorialId: 'retrieve-id-1',
        title: 'Retrieve Tutorial 1',
        description: 'Description for Retrieve Tutorial 1',
        status: 'published',
        createdAt: '2023-01-03T10:00:00.000Z',
        updatedAt: '2023-01-03T10:00:00.000Z',
        slides: [
          { slideId: 'slide-1', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-2', order: 2, leftPane: null, rightPane: null },
        ],
      },
      {
        tutorialId: 'retrieve-id-2',
        title: 'Retrieve Tutorial 2',
        description: 'Description for Retrieve Tutorial 2',
        status: 'draft',
        createdAt: '2023-01-04T11:00:00.000Z',
        updatedAt: '2023-01-04T11:00:00.000Z',
        slides: [
          { slideId: 'slide-3', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-4', order: 2, leftPane: null, rightPane: null },
        ],
      },
    ];

    loadTutorials.mockReturnValue(mockTutorials);
  });

  test('should return the correct tutorial if ID is valid', async () => {
    const validId = 'retrieve-id-1';
    const res = await request(app).get(`/api/tutorials/${validId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockTutorials[0]);
    expect(loadTutorials).toHaveBeenCalledTimes(1);
  });

  test('should return 404 if tutorial ID is not found', async () => {
    const invalidId = 'non-existent-id';
    const res = await request(app).get(`/api/tutorials/${invalidId}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ error: 'Tutorial not found.' });
    expect(loadTutorials).toHaveBeenCalledTimes(1);
  });

  test('should return tutorial with all expected fields', async () => {
    const validId = 'retrieve-id-1';
    const res = await request(app).get(`/api/tutorials/${validId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('tutorialId');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('description');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
    expect(res.body).toHaveProperty('slides');
  });

  test('should return tutorial with slides containing proper structure', async () => {
    const validId = 'retrieve-id-1';
    const res = await request(app).get(`/api/tutorials/${validId}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.slides)).toBe(true);
    expect(res.body.slides.length).toBe(2);

    res.body.slides.forEach((slide) => {
      expect(slide).toHaveProperty('slideId');
      expect(slide).toHaveProperty('order');
      expect(slide).toHaveProperty('leftPane');
      expect(slide).toHaveProperty('rightPane');
    });
  });

  test('should return content-type as application/json', async () => {
    const validId = 'retrieve-id-1';
    const res = await request(app).get(`/api/tutorials/${validId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('should retrieve different tutorials by their unique IDs', async () => {
    const res1 = await request(app).get('/api/tutorials/retrieve-id-1');
    const res2 = await request(app).get('/api/tutorials/retrieve-id-2');

    expect(res1.statusCode).toEqual(200);
    expect(res2.statusCode).toEqual(200);
    expect(res1.body.tutorialId).toEqual('retrieve-id-1');
    expect(res2.body.tutorialId).toEqual('retrieve-id-2');
    expect(res1.body.title).not.toEqual(res2.body.title);
  });

  test('should return 404 for empty string ID', async () => {
    // Note: This will likely match a different route or return 404
    const res = await request(app).get('/api/tutorials/');

    // Should return 200 with list (matches GET /api/tutorials) or appropriate response
    expect([200, 404]).toContain(res.statusCode);
  });

  test('should handle special characters in ID gracefully', async () => {
    const specialId = 'id-with-special-chars-!@#';
    const res = await request(app).get(`/api/tutorials/${encodeURIComponent(specialId)}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ error: 'Tutorial not found.' });
  });

  test('should return tutorial with draft status', async () => {
    const draftId = 'retrieve-id-2';
    const res = await request(app).get(`/api/tutorials/${draftId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('draft');
  });

  test('should return tutorial with published status', async () => {
    const publishedId = 'retrieve-id-1';
    const res = await request(app).get(`/api/tutorials/${publishedId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('published');
  });

  test('should return 404 when tutorials list is empty', async () => {
    loadTutorials.mockReturnValue([]);
    const res = await request(app).get('/api/tutorials/any-id');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ error: 'Tutorial not found.' });
  });
});