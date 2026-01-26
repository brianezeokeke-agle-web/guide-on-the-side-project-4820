require("dotenv").config();

const express = require("express");
const path = require("path");

const { loadTutorials } = require("./persistence/tutorialStore");

const app = express();
app.use(express.json());

//Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// load config from the .env file
const PORT = process.env.PORT || 4000;

// Load tutorials once on startup
let tutorials = loadTutorials();

//mount & use the endpoints
const tutorialRoutes = require("./routes/tutorials.routes");
app.use("/api/tutorials", tutorialRoutes);

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); 
    console.log(`Using data file: ${process.env.DATA_FILE_PATH}`);
  });
}
