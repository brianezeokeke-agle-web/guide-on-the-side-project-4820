const request = require('supertest');
const app = require('../index');

describe('GET /api/tutorials/:id', () => {
  it('should retrieve a tutorial by id', async () => {
    // Create a tutorial first
    const createResponse = await request(app)
      .post('/api/tutorials')
      .send({ title: 'Test Tutorial', description: 'Test description' });

    expect(createResponse.status).toBe(201);
    const tutorialId = createResponse.body.tutorialId;

    // Now retrieve it
    const response = await request(app)
      .get(`/api/tutorials/${tutorialId}`);

    expect(response.status).toBe(200);
    expect(response.body.tutorialId).toBe(tutorialId);
    expect(response.body.title).toBe('Test Tutorial');
    expect(response.body.description).toBe('Test description');
  });

  it('should return 404 for invalid id', async () => {
    const response = await request(app)
      .get('/api/tutorials/invalid-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Tutorial not found.');
  });
});
