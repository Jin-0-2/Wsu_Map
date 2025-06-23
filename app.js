const express = require('express');
const app = express();
const helloRouter = require('./routes/hello');
const byeRouter = require('./routes/bye');

// DB연결
const db = require('./db');

app.use(express.json());
app.use('/hello', helloRouter);
app.use('/bye', byeRouter);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
