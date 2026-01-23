//persistence layer that knows where the data file is at, and loads in tutorial data from disk
//and saves it back to the disk
//this layer abstracts all fs logic from the rest of the app

const fs = require("fs");
const path = require("path");

// Resolve the data file path once
const DATA_FILE_PATH = process.env.DATA_FILE_PATH
  ? path.resolve(process.env.DATA_FILE_PATH)
  : null;

if (!DATA_FILE_PATH) {
  throw new Error("DATA_FILE_PATH is not defined in environment variables.");
}

/**
 * loads all the tutorials from disk
 * @returns {Array}
 */
function loadTutorials() {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load tutorials:", err);
    return [];
  }
}

/**
 * persist the tutorials to the disk
 * @param {Array} tutorials
 */
function saveTutorials(tutorials) {
  try {
    fs.writeFileSync(
      DATA_FILE_PATH,
      JSON.stringify(tutorials, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to save tutorials:", err);
    throw err;
  }
}

//export the necessary modules
module.exports = {
  loadTutorials,
  saveTutorials,
};
