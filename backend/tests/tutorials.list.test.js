const request = require('supertest');
const app = require('../index'); // Adjust path if necessary
const { loadTutorials, saveTutorials } = require('../persistence/tutorialStore');

// Mock the tutorialStore to prevent actual file system operations
jest.mock('../persistence/tutorialStore', () => ({
  loadTutorials: jest.fn(),
  saveTutorials: jest.fn(),
}));

describe('GET /api/tutorials', () => {
  let mockTutorials;

  beforeEach(() => {
    // Reset mocks and mock data before each test
    loadTutorials.mockClear();
    saveTutorials.mockClear();

    mockTutorials = [
      {
        tutorialId: 'list-id-1',
        title: 'List Tutorial 1',
        description: 'Description for List Tutorial 1',
        status: 'draft',
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z',
        slides: [
          { slideId: 'slide-1', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-2', order: 2, leftPane: null, rightPane: null },
        ],
      },
      {
        tutorialId: 'list-id-2',
        title: 'List Tutorial 2',
        description: 'Description for List Tutorial 2',
        status: 'published',
        createdAt: '2023-01-02T11:00:00.000Z',
        updatedAt: '2023-01-02T11:00:00.000Z',
        slides: [
          { slideId: 'slide-3', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-4', order: 2, leftPane: null, rightPane: null },
        ],
      },
    ];
  });

  test('should return an empty array if no tutorials exist', async () => {
    loadTutorials.mockReturnValue([]); // Mock no tutorials
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
    expect(loadTutorials).toHaveBeenCalledTimes(1);
  });

  test('should return all tutorials if they exist', async () => {
    loadTutorials.mockReturnValue(mockTutorials); // Mock with existing tutorials
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockTutorials);
    expect(res.body.length).toEqual(mockTutorials.length);
    expect(loadTutorials).toHaveBeenCalledTimes(1);
  });

  test('should return tutorials with correct structure', async () => {
    loadTutorials.mockReturnValue(mockTutorials);
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    
    // Verify each tutorial has the expected fields
    res.body.forEach((tutorial) => {
      expect(tutorial).toHaveProperty('tutorialId');
      expect(tutorial).toHaveProperty('title');
      expect(tutorial).toHaveProperty('description');
      expect(tutorial).toHaveProperty('status');
      expect(tutorial).toHaveProperty('createdAt');
      expect(tutorial).toHaveProperty('updatedAt');
      expect(tutorial).toHaveProperty('slides');
      expect(Array.isArray(tutorial.slides)).toBe(true);
    });
  });

  test('should return tutorials with slides containing proper structure', async () => {
    loadTutorials.mockReturnValue(mockTutorials);
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    
    // Verify slides have correct structure
    res.body.forEach((tutorial) => {
      tutorial.slides.forEach((slide) => {
        expect(slide).toHaveProperty('slideId');
        expect(slide).toHaveProperty('order');
        expect(slide).toHaveProperty('leftPane');
        expect(slide).toHaveProperty('rightPane');
      });
    });
  });

  test('should return tutorials with both draft and published status', async () => {
    loadTutorials.mockReturnValue(mockTutorials);
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    
    const statuses = res.body.map((t) => t.status);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('published');
  });

  test('should return a single tutorial when only one exists', async () => {
    const singleTutorial = [mockTutorials[0]];
    loadTutorials.mockReturnValue(singleTutorial);
    
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0]).toEqual(mockTutorials[0]);
  });

  test('should return content-type as application/json', async () => {
    loadTutorials.mockReturnValue(mockTutorials);
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('should handle large number of tutorials', async () => {
    // Create a large list of tutorials
    const largeTutorialList = Array.from({ length: 100 }, (_, i) => ({
      tutorialId: `large-id-${i}`,
      title: `Tutorial ${i}`,
      description: `Description ${i}`,
      status: i % 2 === 0 ? 'draft' : 'published',
      createdAt: '2023-01-01T10:00:00.000Z',
      updatedAt: '2023-01-01T10:00:00.000Z',
      slides: [
        { slideId: `slide-${i}-1`, order: 1, leftPane: null, rightPane: null },
        { slideId: `slide-${i}-2`, order: 2, leftPane: null, rightPane: null },
      ],
    }));

    loadTutorials.mockReturnValue(largeTutorialList);
    const res = await request(app).get('/api/tutorials');

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(100);
  });
});