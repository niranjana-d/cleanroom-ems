const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const pool = require("./config/db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Test API
app.get("/", (req, res) => res.send("EMS Backend Running!"));

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));