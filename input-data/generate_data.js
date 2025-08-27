const fs = require('fs');
const { v4: uuidv4 } = require('uuid');


// --- Configuration ---
const TOTAL_COUNT = 2000;
const SESSION_ID_CARDINALITY = TOTAL_COUNT / 4;
const ASSET_ID_CARDINALITY = 80;
const path = require('path');
const OUTPUT_FILE = path.join(__dirname, 'input.ndjson');
const ASSET_DB_FILE = path.join(__dirname, 'asset-db.ndjson');
const ASSET_STATUS_FILE = path.join(__dirname, 'asset-status.ndjson');

// --- Data Generation ---


// 1. Generate unique session_ids and asset_ids
const sessionIds = Array.from({ length: SESSION_ID_CARDINALITY }, () => uuidv4());
const assetIds = Array.from({ length: ASSET_ID_CARDINALITY }, (_, i) => `asset-${i}`);

// 2. Generate plausible application, domain, and KPI values
const APPLICATIONS = [
    'Ledger-App', 'Cust-App', 'Report-App', 'Bank-App', 'Audit-App', 'Mortgage-App', 'Lending-App', 'Customer-DB', 'Account-DB', 'Loan-DB'
];
const DOMAINS = [
    'Finance', 'CRM', 'Analytics', 'Payments', 'Compliance'
];
const KPI_KEYS = [
    'KPI1', 'KPI2', 'Uptime', 'Errors'
];
const KPI_COLORS = ['green', 'orange', 'red'];

function getDeterministicValue(arr, idx) {
    return arr[idx % arr.length];
}

function randomInRange(min, max, decimals = 1) {
    return +(Math.random() * (max - min) + min).toFixed(decimals);
}

function generateKpiDetails(idx) {
    // Use idx to make values deterministic per asset
    return [
        {
            key: 'KPI1',
            value: randomInRange(70, 100, 1) - idx % 10,
            color: getDeterministicValue(KPI_COLORS, idx % 3 === 0 ? 1 : 0)
        },
        {
            key: 'KPI2',
            value: randomInRange(5, 10, 1) - (idx % 5) * 0.2,
            color: getDeterministicValue(KPI_COLORS, idx % 5 === 0 ? 1 : 0)
        },
        {
            key: 'Uptime',
            value: randomInRange(90, 100, 1) - (idx % 7) * 0.5,
            color: 'green'
        },
        {
            key: 'Errors',
            value: randomInRange(0, 1.5, 2) + (idx % 4) * 0.1,
            color: idx % 8 === 0 ? 'orange' : 'green'
        }
    ];
}

function getStatusColor(details) {
    // If any KPI is red, status is red; if any is orange, status is orange; else green
    if (details.some(d => d.color === 'red')) return 'red';
    if (details.some(d => d.color === 'orange')) return 'orange';
    return 'green';
}

function getService(application) {
    const prefix = application.split('-')[0];
    const randomNumber = Math.floor(Math.random() * 10);

    return `${prefix}Service-API${randomNumber}`;
}


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

// 4. Write to NDJSON files
const stream = fs.createWriteStream(OUTPUT_FILE);
stream.on('error', (err) => {
    console.error('Error writing to file:', err);
});

allEvents.forEach(event => {
    stream.write(JSON.stringify(event) + '\n');
});
stream.end();

// 5. Write asset-db.ndjson and asset-status.ndjson
const assetDbStream = fs.createWriteStream(ASSET_DB_FILE);
const assetStatusStream = fs.createWriteStream(ASSET_STATUS_FILE);

assetIds.forEach((assetId, idx) => {
    const application = getDeterministicValue(APPLICATIONS, idx);
    const service = getService(application)
    const domain = getDeterministicValue(DOMAINS, idx);
    // asset-db.ndjson
    const assetDbEntry = {
        asset_id: assetId,
        service: service,
        application: application,
        domain: domain
    };
    assetDbStream.write(JSON.stringify(assetDbEntry) + '\n');

    // asset-status.ndjson
    const details = generateKpiDetails(idx);
    const statusColor = getStatusColor(details);
    const assetStatusEntry = {
        asset_id: assetId,
        details,
        statusColor
    };
    assetStatusStream.write(JSON.stringify(assetStatusEntry) + '\n');
});

assetDbStream.end();
assetStatusStream.end();

console.log(`Successfully generated ${allEvents.length} events in ${OUTPUT_FILE}`);
console.log(`Successfully generated ${assetIds.length} assets in ${ASSET_DB_FILE} and ${ASSET_STATUS_FILE}`);
