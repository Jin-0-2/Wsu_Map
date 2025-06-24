// src/app.js

const express = require('express');
const app = express();
const userRouter = require('./routes/index');

app.use(express.json());
app.use("/", userRouter);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
