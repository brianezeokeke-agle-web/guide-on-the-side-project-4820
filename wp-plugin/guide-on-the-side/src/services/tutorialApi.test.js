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

  // --- listTutorials ---

  // Verify GET /tutorials returns an array of all tutorials
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

  // Verify listTutorials throws when the server returns a non-ok response
  test('listTutorials should throw error on server failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(listTutorials()).rejects.toThrow('Failed to load tutorials');
  });

  // Verify listTutorials handles an empty tutorial list gracefully
  test('listTutorials should return an empty array when no tutorials exist', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await listTutorials();
    expect(result).toEqual([]);
  });

  // --- getTutorial ---

  // Verify GET /tutorials/:id returns a single tutorial object
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

  // Verify getTutorial throws 'Tutorial not found' on a 404 response
  test('getTutorial should throw error if not found', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(getTutorial(999)).rejects.toThrow('Tutorial not found');
  });

  // Verify getTutorial throws a generic error on non-404 server failure (e.g. 500)
  test('getTutorial should throw generic error on non-404 server failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getTutorial(1)).rejects.toThrow('Failed to fetch tutorial');
  });

  // --- createTutorial ---

  // Simulate creating a new tutorial via POST and verify the returned object
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

  // Verify createTutorial uses the server-provided error message on failure
  test('createTutorial should throw server error message on failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Title is required' }),
    });

    await expect(createTutorial({})).rejects.toThrow('Title is required');
  });

  // Verify createTutorial falls back to a generic message when server returns no JSON body
  test('createTutorial should throw fallback message when response body is not JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(createTutorial({ title: 'Test' })).rejects.toThrow('Failed to create tutorial');
  });

  // --- updateTutorial ---

  // Simulate updating a tutorial's title via PUT and verify the response
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

  // Verify updateTutorial throws 'Tutorial not found' on a 404 response
  test('updateTutorial should throw error if tutorial not found', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(updateTutorial(999, { title: 'X' })).rejects.toThrow('Tutorial not found');
  });

  // Verify updateTutorial uses the server error message on non-404 failure
  test('updateTutorial should throw server error message on non-404 failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid field value' }),
    });

    await expect(updateTutorial(1, { title: '' })).rejects.toThrow('Invalid field value');
  });

  // Verify updateTutorial falls back to generic message when server body is not JSON
  test('updateTutorial should throw fallback message when response body is not JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(updateTutorial(1, { title: 'X' })).rejects.toThrow('Failed to update tutorial');
  });

  // --- deleteTutorial ---

  // Simulate permanently deleting a tutorial and verify success response
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

  // Verify deleteTutorial throws 'Tutorial not found' on a 404 response
  test('deleteTutorial should throw error if tutorial not found', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(deleteTutorial(999)).rejects.toThrow('Tutorial not found');
  });

  // Verify deleteTutorial uses the server error message on non-404 failure
  test('deleteTutorial should throw server error message on non-404 failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Permission denied' }),
    });

    await expect(deleteTutorial(1)).rejects.toThrow('Permission denied');
  });

  // Verify deleteTutorial falls back to generic message when server body is not JSON
  test('deleteTutorial should throw fallback message when response body is not JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(deleteTutorial(1)).rejects.toThrow('Failed to delete tutorial');
  });

  // --- archiveTutorial / unarchiveTutorial ---

  // Simulate archiving a tutorial by setting archived to true via PUT
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

  // Simulate restoring an archived tutorial by setting archived to false
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

  // --- publishTutorial / unpublishTutorial ---

  // Simulate publishing a tutorial by setting status to 'published'
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

  // Simulate reverting a tutorial to draft by setting status to 'draft'
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

  // --- updateTutorialSlides ---

  // Simulate saving slide data for a tutorial via PUT
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

  // Verify saving an empty slides array is handled correctly
  test('updateTutorialSlides should handle an empty slides array', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, slides: [] }),
    });

    const result = await updateTutorialSlides(1, []);

    expect(fetch).toHaveBeenCalledWith(`${mockRestUrl}/tutorials/1`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ slides: [] }),
    }));
    expect(result.slides).toEqual([]);
  });

  // --- apiRequest / config helpers ---

  // Verify all requests include the Content-Type: application/json header
  test('requests should include Content-Type application/json header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    await listTutorials();

    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
    }));
  });

  // Verify all requests include credentials: 'same-origin' for WP session cookies
  test('requests should include credentials same-origin for WP cookies', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    await listTutorials();

    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      credentials: 'same-origin',
    }));
  });

  // Verify fallback config is used when window.gotsConfig is absent (no nonce sent)
  test('should use fallback config when gotsConfig is not set', async () => {
    delete window.gotsConfig;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    await listTutorials();

    // Should use the default fallback URL and NOT include the nonce header
    const callArgs = fetch.mock.calls[0];
    expect(callArgs[0]).toBe('/wp-json/gots/v1/tutorials');
    expect(callArgs[1].headers['X-WP-Nonce']).toBeUndefined();
  });
});
