const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Files
const OUTPUT_FILE = path.join(__dirname, 'input.ndjson');
const ASSET_DB_FILE = path.join(__dirname, 'asset-db.ndjson');
const ASSET_STATUS_FILE = path.join(__dirname, 'asset-status.ndjson');
const CONFIG_FILE = path.join(__dirname, 'generator.config.json');

// Load config
function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.warn('No config found or invalid JSON, using defaults:', e.message);
        return {
            counts: { frontends: 4, services: 30, databases: 8 },
            layers: { L1: 6, L2: 18, L3: 6 },
            hotspots: { count: 3, weightBoost: 3.5 },
            sessions: { total: 20000, seed: 42, perFrontendSkew: 0.6 },
            probabilities: { straight: 0.6, fanOut: 0.3, fanIn: 0.1, svcToSvcExtra: 0.15 },
            latencyMs: { L0_L1: [50,150], L1_L2: [20,200], L2_L3: [10,120], L3_DB: [5,40] },
            errors: { rate: 0.015 },
            constraints: { maxOutDegree: 3, crossDomainPct: 0.08 }
        };
    }
}

// PRNG for reproducibility
function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function choiceWeighted(rng, items, weights) {
    const total = weights.reduce((a,b)=>a+b,0);
    const target = rng() * total;
    let c = 0;
    for (let i=0;i<items.length;i++) {
        c += weights[i];
        if (target <= c) return items[i];
    }
    return items[items.length-1];
}

function randInt(rng, min, max) { // inclusive
    return Math.floor(rng() * (max - min + 1)) + min;
}

function randInRange(rng, min, max, decimals = 1) {
    return +(rng() * (max - min) + min).toFixed(decimals);
}

function pickDistinct(rng, arr, k) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, k);
}

// Naming helpers
const DOMAINS = ['Finance','CRM','Analytics','Payments','Compliance'];
const FRONTEND_PREFIXES = ['web', 'mobile', 'portal', 'spa'];
const SERVICE_PREFIXES = ['auth','orders','payments','users','search','report','audit','ledger','inventory','catalog','profile','notify','gateway','api','calc'];
const DB_PREFIXES = ['orders','users','ledger','crm','audit','events','inventory','catalog'];

function genHostname(name, idx) { return `${name}-${(idx%3)+1}.corp.local`; }
function genIP(idx) { return `10.${(idx%256)}.${(idx*3)%256}.${(idx*7)%256}`; }

function getStatusColor(details) {
    if (details.some(d => d.color === 'red')) return 'red';
    if (details.some(d => d.color === 'orange')) return 'orange';
    return 'green';
}

function generateKpiDetails(rng, idx) {
    return [
        { key: 'KPI1', value: randInRange(rng, 70, 100, 1) - (idx % 10), color: (idx % 11 === 0 ? 'orange' : 'green') },
        { key: 'KPI2', value: randInRange(rng, 5, 10, 1) - (idx % 5) * 0.2, color: (idx % 13 === 0 ? 'orange' : 'green') },
        { key: 'Uptime', value: randInRange(rng, 90, 100, 1) - (idx % 7) * 0.5, color: 'green' },
        { key: 'Errors', value: randInRange(rng, 0, 1.5, 2) + (idx % 4) * 0.1, color: (idx % 17 === 0 ? 'orange' : 'green') }
    ];
}

