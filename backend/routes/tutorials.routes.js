console.log("tutorials.routes.js loaded");

//this file owns all the tutorial endpoints, which are mounted in index.js

const express = require("express");
const { v4: uuidv4 } = require("uuid");

//function to create empty slide
function createEmptySlide(order) {
  return {
    slideId: uuidv4(),
    order,
    leftPane: null,
    rightPane: null,
  };
}

const {
  loadTutorials,
  saveTutorials,
} = require("../persistence/tutorialStore");

const router = express.Router();

//get endpoint to load all tutorials
router.get("/", (req, res) => {
  const tutorials = loadTutorials();
  res.json(tutorials);
});

//get endpoint to load a tutorial by id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const tutorials = loadTutorials();

  const tutorial = tutorials.find(
    (t) => t.tutorialId === id
  );

  if (!tutorial) {
    return res.status(404).json({ error: "Tutorial not found." });
  }

  res.json(tutorial);
});


//post endpoint (creates new draft tutorial)
router.post("/", (req, res) => {
  const tutorials = loadTutorials();

  const { title, description } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required." });
  }
  //create new tut and push
  const newTutorial = {
    tutorialId: uuidv4(),
    title,
    description: description || "",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [
        createEmptySlide(1),
        createEmptySlide(2)
    ]
  };

  tutorials.push(newTutorial);
  saveTutorials(tutorials);

  res.status(201).json(newTutorial);
});

//put endpoint to update an existing tutorial
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const updatedTutorial = req.body;

  const tutorials = loadTutorials();
  const index = tutorials.findIndex(
    (t) => t.tutorialId === id
  );

  if (index === -1) {
    return res.status(404).json({ error: "Tutorial not found." });
  }

  // Some fields are immutable and should be preserved as such
  tutorials[index] = {
  ...tutorials[index],
  ...updatedTutorial,
  tutorialId: id,
  createdAt: tutorials[index].createdAt,
  updatedAt: new Date().toISOString(),
};
  saveTutorials(tutorials);

  res.json(tutorials[index]);
});

module.exports = router;
