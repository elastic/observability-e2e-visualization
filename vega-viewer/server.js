// Add this to your vega-viewer/server.js to enable live reload and serve vega spec from input-data
const express = require('express');
const path = require('path');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

const app = express();
const PORT = process.env.PORT || 3000;

// LiveReload server watches vega-viewer, input-data, and vega-spec
const liveReloadServer = livereload.createServer();
liveReloadServer.watch([
  path.join(__dirname),
  path.join(__dirname, '../input-data'),
  path.join(__dirname, '../vega-spec')
]);

// Add livereload middleware
app.use(connectLivereload());

// Serve static files from vega-viewer
app.use(express.static(path.join(__dirname)));


const fs = require('fs');

// Use absolute paths for directories
const vegaSpecDir = path.resolve(__dirname, '../vega-spec');
const inputDataDir = path.resolve(__dirname, '../input-data');

// List available Vega spec files in vega-spec
app.get('/vega-spec-files', (req, res) => {
  fs.readdir(vegaSpecDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Failed to list files' });
      return;
    }
    // Only return .json files (Vega specs)
    const vegaFiles = files.filter(f => f.endsWith('.json'));
    res.json(vegaFiles);
  });
});

// Serve selected Vega spec file from vega-spec (legacy endpoint kept for compatibility)
app.get('/vega-spec', (req, res) => {
  const file = req.query.file;
  if (!file) {
    res.status(400).json({ error: 'No file specified' });
    return;
  }
  const filePath = path.join(vegaSpecDir, file);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
});

// Serve all files from vega-spec and input-data directories as static assets
// Disable caching to make iteration easier during development
app.use('/vega-spec', express.static(vegaSpecDir, { etag: false, maxAge: 0 }));
app.use('/input-data', express.static(inputDataDir, { etag: false, maxAge: 0 }));

// List available input data files
app.get('/input-data-files', (req, res) => {
  fs.readdir(inputDataDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Failed to list input data files' });
      return;
    }
    res.json(files);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Vega Viewer is running at http://localhost:${PORT}`);
});

// Notify browser on changes
liveReloadServer.server.once('connection', () => {
  setTimeout(() => {
    liveReloadServer.refresh('/');
  }, 100);
});
