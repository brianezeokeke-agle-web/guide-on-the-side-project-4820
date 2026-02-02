# Backend Testing Setup and Implementation Log

This document details the steps taken to set up the testing environment for the backend and implement the initial unit tests for the Tutorial endpoints.

## 1. Initial Task Analysis

- **Objective**: Implement initial unit tests for the **Update Endpoint** and **List Endpoint** as per the Sprint 2 tasks.
- **Initial State**: The project contained placeholder test files in `backend/tests/` for `create`, `list`, `retrieve`, and `update`, but none had any implementation. The `package.json` was missing a testing framework.

## 2. Setting Up the Testing Environment

To write and run automated tests, we needed to add a testing framework and an HTTP request library.

### Step 2.1: Install Dependencies

- **Action**: Installed `jest` (a testing framework) and `supertest` (a library for testing HTTP endpoints) as development dependencies.
- **Command**: `npm install --save-dev jest supertest`
- **Result**: These packages were added to the `devDependencies` in `backend/package.json`.

### Step 2.2: Configure `npm test` Script

- **Action**: Added a `test` script to `backend/package.json` to provide a simple command for running the tests.
- **Change**: `"scripts": { "test": "jest" }`

## 3. Resolving Initial Test Failures

Running the tests for the first time revealed several critical configuration issues that needed to be addressed.

### Issue #1: `SyntaxError: Unexpected token 'export'`

- **Problem**: The initial test run failed because Jest could not parse the ES Module (`export`) syntax used by the `uuid` package, which is a project dependency. Jest was running in a CommonJS context and was not configured to transform modules from `node_modules`.
- **Solution**:
    1.  **Install Babel**: We installed `@babel/preset-env` to transpile modern JavaScript syntax into a compatible format.
        - **Command**: `npm install --save-dev @babel/preset-env`
    2.  **Create Babel Config**: A `backend/babel.config.js` file was created to tell Jest to use this preset.
    3.  **Create Jest Config**: A `backend/jest.config.js` file was created to configure `transformIgnorePatterns`. This tells Jest to *not* ignore the `uuid` package during its transformation step, allowing Babel to process it.

### Issue #2: `TypeError: app.address is not a function`

