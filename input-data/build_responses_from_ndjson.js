const fs = require('fs');
const path = require('path');

const INPUT_EVENTS = path.join(__dirname, 'input.ndjson');
const ASSET_DB = path.join(__dirname, 'asset-db.ndjson');
const ASSET_STATUS = path.join(__dirname, 'asset-status.ndjson');

const OUT_DEP = path.join(__dirname, 'asset-dependencies-responce.json');
const OUT_DB = path.join(__dirname, 'asset-db-response.json');
const OUT_STATUS = path.join(__dirname, 'asset-status-response.json');

function readNdjson(file) {
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

function writeEsResponse(file, hits) {
  const body = {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: hits.length, relation: 'eq' },
      max_score: 1,
      hits
    }
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
}

function buildAssetDbResponse() {
  const docs = readNdjson(ASSET_DB);
  const hits = docs.map((doc, i) => ({
    _index: 'asset-db',
    _id: String(i),
    _score: 1,
    _source: doc
  }));
  writeEsResponse(OUT_DB, hits);
}

function buildAssetStatusResponse() {
  const docs = readNdjson(ASSET_STATUS);
  const hits = docs.map((doc, i) => ({
    _index: 'asset-status',
    _id: String(i),
    _score: 1,
    _source: doc
  }));
  writeEsResponse(OUT_STATUS, hits);
}

function buildDependenciesResponse() {
  const docs = readNdjson(INPUT_EVENTS);
  // Group by session_id
  const bySession = new Map();
  for (const d of docs) {
    const arr = bySession.get(d.session_id) || [];
    arr.push(d);
    bySession.set(d.session_id, arr);
  }
  // For each session, sort by timestamp and build adjacent pairs
  const pairCounts = new Map();
  for (const arr of bySession.values()) {
    arr.sort((a,b)=> new Date(a['@timestamp']) - new Date(b['@timestamp']));
    let prev = null;
    for (const doc of arr) {
      if (prev) {
        const pair = `${prev.asset_id}---${doc.asset_id}`;
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
      prev = doc;
    }
  }
  const hits = [];
  for (const [pair, count] of pairCounts.entries()) {
    hits.push({
      _index: 'asset-dependencies',
      _id: pair,
      _score: 1,
      _source: {
        '@timestamp': { max: { max: null } },
        session_id: { value_count: count },
        asset_pairs: pair
      }
    });
  }
  writeEsResponse(OUT_DEP, hits);
}

function main() {
  buildAssetDbResponse();
  buildAssetStatusResponse();
  buildDependenciesResponse();
  console.log('Refreshed ES-like response JSONs in input-data/.');
}

if (require.main === module) main();
