'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { server } = require('../src/index.js');

test('GET /health returns JSON status ok', async () => {
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      try {
        const { port } = server.address();
        http.get(`http://127.0.0.1:${port}/health`, (res) => {
          assert.strictEqual(res.statusCode, 200);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            assert.strictEqual(body.status, 'ok');
            assert.strictEqual(body.service, 'viks-api');
            server.close(() => resolve());
          });
        }).on('error', reject);
      } catch (e) {
        server.close(() => reject(e));
      }
    });
  });
});
