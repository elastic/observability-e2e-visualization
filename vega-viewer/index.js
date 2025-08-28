/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Since vega-embed is loaded from a script tag in index.html, 
// we can use it directly

async function fetchVegaSpecFiles() {
  const res = await fetch('/vega-spec-files');
  if (!res.ok) return [];
  return res.json();
}

let currentSpec = {};
let currentView = null;
let dataInspectorListeners = null; // Store listener references for cleanup

async function fetchAndRenderVegaSpec(file) {
  const visContainer = document.getElementById('vis');
  const inspectorPanel = document.getElementById('inspector-panel');
  const toggleButton = document.getElementById('inspector-toggle');
  const dataSelector = document.getElementById('data-selector');
  const dataDisplay = document.getElementById('data-display')?.querySelector('code');

  if (!visContainer || !inspectorPanel || !toggleButton || !dataSelector || !dataDisplay) {
    console.error('One or more required UI elements are missing.');
    return;
  }

  // Reset state
  currentView = null;
  
  // Clean up existing event listeners
  if (dataInspectorListeners) {
    if (dataInspectorListeners.toggleListener) {
      toggleButton.removeEventListener('click', dataInspectorListeners.toggleListener);
    }
    if (dataInspectorListeners.selectorListener) {
      dataSelector.removeEventListener('change', dataInspectorListeners.selectorListener);
    }
    if (dataInspectorListeners.refreshListener) {
      const refreshBtn = document.getElementById('refresh-data-btn');
      if (refreshBtn) {
        refreshBtn.removeEventListener('click', dataInspectorListeners.refreshListener);
      }
    }
    dataInspectorListeners = null;
  }
  
  dataSelector.innerHTML = '';
  dataDisplay.textContent = '';
  inspectorPanel.hidden = true;
  toggleButton.setAttribute('aria-expanded', 'false');
  toggleButton.textContent = 'Inspect Data';

  try {
    const specResponse = await fetch(`/vega-spec?file=${encodeURIComponent(file)}`);
    if (!specResponse.ok) {
      throw new Error(`HTTP error! status: ${specResponse.status}`);
    }
    const vegaSpec = await specResponse.json();
    currentSpec = vegaSpec; // Store the current spec
    
    console.log('Loaded Vega spec:', vegaSpec);
    console.log('Data sources in spec:', vegaSpec.data?.map(d => d.name) || 'No data sources found');
    
    visContainer.innerHTML = '';
    const result = await vegaEmbed('#vis', vegaSpec, { actions: false });
    currentView = result.view; // Store the current view globally
    
    // Wait for the view to be fully rendered before initializing inspector
    await new Promise(resolve => {
      currentView.runAsync().then(() => {
        console.log('Vega chart initial render completed.');
        // Wait a bit more for data transformations to complete
        setTimeout(() => {
          console.log('Additional wait completed, checking data availability...');
          // Test if we can access data
          try {
            const testData = currentView.data();
            console.log('Data check - available datasets:', Object.keys(testData));
            resolve();
          } catch (e) {
            console.warn('Data not ready yet, but continuing:', e.message);
            resolve();
          }
        }, 500); // Wait 500ms for data transformations
      }).catch(renderError => {
        console.warn('Error during chart rendering, but continuing:', renderError);
        resolve(); // Continue anyway
      });
    });

    // Initialize data inspector after successful render
    initializeDataInspector();

  } catch (error) {
    console.error('Error loading or rendering Vega chart:', error);
    visContainer.innerHTML = `<p style="color: red; padding: 1rem;">Failed to load chart: ${error.message}<br><br>Details: ${error.stack || 'No additional details'}<br><br>See browser console for more information.</p>`;
    // Clear inspector state on error
    currentView = null;
    const dataSelector = document.getElementById('data-selector');
    const dataDisplay = document.getElementById('data-display')?.querySelector('code');
    if (dataSelector) dataSelector.innerHTML = '';
    if (dataDisplay) dataDisplay.textContent = 'Chart failed to load. Cannot inspect data.';
  }
}

