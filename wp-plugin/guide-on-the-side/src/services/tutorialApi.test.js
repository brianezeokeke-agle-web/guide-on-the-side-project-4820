/**
 * Unit Test: Tutorial API Service (WordPress Environment)
 */

import {
  listTutorials,
  getTutorial,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  archiveTutorial,
  unarchiveTutorial,
  publishTutorial,
  unpublishTutorial,
  updateTutorialSlides,
} from './tutorialApi';

// Mock fetch globally
global.fetch = jest.fn();

describe('Tutorial API Service (WordPress)', () => {
  const mockRestUrl = 'https://example.com/wp-json/gots/v1';
  const mockNonce = 'mock-nonce-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up WordPress global config
    window.gotsConfig = {
      restUrl: mockRestUrl,
      nonce: mockNonce,
    };
  });

  afterEach(() => {
    delete window.gotsConfig;
  });

  test('listTutorials should fetch all tutorials', async () => {
    const mockTutorials = [{ id: 1, title: 'Tutorial 1' }, { id: 2, title: 'Tutorial 2' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTutorials,
    });

    const result = await listTutorials();

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials`, expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-WP-Nonce': mockNonce,
      }),
    }));
    expect(result).toEqual(mockTutorials);
  });

  test('getTutorial should fetch a single tutorial by ID', async () => {
    const mockTutorial = { id: 1, title: 'Tutorial 1' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTutorial,
    });

    const result = await getTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'GET',
    }));
    expect(result).toEqual(mockTutorial);
  });

  test('getTutorial should throw error if not found', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(getTutorial(999)).rejects.toThrow('Tutorial not found');
  });

  test('createTutorial should post new tutorial data', async () => {
    const newData = { title: 'New Tutorial', description: 'Description' };
    const mockCreated = { id: 123, ...newData };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreated,
    });

    const result = await createTutorial(newData);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(newData),
    }));
    expect(result).toEqual(mockCreated);
  });

  test('updateTutorial should put updated data', async () => {
    const updateData = { title: 'Updated Title' };
    const mockUpdated = { id: 1, ...updateData };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdated,
    });

    const result = await updateTutorial(1, updateData);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify(updateData),
    }));
    expect(result).toEqual(mockUpdated);
  });

  test('deleteTutorial should send delete request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await deleteTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'DELETE',
    }));
    expect(result).toEqual({ success: true });
  });

  test('archiveTutorial should update archived field to true', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, archived: true }),
    });

    await archiveTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ archived: true }),
    }));
  });

  test('unarchiveTutorial should update archived field to false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, archived: false }),
    });

    await unarchiveTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ archived: false }),
    }));
  });

  test('publishTutorial should update status to published', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, status: 'published' }),
    });

    await publishTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'published' }),
    }));
  });

  test('unpublishTutorial should update status to draft', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, status: 'draft' }),
    });

    await unpublishTutorial(1);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'draft' }),
    }));
  });

  test('updateTutorialSlides should update slides field', async () => {
    const mockSlides = [{ slideId: 's1', title: 'Slide 1' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, slides: mockSlides }),
    });

    await updateTutorialSlides(1, mockSlides);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ slides: mockSlides }),
    }));
  });
});
