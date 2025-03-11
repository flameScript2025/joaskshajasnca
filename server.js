const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple status page
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Health check endpoint for monitoring
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

module.exports = app;