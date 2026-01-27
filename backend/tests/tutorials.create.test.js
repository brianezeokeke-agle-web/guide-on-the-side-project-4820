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
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    // On creation, timestamps should be very close (within 100ms)
    const createdTime = new Date(res.body.createdAt).getTime();
    const updatedTime = new Date(res.body.updatedAt).getTime();
    expect(Math.abs(createdTime - updatedTime)).toBeLessThanOrEqual(100);

    // Verify saveTutorials was called correctly
    expect(saveTutorials).toHaveBeenCalledTimes(1);
    const savedTutorials = saveTutorials.mock.calls[0][0];
    expect(savedTutorials.length).toBe(1);
    expect(savedTutorials[0].title).toEqual(newTutorialData.title);
    expect(savedTutorials[0].tutorialId).toEqual(res.body.tutorialId);
  });

  test('should create a new tutorial with exactly 2 empty slides', async () => {
    const newTutorialData = {
      title: 'Tutorial With Slides',
      description: 'Testing minimum slide requirement.',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    
    // Verify exactly 2 slides are created
    expect(res.body.slides).toBeDefined();
    expect(Array.isArray(res.body.slides)).toBe(true);
    expect(res.body.slides.length).toBe(2);

    // Verify first slide structure
    expect(res.body.slides[0].slideId).toBeDefined();
    expect(res.body.slides[0].order).toEqual(1);
    expect(res.body.slides[0].leftPane).toBeNull();
    expect(res.body.slides[0].rightPane).toBeNull();

    // Verify second slide structure
    expect(res.body.slides[1].slideId).toBeDefined();
    expect(res.body.slides[1].order).toEqual(2);
    expect(res.body.slides[1].leftPane).toBeNull();
    expect(res.body.slides[1].rightPane).toBeNull();

    // Verify slide IDs are unique
    expect(res.body.slides[0].slideId).not.toEqual(res.body.slides[1].slideId);
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

  test('should return 400 if title is null', async () => {
    const newTutorialData = {
      title: null,
      description: 'This will fail with null title.',
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
    expect(res.body.slides.length).toBe(2); // Should still have 2 slides
    expect(saveTutorials).toHaveBeenCalledTimes(1);
  });

  test('should generate unique tutorialId for each new tutorial', async () => {
    const firstTutorial = {
      title: 'First Tutorial',
      description: 'First description',
    };

    const secondTutorial = {
      title: 'Second Tutorial',
      description: 'Second description',
    };

    const res1 = await request(app)
      .post('/api/tutorials')
      .send(firstTutorial);

    // Reset for second call but keep accumulated tutorials
    loadTutorials.mockReturnValue([res1.body]);

    const res2 = await request(app)
      .post('/api/tutorials')
      .send(secondTutorial);

    expect(res1.statusCode).toEqual(201);
    expect(res2.statusCode).toEqual(201);
    expect(res1.body.tutorialId).not.toEqual(res2.body.tutorialId);
  });

  test('should set timestamps in valid ISO 8601 format', async () => {
    const newTutorialData = {
      title: 'Timestamp Test Tutorial',
      description: 'Testing timestamp format.',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    
    // Verify ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(res.body.createdAt).toMatch(isoRegex);
    expect(res.body.updatedAt).toMatch(isoRegex);

    // Verify timestamps are valid dates
    expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date');
    expect(new Date(res.body.updatedAt).toString()).not.toBe('Invalid Date');
  });

  test('should handle empty request body', async () => {
    const res = await request(app)
      .post('/api/tutorials')
      .send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ error: 'Title is required.' });
    expect(saveTutorials).not.toHaveBeenCalled();
  });

  test('should ignore extra fields in request body', async () => {
    const newTutorialData = {
      title: 'Valid Title',
      description: 'Valid description',
      extraField: 'should be ignored',
      anotherExtra: 12345,
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toEqual(newTutorialData.title);
    expect(res.body.description).toEqual(newTutorialData.description);
    expect(res.body.extraField).toBeUndefined();
    expect(res.body.anotherExtra).toBeUndefined();
  });

  test('should add new tutorial to existing tutorials list', async () => {
    // Setup: pre-existing tutorial
    const existingTutorial = {
      tutorialId: 'existing-id',
      title: 'Existing Tutorial',
      description: 'Already exists',
      status: 'published',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      slides: [],
    };
    loadTutorials.mockReturnValue([existingTutorial]);

    const newTutorialData = {
      title: 'New Tutorial',
      description: 'Newly created',
    };

    const res = await request(app)
      .post('/api/tutorials')
      .send(newTutorialData);

    expect(res.statusCode).toEqual(201);
    
    // Verify saveTutorials was called with both tutorials
    expect(saveTutorials).toHaveBeenCalledTimes(1);
    const savedTutorials = saveTutorials.mock.calls[0][0];
    expect(savedTutorials.length).toBe(2);
    expect(savedTutorials[0]).toEqual(existingTutorial);
    expect(savedTutorials[1].title).toEqual(newTutorialData.title);
  });
});