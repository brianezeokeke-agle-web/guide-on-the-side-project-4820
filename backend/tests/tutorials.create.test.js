const request = require('supertest');
const app = require('../index');
const { loadTutorials, saveTutorials } = require('../persistence/tutorialStore');

// Mock the tutorialStore to prevent actual file system operations
jest.mock('../persistence/tutorialStore', () => ({
  loadTutorials: jest.fn(),
  saveTutorials: jest.fn(),
}));

describe('POST /api/tutorials', () => {
  let mockTutorials;

  beforeEach(() => {
    // Reset mocks and mock data before each test
    loadTutorials.mockClear();
    saveTutorials.mockClear();
    mockTutorials = []; // Start with an empty list for create tests
    loadTutorials.mockReturnValue(mockTutorials);
  });

  test('should create a new tutorial and return 201 Created', async () => {
    const newTutorialData = {
      title: 'My New Test Tutorial',
      description: 'A great tutorial about testing.',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.tutorialId).toBeDefined();
    expect(res.body.title).toEqual(newTutorialData.title);
    expect(res.body.description).toEqual(newTutorialData.description);
    expect(res.body.status).toEqual('draft');
    expect(res.body.slides).toEqual([]);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    expect(res.body.createdAt).toEqual(res.body.updatedAt); // On creation, they should be the same

    // Verify saveTutorials was called correctly
    expect(saveTutorials).toHaveBeenCalledTimes(1);
    const savedTutorials = saveTutorials.mock.calls[0][0];
    expect(savedTutorials.length).toBe(1);
    expect(savedTutorials[0].title).toEqual(newTutorialData.title);
    expect(savedTutorials[0].tutorialId).toEqual(res.body.tutorialId);
  });

  test('should return 400 if title is missing', async () => {
    const newTutorialData = {
      description: 'This will fail.',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ error: 'Title is required.' });
    expect(saveTutorials).not.toHaveBeenCalled();
  });

  test('should return 400 if title is an empty string', async () => {
    const newTutorialData = {
      title: '  ', // Title with only whitespace
      description: 'This will also fail.',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ error: 'Title is required.' });
    expect(saveTutorials).not.toHaveBeenCalled();
  });

  test('should create a new tutorial with no description', async () => {
    const newTutorialData = {
      title: 'Title Only Tutorial',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toEqual(newTutorialData.title);
    expect(res.body.description).toEqual(''); // Should default to empty string
    expect(saveTutorials).toHaveBeenCalledTimes(1);
  });
});