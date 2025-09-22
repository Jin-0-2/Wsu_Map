// src/app.js

const express = require('express');
const app = express();
const Router = require('./routes/index');
const { initIndoorGraph, initOutdoorGraph } = require('./modules/path/service');
const { requestLogger } = require('./core/logger');
require('dotenv').config();


app.use(express.json());
app.use(requestLogger);
app.use("/", Router);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
  await initIndoorGraph();
  await initOutdoorGraph();

  console.log(`Server running on ${PORT}`);
});
