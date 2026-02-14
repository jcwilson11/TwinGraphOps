const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('TwinGraphOps Frontend Running');
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Frontend running on port 3000');
});
