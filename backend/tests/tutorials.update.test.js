const request = require('supertest');
const app = require('../index'); // Adjust path if necessary
const { loadTutorials, saveTutorials } = require('../persistence/tutorialStore');

// Mock the tutorialStore to prevent actual file system operations
jest.mock('../persistence/tutorialStore', () => ({
  loadTutorials: jest.fn(),
  saveTutorials: jest.fn(),
}));

describe('PUT /api/tutorials/:id', () => {
  let mockTutorials;

  beforeEach(() => {
    // Reset mocks and mock data before each test
    loadTutorials.mockClear();
    saveTutorials.mockClear();

    mockTutorials = [
      {
        tutorialId: 'existing-id-1',
        title: 'Original Title 1',
        description: 'Original Description 1',
        status: 'draft',
        createdAt: '2023-01-01T12:00:00.000Z',
        updatedAt: '2023-01-01T12:00:00.000Z',
        slides: [],
      },
      {
        tutorialId: 'existing-id-2',
        title: 'Original Title 2',
        description: 'Original Description 2',
        status: 'published',
        createdAt: '2023-01-02T12:00:00.000Z',
        updatedAt: '2023-01-02T12:00:00.000Z',
        slides: [],
      },
    ];

    // Mock loadTutorials to return our mock data
    loadTutorials.mockReturnValue(mockTutorials);
  });

  test('should update an existing tutorial and return 200 OK', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const originalUpdatedAt = mockTutorials[0].updatedAt; // Store original updatedAt
    const updatedData = {
      title: 'Updated Title 1',
      description: 'Updated Description 1',
      status: 'published',
      slides: [{ slideId: 's1', content: 'new content' }],
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.tutorialId).toEqual(tutorialIdToUpdate);
    expect(res.body.title).toEqual(updatedData.title);
    expect(res.body.description).toEqual(updatedData.description);
    expect(res.body.status).toEqual(updatedData.status);
    expect(res.body.slides).toEqual(updatedData.slides);
    expect(res.body.createdAt).toEqual(mockTutorials[0].createdAt); // createdAt should be preserved

    // New assertions for updatedAt
    expect(res.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // Check ISO format
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Verify saveTutorials was called with the updated list
    expect(saveTutorials).toHaveBeenCalledTimes(1);
    const savedTutorials = saveTutorials.mock.calls[0][0];
    const updatedTutorialInStore = savedTutorials.find(t => t.tutorialId === tutorialIdToUpdate);
    
    expect(updatedTutorialInStore.title).toEqual(updatedData.title);
    expect(updatedTutorialInStore.description).toEqual(updatedData.description);
    expect(updatedTutorialInStore.status).toEqual(updatedData.status);
    expect(updatedTutorialInStore.slides).toEqual(updatedData.slides);
    expect(updatedTutorialInStore.createdAt).toEqual(mockTutorials[0].createdAt);
    // New assertions for updatedAt in saved data
    expect(updatedTutorialInStore.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(updatedTutorialInStore.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
  });

  test('should return 404 if tutorial to update is not found', async () => {
    const nonExistentId = 'non-existent-id';
    const updatedData = { title: 'Attempt to update' };

    const res = await request(app)
      .put(`/api/tutorials/${nonExistentId}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ error: 'Tutorial not found.' });
    expect(saveTutorials).not.toHaveBeenCalled(); // No save should happen if not found
  });

  test('should preserve immutable fields like tutorialId and createdAt', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const originalCreatedAt = mockTutorials[0].createdAt;

    const updatedDataAttemptingToChangeImmutable = {
      tutorialId: 'new-id-should-be-ignored', // Should be ignored
      createdAt: '2024-01-01T00:00:00.000Z',  // Should be ignored
      title: 'Legit New Title',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedDataAttemptingToChangeImmutable);

    expect(res.statusCode).toEqual(200);
    expect(res.body.tutorialId).toEqual(tutorialIdToUpdate); // Should remain original ID
    expect(res.body.createdAt).toEqual(originalCreatedAt);    // Should remain original createdAt
    expect(res.body.title).toEqual(updatedDataAttemptingToChangeImmutable.title);

    // Verify saveTutorials received the correct, unchanged immutable fields
    expect(saveTutorials).toHaveBeenCalledTimes(1);
    const savedTutorials = saveTutorials.mock.calls[0][0];
    const updatedTutorialInStore = savedTutorials.find(t => t.tutorialId === tutorialIdToUpdate);

    expect(updatedTutorialInStore.tutorialId).toEqual(tutorialIdToUpdate);
    expect(updatedTutorialInStore.createdAt).toEqual(originalCreatedAt);
  });
});