const express = require('express');
const app = express();
const helloRouter = require('./routes/hello');
const byeRouter = require('./routes/bye');

app.use(express.json());
app.use('/hello', helloRouter);
app.use('/bye', byeRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