- **Problem**: After fixing the syntax error, a new error appeared. This was because `supertest` requires the raw Express `app` object to work with, but our `backend/index.js` was immediately starting the server with `app.listen()`. When the test file imported the app, it was also trying to start the server, which interfered with the test runner's lifecycle.
- **Solution**:
    - **Refactor `backend/index.js`**: The `index.js` file was modified to separate the server startup logic from the Express app configuration. The `app` object is now exported, and `app.listen()` is only called if the file is run directly (not when it's imported by another file like a test).

## 4. Implementing Unit Tests

With the testing environment fully configured and stable, we proceeded to implement the unit tests for the assigned endpoints.

### Task 1: Update Endpoint (`PUT /api/tutorials/:id`)

- **File**: `backend/tests/tutorials.update.test.js`
- **Implementation**:
    - Mocked the `loadTutorials` and `saveTutorials` functions from `tutorialStore.js` to prevent tests from interacting with the actual file system and to control test data.
    - Wrote 3 tests to cover:
        1.  A successful update, returning a `200 OK` status.
        2.  A `404 Not Found` error when trying to update a non-existent tutorial.
        3.  Ensuring that immutable fields (`tutorialId`, `createdAt`) are not changed on update.
- **Refinement**: The initial test for `updatedAt` was flaky. It was improved to check that the new timestamp was a valid ISO 8601 string and that it was chronologically later than the original timestamp.
- **Result**: All tests for the Update Endpoint now pass.

### Task 2: List Endpoint (`GET /api/tutorials`)

- **File**: `backend/tests/tutorials.list.test.js`
- **Implementation**:
    - Wrote 2 tests to cover:
        1.  Returning an empty array with a `200 OK` status when no tutorials exist.
        2.  Returning a full list of tutorials with a `200 OK` status when tutorials do exist.
- **Result**: All tests for the List Endpoint now pass.

### Task 3: Create Endpoint (`POST /api/tutorials`)

- **File**: `backend/tests/tutorials.create.test.js`
- **Implementation**:
    - Wrote 4 tests to cover:
        1.  Successful creation of a new tutorial with a title and description, returning `201 Created`.
        2.  A `400 Bad Request` error when the `title` is missing.
        3.  A `400 Bad Request` error when the `title` is just whitespace.
        4.  Successful creation when an optional `description` is not provided.
- **Result**: All tests for the Create Endpoint now pass.

### How `create.test.js` script works:

The `create.test.js` script is a unit test file built using **Jest** and **Supertest** to verify the functionality of your `POST /api/tutorials` endpoint.

1.  **Setup and Mocks (`jest.mock`):**
    *   `jest.mock('../persistence/tutorialStore', ...)` creates a fake version of your `tutorialStore.js` module. This is crucial for test isolation, preventing actual file system operations. It allows us to control what `loadTutorials()` returns and to check if `saveTutorials()` was called, without affecting real data.

2.  **Test Suite (`describe` block):**
    *   `describe('POST /api/tutorials', ...)` groups all the tests related to this specific API endpoint, organizing the test output.

3.  **Before Each Test (`beforeEach`):**
    *   `beforeEach` runs a setup function *before every single test* within the `describe` block. This ensures each test starts from a clean slate by clearing mock calls and resetting mock data (`mockTutorials = []`).

4.  **Individual Test Cases (`test` blocks):**
    *   Each `test('should do X when Y', async () => { ... })` block defines a specific scenario.
    *   **Arrange:** We "arrange" the scenario, defining data like `newTutorialData`.
    *   **Act:** We "act" by simulating an action using `supertest`. For instance, `await request(app).post('/api/tutorials').send(newTutorialData)` simulates a client sending an HTTP `POST` request to your Express application (`app`) with `newTutorialData` in the body.
    *   **Assert:** Finally, we "assert" (check) the outcome using Jest's `expect` function. This includes verifying HTTP status codes (`expect(res.statusCode).toEqual(201)`), response body content (`expect(res.body.tutorialId).toBeDefined()`), and mock function calls (`expect(saveTutorials).toHaveBeenCalledTimes(1)`).

The script thus simulates user actions and verifies backend responses without side effects.

### Test Run After Implementing Create Endpoint Tests:

After implementing the tests for the Create Endpoint, we ran all unit tests.
- **Command**: `npm test`
- **Output Summary**:
    ```
    PASS  tests/tutorials.list.test.js
    PASS  tests/tutorials.update.test.js
    PASS  tests/tutorials.create.test.js
    FAIL  tests/tutorials.retrieve.test.js
    Test Suites: 1 failed, 3 passed, 4 total
    Tests:       9 passed, 9 total
    ```
- **Result**: The `tutorials.create.test.js` suite passed all its 4 tests. The previously implemented `list` and `update` tests also continued to pass. The only remaining failure was from `tutorials.retrieve.test.js`, which is still an empty placeholder.

### Task 4: Retrieve Endpoint (`GET /api/tutorials/:id`)

- **File**: `backend/tests/tutorials.retrieve.test.js`
- **Implementation**:
    - Wrote 2 tests to cover:
        1.  Returning the correct tutorial object with a `200 OK` status when a valid `tutorialId` is provided.
        2.  Returning a `404 Not Found` error and an appropriate message when an invalid or non-existent `tutorialId` is provided.
- **Result**: All tests for the Retrieve Endpoint now pass.

### How `retrieve.test.js` script works:

The `retrieve.test.js` script, similar to the other test files, uses **Jest** and **Supertest** to verify the functionality of your `GET /api/tutorials/:id` endpoint.

1.  **Setup and Mocks (`jest.mock`):**
    *   `jest.mock('../persistence/tutorialStore', ...)` is used to mock the `tutorialStore.js` module. For retrieve tests, this means we control the array of tutorials that `loadTutorials()` will return, allowing us to simulate having specific tutorials in storage without touching the actual file system.

2.  **Test Suite (`describe` block):**
    *   `describe('GET /api/tutorials/:id', ...)` groups all the tests specifically for retrieving a single tutorial by its ID.

3.  **Before Each Test (`beforeEach`):**
    *   `beforeEach` runs before each test. It clears previous mock calls and sets up `mockTutorials` (e.g., two predefined tutorial objects) which `loadTutorials()` is then mocked to return. This ensures each test has a consistent, known set of data to work with.

4.  **Individual Test Cases (`test` blocks):**
    *   **"should return the correct tutorial if ID is valid"**:
        *   **Arrange:** A `validId` from our `mockTutorials` is selected. `loadTutorials` is set to return `mockTutorials`.
        *   **Act:** `await request(app).get('/api/tutorials/${validId}')` simulates a `GET` request for that specific ID.
        *   **Assert:** `expect(res.statusCode).toEqual(200)` checks for a successful response, and `expect(res.body).toEqual(mockTutorials[0])` verifies that the returned JSON matches the expected tutorial object. `expect(loadTutorials).toHaveBeenCalledTimes(1)` confirms the data was loaded.

    *   **"should return 404 if tutorial ID is not found"**:
        *   **Arrange:** An `invalidId` that does not exist in `mockTutorials` is chosen.
        *   **Act:** A `GET` request is simulated using this `invalidId`.
        *   **Assert:** `expect(res.statusCode).toEqual(404)` checks for a "Not Found" error, and `expect(res.body).toEqual({ error: 'Tutorial not found.' })` verifies the specific error message. `expect(loadTutorials).toHaveBeenCalledTimes(1)` ensures the loading attempt occurred.

This script effectively validates that the retrieve endpoint behaves correctly both when a tutorial is found and when it is not.

### Final Test Run (All Endpoints Pass):

After implementing the tests for the Retrieve Endpoint, we ran all unit tests for the backend:
- **Command**: `npm test`
- **Output Summary**:
    ```
    PASS  tests/tutorials.list.test.js
    PASS  tests/tutorials.retrieve.test.js
    PASS  tests/tutorials.create.test.js
    PASS  tests/tutorials.update.test.js
    Test Suites: 4 passed, 4 total
    Tests:       11 passed, 11 total
    Snapshots:   0 total
    Time:        X.XXX s
    ```
- **Result**: All 4 test suites (`create`, `retrieve`, `list`, `update`) passed, with a total of 11 passing tests. This confirms that all core tutorial API endpoints are now covered by working unit tests.
