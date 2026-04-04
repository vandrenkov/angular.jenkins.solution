'use strict';

const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', service: 'viks-api' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`viks-api listening on ${port}`);
  });
}

module.exports = { server };
