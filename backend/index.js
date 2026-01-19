require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

// load config from the .env file
const PORT = process.env.PORT || 4000;
const DATA_FILE_PATH = process.env.DATA_FILE_PATH;

// resolve path properly
const dataPath = path.resolve(DATA_FILE_PATH);

// load the data in
let tutorials = [];

if (fs.existsSync(dataPath)) {
  const raw = fs.readFileSync(dataPath);
  tutorials = JSON.parse(raw);
} else {
  tutorials = [];
}

// example route
app.get("/api/tutorials", (req, res) => {
  res.json(tutorials);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using data file: ${DATA_FILE_PATH}`);
});
