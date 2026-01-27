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
        slides: [],
      },
      {
        tutorialId: 'list-id-2',
        title: 'List Tutorial 2',
        description: 'Description for List Tutorial 2',
        status: 'published',
        createdAt: '2023-01-02T11:00:00.000Z',
        updatedAt: '2023-01-02T11:00:00.000Z',
        slides: [],
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
});