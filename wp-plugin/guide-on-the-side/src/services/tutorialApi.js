/**
 * Tutorial API Service
 * 
 * This module provides all API calls for tutorial CRUD operations.
 * It uses WordPress REST API when running inside WP admin, with nonce authentication.
 */

/**
 * Get the API configuration
 * @returns {Object} API configuration with restUrl and nonce
 */
function getConfig() {
  // Check if we're running in WordPress context
  if (typeof window !== 'undefined' && window.gotsConfig) {
    return {
      baseUrl: window.gotsConfig.restUrl,
      nonce: window.gotsConfig.nonce,
    };
  }
  
  // Fallback for development outside WordPress
  return {
    baseUrl: '/wp-json/gots/v1',
    nonce: null,
  };
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/tutorials')
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function apiRequest(endpoint, options = {}) {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add WordPress nonce for authentication
  if (config.nonce) {
    headers['X-WP-Nonce'] = config.nonce;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Include cookies for WordPress session
  });
  
  return response;
}

/**
 * List all tutorials
 * @returns {Promise<Array>} Array of tutorial objects
 */
export async function listTutorials() {
  const response = await apiRequest('/tutorials', {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Failed to load tutorials');
  }
  
  return response.json();
}

/**
 * Get a single tutorial by ID
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Tutorial object
 */
export async function getTutorial(id) {
  const response = await apiRequest(`/tutorials/${id}`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tutorial not found');
    }
    throw new Error('Failed to fetch tutorial');
  }
  
  return response.json();
}

/**
 * Create a new tutorial
 * @param {Object} data - Tutorial data (title, description)
 * @returns {Promise<Object>} Created tutorial object
 */
export async function createTutorial(data) {
  const response = await apiRequest('/tutorials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create tutorial');
  }
  
  return response.json();
}

/**
 * Update an existing tutorial
 * @param {string|number} id - Tutorial ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function updateTutorial(id, data) {
  const response = await apiRequest(`/tutorials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tutorial not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update tutorial');
  }
  
  return response.json();
}

/**
 * Archive a tutorial
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function archiveTutorial(id) {
  return updateTutorial(id, { archived: true });
}

/**
 * Unarchive (restore) a tutorial
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function unarchiveTutorial(id) {
  return updateTutorial(id, { archived: false });
}

/**
 * Publish a tutorial
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function publishTutorial(id) {
  return updateTutorial(id, { status: 'published' });
}

/**
 * Unpublish a tutorial (set to draft)
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function unpublishTutorial(id) {
  return updateTutorial(id, { status: 'draft' });
}

/**
 * Update tutorial slides
 * @param {string|number} id - Tutorial ID
 * @param {Array} slides - Array of slide objects to merge
 * @returns {Promise<Object>} Updated tutorial object
 */
export async function updateTutorialSlides(id, slides) {
  return updateTutorial(id, { slides });
}

/**
 * Delete a tutorial permanently
 * @param {string|number} id - Tutorial ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteTutorial(id) {
  const response = await apiRequest(`/tutorials/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tutorial not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete tutorial');
  }
  
  return response.json();
}

// Default export for convenience
export default {
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
};