function initializeDataInspector() {
  const inspectorPanel = document.getElementById('inspector-panel');
  const toggleButton = document.getElementById('inspector-toggle');
  const dataSelector = document.getElementById('data-selector');
  const dataDisplay = document.getElementById('data-display')?.querySelector('code');

  if (!currentView || !currentSpec || !dataSelector || !dataDisplay) {
    console.warn('Cannot initialize data inspector: missing view or DOM elements');
    if (dataDisplay) {
      dataDisplay.textContent = 'Data inspector unavailable: visualization not properly loaded.';
    }
    return;
  }

  // --- Data Inspector Logic ---
  const updateDataDisplay = () => {
    const selectedDataName = dataSelector.value;
    if (!selectedDataName) {
      dataDisplay.textContent = 'No data source selected.';
      return;
    }
    
    if (!currentView) {
      dataDisplay.textContent = 'Visualization not available. Cannot fetch data.';
      return;
    }

    try {
      console.log(`Attempting to fetch data for: ${selectedDataName}`);
      console.log('Current view state:', currentView);
      
      // Try different approaches to get the data
      let data = null;
      let dataFound = false;
      
      try {
        // Method 1: Direct data access
        data = currentView.data(selectedDataName);
        dataFound = true;
        console.log(`Method 1 - Direct access: ${data ? data.length : 'null'} records`);
      } catch (e1) {
        console.log(`Method 1 failed: ${e1.message}`);
        
        try {
          // Method 2: Get all data and find the specific dataset
          const allData = currentView.data();
          console.log('All available datasets:', Object.keys(allData));
          if (allData[selectedDataName]) {
            data = allData[selectedDataName];
            dataFound = true;
            console.log(`Method 2 - Found in all data: ${data ? data.length : 'null'} records`);
          }
        } catch (e2) {
          console.log(`Method 2 failed: ${e2.message}`);
        }
      }
      
      if (dataFound && data) {
        if (Array.isArray(data) && data.length > 0) {
          console.log(`Successfully fetched ${data.length} records for ${selectedDataName}`);
          dataDisplay.textContent = JSON.stringify(data, null, 2);
        } else if (Array.isArray(data) && data.length === 0) {
          dataDisplay.textContent = `Data source "${selectedDataName}" exists but contains no data (empty array).`;
        } else {
          // Non-array data
          console.log(`Non-array data found for ${selectedDataName}:`, typeof data);
          dataDisplay.textContent = JSON.stringify(data, null, 2);
        }
      } else {
        // Try to show debug information
        try {
          const allData = currentView.data();
          const availableKeys = Object.keys(allData);
          console.log('Available data sources:', availableKeys);
          dataDisplay.textContent = `No data found for "${selectedDataName}".\n\nAvailable data sources: ${availableKeys.join(', ')}\n\nTip: Try the debug option to see all data.`;
        } catch (debugError) {
          console.error('Debug error:', debugError);
          dataDisplay.textContent = `No data found for "${selectedDataName}". Debug info unavailable.\n\nError: ${debugError.message}`;
        }
      }
    } catch (e) {
      console.error('Error fetching data:', e);
      dataDisplay.textContent = `Error accessing data for "${selectedDataName}": ${e.message}\n\nThis might indicate the visualization hasn't fully loaded yet. Try again in a moment.`;
    }
  };

  // Populate the dropdown with data source names from the spec
  try {
    dataSelector.innerHTML = '<option value="">Select a data source...</option>';
    
    if (currentSpec.data && Array.isArray(currentSpec.data)) {
      console.log('Populating data selector with sources:', currentSpec.data.map(d => d.name));
      currentSpec.data.forEach((source) => {
        if (source.name) {
          const option = document.createElement('option');
          option.value = source.name;
          option.textContent = source.name;
          dataSelector.appendChild(option);
        }
      });
      
      // Add debug option to show all available data in the view
      if (currentView) {
        const debugOption = document.createElement('option');
        debugOption.value = '__DEBUG_ALL__';
        debugOption.textContent = '🔍 Debug: Show all available data';
        dataSelector.appendChild(debugOption);
      }
    } else {
      console.warn('No data sources found in spec');
      dataDisplay.textContent = 'No data sources found in the Vega specification.';
    }

    // Store reference to the current data selector and add event listener
    const currentDataSelector = document.getElementById('data-selector');
    
    // Create event listener function
    const handleDataSelectorChange = (e) => {
      const selectedValue = e.target.value;
      if (selectedValue === '__DEBUG_ALL__') {
        // Debug mode: show all available data sources
        try {
          const allData = {};
          if (currentView && currentSpec.data) {
            currentSpec.data.forEach(source => {
              if (source.name) {
                try {
                  allData[source.name] = currentView.data(source.name);
                } catch (err) {
                  allData[source.name] = `Error: ${err.message}`;
                }
              }
            });
          }
          document.getElementById('data-display').querySelector('code').textContent = 
            JSON.stringify(allData, null, 2);
        } catch (debugError) {
          document.getElementById('data-display').querySelector('code').textContent = 
            `Debug error: ${debugError.message}`;
        }
      } else {
        updateDataDisplay();
      }
    };
    
    // Add event listener
    currentDataSelector.addEventListener('change', handleDataSelectorChange);
    
    // Store listener reference for cleanup
    if (!dataInspectorListeners) dataInspectorListeners = {};
    dataInspectorListeners.selectorListener = handleDataSelectorChange;

  } catch (e) {
    console.error('Error populating data selector:', e);
    if (dataDisplay) {
      dataDisplay.textContent = `Error initializing data inspector: ${e.message}`;
    }
  }

  // Initialize toggle button functionality
  const handleToggle = () => {
    const isHidden = inspectorPanel.hidden;
    inspectorPanel.hidden = !isHidden;
    toggleButton.setAttribute('aria-expanded', String(isHidden));
    toggleButton.textContent = isHidden ? 'Hide Inspector' : 'Inspect Data';
    if (isHidden) {
      updateDataDisplay();
    }
  };

  // Add refresh button functionality
  const refreshButton = document.getElementById('refresh-data-btn');
  const copyButton = document.getElementById('copy-data-btn');

  const handleRefresh = () => {
    console.log('Refreshing data inspector...');
    dataDisplay.textContent = 'Refreshing data...';
    setTimeout(() => {
      const currentSelector = document.getElementById('data-selector');
      if (currentSelector.value) {
        updateDataDisplay();
      } else {
        dataDisplay.textContent = 'Select a data source to refresh.';
      }
    }, 100);
  };

  // Add copy button functionality (targets the <code> inside #data-display)
  const handleCopy = () => {
    const codeElem = document.getElementById('data-display')?.querySelector('code');
    const text = codeElem ? codeElem.textContent : '';
    if (!text) return;
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          copyButton.textContent = '✅ Copied!';
          setTimeout(() => { copyButton.textContent = '📋 Copy'; }, 1200);
        })
        .catch(() => {
          fallbackCopyTextToClipboard(text);
        });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  // Fallback for clipboard copy
  function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    const selection = document.getSelection();
    const selected = selection.rangeCount > 0 ? selection.getRangeAt(0) : false;
    textarea.select();
    try {
      document.execCommand('copy');
      copyButton.textContent = '✅ Copied!';
    } catch (err) {
      copyButton.textContent = '❌ Error';
    }
    document.body.removeChild(textarea);
    setTimeout(() => { copyButton.textContent = '📋 Copy'; }, 1200);
    if (selected) {
      selection.removeAllRanges();
      selection.addRange(selected);
    }
  }

  // Add toggle button listener
  toggleButton.addEventListener('click', handleToggle);
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefresh);
  }
  if (copyButton) {
    copyButton.addEventListener('click', handleCopy);
  }

  // Store listener reference for cleanup
  dataInspectorListeners.toggleListener = handleToggle;
  if (refreshButton) {
    dataInspectorListeners.refreshListener = handleRefresh;
  }
}

async function main() {
  const fileSelector = document.getElementById('file-selector');

  if (!fileSelector) {
    console.error('Required UI elements are missing.');
    return;
  }

  // Load and populate file selector
  const files = await fetchVegaSpecFiles();
  console.log('Loaded files:', files); // Debug log
  fileSelector.innerHTML = '';
  files.forEach(f => {
    const option = document.createElement('option');
    option.value = f;
    option.textContent = f;
    fileSelector.appendChild(option);
  });

  // Try to restore last selected file from localStorage
  let lastSelectedFile = localStorage.getItem('lastVegaSpecFile');
  let currentFile = files.includes(lastSelectedFile) ? lastSelectedFile : files[0] || '';
  if (currentFile) {
    fileSelector.value = currentFile;
    await fetchAndRenderVegaSpec(currentFile);
  }

  // Handle file selection change
  fileSelector.addEventListener('change', async () => {
    currentFile = fileSelector.value;
    localStorage.setItem('lastVegaSpecFile', currentFile);
    await fetchAndRenderVegaSpec(currentFile);
  });
}

// Run the main function when the document is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
