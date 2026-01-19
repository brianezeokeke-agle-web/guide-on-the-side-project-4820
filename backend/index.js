const express = require("express");
const app = express();

//boilerplate listener code to ensure the API is running
app.listen(4000, () => {
  console.log("The server is running on port 4000");
});
