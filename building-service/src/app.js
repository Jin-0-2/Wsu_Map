// src/app.js

const express = require('express');
const app = express();
const Router = require('./routes/index');
const { initOutdoorGraph } = require('./modules/path/service');

const AWS_IP = `http://13.55.76.216:`

app.use(express.json());
app.use("/", Router);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
