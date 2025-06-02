const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const servers = JSON.parse(fs.readFileSync(path.join(__dirname, 'servers.json'), 'utf8')).query;

app.get('/mobile_client_ping/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const filtered = servers.filter(server => server.number === id);

  // Return matched server or empty array
  res.json(filtered);
});

app.get('/', (req, res) => {
  res.send('SAMP API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
