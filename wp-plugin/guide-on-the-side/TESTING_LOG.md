# WordPress Environment Testing Log

This log documents the testing environment setup and the implementation of unit and integration tests for the "Guide on the Side" WordPress plugin.

## 1. Testing Environment Setup

- **Framework**: Jest
- **Environment**: jsdom (simulating browser environment)
- **Transpiler**: Babel (via `babel-jest`)
- **Configuration**:
    - `jest.config.cjs`: Configures the test environment, file transformations, and module mapping.
    - `babel.config.cjs`: Configures Babel presets for modern JavaScript support in tests.
- **Dependencies Installed**:
    - `jest`, `jest-environment-jsdom`, `babel-jest`, `@babel/core`, `@babel/preset-env`, `jest-transform-stub`.

## 2. Unit Tests: Tutorial API Service

**File**: `src/services/tutorialApi.test.js`
**Target**: `src/services/tutorialApi.js`

This service handles all CRUD operations for tutorials via the WordPress REST API.

### Scenarios Tested:
1.  **listTutorials**: Verifies that a GET request is sent to the correct WordPress endpoint with the necessary nonce for authentication.
2.  **getTutorial**: 
    - Verifies successful retrieval of a single tutorial by ID.
    - Verifies that a 404 response results in a "Tutorial not found" error.
3.  **createTutorial**: Verifies that a POST request is sent with the correct tutorial data in the body.
4.  **updateTutorial**: Verifies that a PUT request is sent with the updated fields.
5.  **deleteTutorial**: Verifies that a DELETE request is sent to the correct endpoint.
6.  **archive/unarchive**: Verifies that these helper functions correctly call the update endpoint with the `archived` flag.
7.  **publish/unpublish**: Verifies that these helper functions correctly call the update endpoint with the `status` field.
8.  **updateTutorialSlides**: Verifies that slide data is correctly sent via a PUT request.

**Results**: 11/11 tests passed.

## 3. Unit Tests: Media Library Service

**File**: `src/services/mediaLibrary.test.js`
**Target**: `src/services/mediaLibrary.js`

This service integrates with the built-in WordPress Media Library.

### Scenarios Tested:
1.  **isMediaLibraryAvailable**: Verifies that the service correctly detects the presence or absence of the global `wp.media` object.
2.  **selectImage**: Verifies that `wp.media` is invoked with the correct configuration for image selection and that the returned WordPress attachment object is correctly formatted to our internal data structure.
3.  **selectVideo**: Verifies that `wp.media` is invoked with the correct configuration for video selection.
4.  **openMediaLibrary**: Verifies that the promise resolves to `null` if the WordPress media library is not available in the environment.

**Results**: 5/5 tests passed.

## 4. Integration Status

The tutorial services are verified to correctly interface with the expected WordPress global configuration (`window.gotsConfig`) and the WordPress REST API structure. These tests ensure that as the frontend evolves, the core data-fetching and media-handling logic remains reliable within the WordPress environment.

---
**Summary of Test Run (Feb 24, 2026):**
- Total Test Suites: 2
- Total Tests: 16
- Total Passed: 16
- Total Failed: 0
