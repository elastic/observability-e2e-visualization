#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let stringify = require('json-stringify-pretty-compact');
// Handle ESM default export shape
stringify = stringify && stringify.default ? stringify.default : stringify;

const file = process.argv[2];
const maxLength = Number(process.argv[3] || 120);
const indent = Number(process.argv[4] || 2);

if (!file) {
  console.error('Usage: node tools/format-json-compact.js <file> [maxLength] [indent]');
  process.exit(1);
}

const abs = path.resolve(file);
const src = fs.readFileSync(abs, 'utf8');
const obj = JSON.parse(src);
const out = stringify(obj, { maxLength, indent });
fs.writeFileSync(abs, out + '\n');
console.log(`Formatted ${abs} (maxLength=${maxLength}, indent=${indent})`);
