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
        slides: [],
      },
      {
        tutorialId: 'retrieve-id-2',
        title: 'Retrieve Tutorial 2',
        description: 'Description for Retrieve Tutorial 2',
        status: 'draft',
        createdAt: '2023-01-04T11:00:00.000Z',
        updatedAt: '2023-01-04T11:00:00.000Z',
        slides: [],
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
});