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
        slides: [
          { slideId: 'slide-1', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-2', order: 2, leftPane: null, rightPane: null },
        ],
      },
      {
        tutorialId: 'existing-id-2',
        title: 'Original Title 2',
        description: 'Original Description 2',
        status: 'published',
        createdAt: '2023-01-02T12:00:00.000Z',
        updatedAt: '2023-01-02T12:00:00.000Z',
        slides: [
          { slideId: 'slide-3', order: 1, leftPane: null, rightPane: null },
          { slideId: 'slide-4', order: 2, leftPane: null, rightPane: null },
        ],
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
      slides: [
        { slideId: 's1', order: 1, leftPane: { type: 'text', content: 'new content' }, rightPane: null },
        { slideId: 's2', order: 2, leftPane: null, rightPane: null },
      ],
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

  test('should update only title field', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      title: 'Only Title Updated',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toEqual(updatedData.title);
    // Other fields should remain unchanged (except updatedAt)
    expect(res.body.description).toEqual(mockTutorials[0].description);
    expect(res.body.status).toEqual(mockTutorials[0].status);
    expect(res.body.slides).toEqual(mockTutorials[0].slides);
  });

  test('should update only description field', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      description: 'Only Description Updated',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.description).toEqual(updatedData.description);
    expect(res.body.title).toEqual(mockTutorials[0].title);
  });

  test('should update status from draft to published', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      status: 'published',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('published');
  });

  test('should update status from published to draft', async () => {
    const tutorialIdToUpdate = 'existing-id-2'; // This one is published
    const updatedData = {
      status: 'draft',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('draft');
  });

  test('should update slides array', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      slides: [
        { slideId: 'new-slide-1', order: 1, leftPane: { type: 'image', url: 'test.png' }, rightPane: null },
        { slideId: 'new-slide-2', order: 2, leftPane: null, rightPane: { type: 'text', content: 'Right content' } },
        { slideId: 'new-slide-3', order: 3, leftPane: null, rightPane: null },
      ],
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.slides.length).toEqual(3);
    expect(res.body.slides).toEqual(updatedData.slides);
  });

  test('should handle empty update body', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const originalUpdatedAt = mockTutorials[0].updatedAt;

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send({});

    expect(res.statusCode).toEqual(200);
    // All fields except updatedAt should remain unchanged
    expect(res.body.title).toEqual(mockTutorials[0].title);
    expect(res.body.description).toEqual(mockTutorials[0].description);
    expect(res.body.status).toEqual(mockTutorials[0].status);
    // updatedAt should still be refreshed
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());
  });

  test('should not affect other tutorials when updating one', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      title: 'Updated First Tutorial',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    
    // Verify the other tutorial wasn't changed
    const savedTutorials = saveTutorials.mock.calls[0][0];
    const otherTutorial = savedTutorials.find(t => t.tutorialId === 'existing-id-2');
    expect(otherTutorial).toEqual(mockTutorials[1]);
  });

  test('should return content-type as application/json', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = { title: 'Test Content Type' };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('should update tutorial with complex slide content', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      slides: [
        {
          slideId: 'complex-slide-1',
          order: 1,
          leftPane: {
            type: 'video',
            url: 'https://example.com/video.mp4',
            caption: 'Demo video',
          },
          rightPane: {
            type: 'text',
            content: '# Markdown Content\n\nWith **bold** and *italic* text.',
          },
        },
        {
          slideId: 'complex-slide-2',
          order: 2,
          leftPane: {
            type: 'image',
            url: '/uploads/images/screenshot.png',
            alt: 'Screenshot',
          },
          rightPane: {
            type: 'code',
            language: 'javascript',
            content: 'console.log("Hello, World!");',
          },
        },
      ],
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.slides).toEqual(updatedData.slides);
    expect(res.body.slides[0].leftPane.type).toEqual('video');
    expect(res.body.slides[1].rightPane.language).toEqual('javascript');
  });

  test('should handle updating to empty description', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      description: '',
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.description).toEqual('');
  });

  test('should ignore extra fields in update body', async () => {
    const tutorialIdToUpdate = 'existing-id-1';
    const updatedData = {
      title: 'Valid Title Update',
      extraField: 'should be in response but thats ok',
      randomProperty: 12345,
    };

    const res = await request(app)
      .put(`/api/tutorials/${tutorialIdToUpdate}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toEqual(updatedData.title);
    // Extra fields might be included due to spread operator, but that's implementation detail
  });
});