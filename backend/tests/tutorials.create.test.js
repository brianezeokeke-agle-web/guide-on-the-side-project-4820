const request = require('supertest');
const app = require('../index');
const fs = require('fs');

describe('POST /api/tutorials', () => {
  it('should create a tutorial and persist it', async () => {
    const tutorialData = { title: 'Test Tutorial', description: 'Test content' };

    const response = await request(app)
      .post('/api/tutorials')
      .send(tutorialData);

    expect(response.status).toBe(201);
    expect(response.body.tutorialId).toBeDefined();

    // Assert persistence
    const data = JSON.parse(fs.readFileSync('./data/tutorials.dev.json', 'utf8'));
    const createdTutorial = data.find(t => t.tutorialId === response.body.tutorialId);
    expect(createdTutorial).toBeDefined();
    expect(createdTutorial.title).toBe(tutorialData.title);
    expect(createdTutorial.description).toBe(tutorialData.description);
  });
});