function main() {
    const cfg = loadConfig();
    const rng = mulberry32(cfg.sessions?.seed ?? 42);

    const totalAssets = cfg.counts.frontends + cfg.counts.services + cfg.counts.databases;
    const assetIds = Array.from({ length: totalAssets }, (_, i) => `asset-${i}`);

    // Build layered asset catalog
    const assets = [];
    let idx = 0;

    // Frontends (L0)
    for (let i=0;i<cfg.counts.frontends;i++, idx++) {
        const name = `${FRONTEND_PREFIXES[i % FRONTEND_PREFIXES.length]}-fe-${i+1}`;
        assets.push({
            asset_id: assetIds[idx],
            layer: 0,
            type: 'frontend',
            name,
            domain: DOMAINS[i % DOMAINS.length],
            env: 'prod',
            host: genHostname('fe', i),
            ip: genIP(idx)
        });
    }

    // Services (L1..L3)
    const L1 = cfg.layers.L1, L2 = cfg.layers.L2, L3 = cfg.layers.L3;
    const svcPerLayer = [L1, L2, L3];
    for (let layerIdx=0; layerIdx<svcPerLayer.length; layerIdx++) {
        const count = svcPerLayer[layerIdx];
        for (let i=0;i<count;i++, idx++) {
            const p = SERVICE_PREFIXES[(i + layerIdx*7) % SERVICE_PREFIXES.length];
            const name = `svc-${p}-${layerIdx+1}-${i+1}`;
            assets.push({
                asset_id: assetIds[idx],
                layer: layerIdx+1,
                type: 'service',
                name,
                domain: DOMAINS[(i + layerIdx) % DOMAINS.length],
                env: 'prod',
                host: genHostname(p, i),
                ip: genIP(idx)
            });
        }
    }

    // Databases (L4)
    for (let i=0;i<cfg.counts.databases;i++, idx++) {
        const p = DB_PREFIXES[i % DB_PREFIXES.length];
        const name = `db-${p}-${i+1}`;
        assets.push({
            asset_id: assetIds[idx],
            layer: 4,
            type: 'database',
            name,
            domain: DOMAINS[i % DOMAINS.length],
            env: 'prod',
            host: genHostname('db', i),
            ip: genIP(idx)
        });
    }

    // Hotspots among services
    const serviceAssets = assets.filter(a => a.type === 'service');
    const hotspotCount = Math.min(cfg.hotspots.count, serviceAssets.length);
    const hotspotIdxs = pickDistinct(rng, serviceAssets.map((_,i)=>i), hotspotCount);
    const hotspots = hotspotIdxs.map(i => serviceAssets[i]);
    const hotspotIds = new Set(hotspots.map(h => h.asset_id));

    // Prepare choices per layer for routing
    const byLayer = new Map();
    for (const a of assets) {
        if (!byLayer.has(a.layer)) byLayer.set(a.layer, []);
        byLayer.get(a.layer).push(a);
    }

    // Build a deterministic routing map so sessions reuse the same edges
    const nextMap = new Map(); // asset_id -> next asset
    function weightedPick(list) {
        if (!list || list.length === 0) return null;
        const weights = list.map(c => hotspotIds.has(c.asset_id) ? cfg.hotspots.weightBoost : 1);
        return choiceWeighted(rng, list, weights);
    }

    // FE -> L1
    const L1Assets = byLayer.get(1) || [];
    for (const fe of byLayer.get(0) || []) {
        const n = weightedPick(L1Assets);
        if (n) nextMap.set(fe.asset_id, n.asset_id);
    }
    // L1 -> L2
    const L2Assets = byLayer.get(2) || [];
    for (const s of byLayer.get(1) || []) {
        const n = weightedPick(L2Assets);
        if (n) nextMap.set(s.asset_id, n.asset_id);
    }
    // L2 -> L3
    const L3Assets = byLayer.get(3) || [];
    for (const s of byLayer.get(2) || []) {
        const n = weightedPick(L3Assets);
        if (n) nextMap.set(s.asset_id, n.asset_id);
    }
    // L3 -> DB (L4)
    const DBAssets = byLayer.get(4) || assets.filter(a => a.type === 'database');
    for (const s of byLayer.get(3) || []) {
        const n = weightedPick(DBAssets);
        if (n) nextMap.set(s.asset_id, n.asset_id);
    }

    function nextFromRouting(current) {
        const nextId = nextMap.get(current.asset_id);
        if (!nextId) return null;
        return assets.find(a => a.asset_id === nextId) || null;
    }

    // Session generation
    const sessionsTotal = cfg.sessions.total;
    const frontends = assets.filter(a => a.type === 'frontend');
    const events = [];
    const baseStart = Date.now() - 7*24*3600*1000; // within last 7 days
    const latencyCfg = cfg.latencyMs;

    function latencyForHop(fromLayer, toLayer) {
        if (fromLayer===0 && toLayer===1) return randInt(rng, latencyCfg.L0_L1[0], latencyCfg.L0_L1[1]);
        if (fromLayer===1 && toLayer===2) return randInt(rng, latencyCfg.L1_L2[0], latencyCfg.L1_L2[1]);
        if (fromLayer===2 && toLayer===3) return randInt(rng, latencyCfg.L2_L3[0], latencyCfg.L2_L3[1]);
        if (fromLayer===3 && toLayer===4) return randInt(rng, latencyCfg.L3_DB[0], latencyCfg.L3_DB[1]);
        return randInt(rng, 10, 50);
    }

    function emitEvent(ts, sessionId, asset) {
        events.push({
            '@timestamp': new Date(ts).toISOString(),
            session_id: sessionId,
            asset_id: asset.asset_id
        });
    }

    // Skew frontends distribution
    const feWeights = frontends.map((_,i)=> Math.pow(1.0/(i+1), cfg.sessions.perFrontendSkew));

    for (let s=0; s<sessionsTotal; s++) {
        const sessionId = uuidv4();
        // random day/time start
        const startTs = baseStart + Math.floor(rng() * (7*24*3600*1000));

        // choose frontend
        const fe = choiceWeighted(rng, frontends, feWeights);
        let ts = startTs;
        let hop = 0;
        emitEvent(ts, sessionId, fe);

        // L0 -> L1 (deterministic)
        const l1 = nextFromRouting(fe);
        if (!l1) continue;
        ts += latencyForHop(fe.layer, l1.layer);
        emitEvent(ts, sessionId, l1);

        // L1 -> L2 (single hop)
        const l2 = nextFromRouting(l1);
        if (!l2) continue;
        ts += latencyForHop(l1.layer, l2.layer);
        emitEvent(ts, sessionId, l2);

        // L2 -> L3 (single hop)
        const l3 = nextFromRouting(l2);
        if (l3) {
            ts += latencyForHop(l2.layer, l3.layer);
            emitEvent(ts, sessionId, l3);
        }

        // Next -> DB (ensure final hop to a database)
        const from = l3 || l2;
        const db = nextFromRouting(from) || weightedPick(DBAssets);
        if (db) {
            ts += latencyForHop(from.layer, 4);
            emitEvent(ts, sessionId, db);
        }
    }

    // Write input.ndjson
    const stream = fs.createWriteStream(OUTPUT_FILE);
    stream.on('error', (err) => console.error('Error writing to file:', err));
    for (const e of events) stream.write(JSON.stringify(e) + '\n');
    stream.end();

    // Write asset-db.ndjson and asset-status.ndjson to align with current Vega lookups
    const assetDbStream = fs.createWriteStream(ASSET_DB_FILE);
    const assetStatusStream = fs.createWriteStream(ASSET_STATUS_FILE);

    assets.forEach((a, i) => {
        // asset-db: keep fields: asset_id, service, application, domain
        const application = a.type === 'database' ? `${a.name.replace(/^db-/, '')}-DB` : `${a.name}`;
        const service = a.type === 'service' ? a.name : (a.type === 'frontend' ? `${a.name}` : a.name);
    // add layer to support left-to-right layout in Vega
    const assetDbEntry = { asset_id: a.asset_id, service, application, domain: a.domain, layer: a.layer };
        assetDbStream.write(JSON.stringify(assetDbEntry) + '\n');

        // status
        const details = generateKpiDetails(rng, i);
        const statusColor = getStatusColor(details);
        const assetStatusEntry = { asset_id: a.asset_id, details, statusColor };
        assetStatusStream.write(JSON.stringify(assetStatusEntry) + '\n');
    });

    assetDbStream.end();
    assetStatusStream.end();

    console.log(`Successfully generated ${events.length} events in ${OUTPUT_FILE}`);
    console.log(`Successfully generated ${assets.length} assets in ${ASSET_DB_FILE} and ${ASSET_STATUS_FILE}`);
}

main();
