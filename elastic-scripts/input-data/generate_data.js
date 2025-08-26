const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- Configuration ---
const TOTAL_COUNT = 1000;
const SESSION_ID_CARDINALITY = TOTAL_COUNT / 4;
const ASSET_ID_CARDINALITY = 40;
const OUTPUT_FILE = './input.ndjson';

// --- Data Generation ---

// 1. Generate unique session_ids and asset_ids
const sessionIds = Array.from({ length: SESSION_ID_CARDINALITY }, () => uuidv4());
const assetIds = Array.from({ length: ASSET_ID_CARDINALITY }, (_, i) => `asset-${i}`);

// 3. Generate the events
const allEvents = [];
for (let i = 0; i < TOTAL_COUNT; i++) {
    const chosenAssetId = assetIds[Math.floor(Math.random() * assetIds.length)];
    const chosenSessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

    const event = {
        "@timestamp": randomDate.toISOString(),
        "session_id": chosenSessionId,
        "asset_id": chosenAssetId,
    };
    allEvents.push(event);
}

// 4. Write to NDJSON file
const stream = fs.createWriteStream(OUTPUT_FILE);
stream.on('error', (err) => {
    console.error('Error writing to file:', err);
});


allEvents.forEach(event => {
    stream.write(JSON.stringify(event) + '\n');
});

stream.end();

console.log(`Successfully generated ${allEvents.length} events in ${OUTPUT_FILE}`);
