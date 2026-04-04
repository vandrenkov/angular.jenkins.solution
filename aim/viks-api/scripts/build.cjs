'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, 'src', 'index.js'), path.join(dist, 'index.js'));
fs.writeFileSync(path.join(dist, '.build-marker'), `built ${new Date().toISOString()}\n`);
