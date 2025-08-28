/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Since vega-embed is loaded from a script tag in index.html, 
// we need to declare it to TypeScript to avoid compilation errors.
declare const vegaEmbed: any;

// A type for the Vega View object, for better type safety.
type VegaView = {
  data: (name: string) => object[];
  runAsync: () => Promise<void>;
  // Add other view methods if needed
};


async function fetchVegaSpecFiles(): Promise<string[]> {
  const res = await fetch('/vega-spec-files');
  if (!res.ok) return [];
  return res.json();
}

let currentSpec: object = {};

async function fetchAndRenderVegaSpec(file: string) {
  const visContainer = document.getElementById('vis');
  const inspectorPanel = document.getElementById('inspector-panel');
  const toggleButton = document.getElementById('inspector-toggle');
  const dataSelector = document.getElementById('data-selector') as HTMLSelectElement | null;
  const dataDisplay = document.getElementById('data-display')?.querySelector('code');

  if (!visContainer || !inspectorPanel || !toggleButton || !dataSelector || !dataDisplay) {
    console.error('One or more required UI elements are missing.');
    return;
  }

  try {
    const specResponse = await fetch(`/vega-spec?file=${encodeURIComponent(file)}`);
    if (!specResponse.ok) {
      throw new Error(`HTTP error! status: ${specResponse.status}`);
    }
    const vegaSpec = await specResponse.json();
    currentSpec = vegaSpec; // Store the current spec
    visContainer.innerHTML = '';
    const result = await vegaEmbed('#vis', vegaSpec, { actions: false });
    const view: VegaView = result.view;
    console.log('Vega chart rendered successfully.');

    // --- Data Inspector Logic ---
    const updateDataDisplay = () => {
      const selectedDataName = dataSelector.value;
      if (selectedDataName) {
        try {
          const data = view.data(selectedDataName);
          dataDisplay.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
          dataDisplay.textContent = `Error fetching data for "${selectedDataName}": ${e}`;
        }
      }
    };

    // Populate the dropdown with data source names from the spec
    if (vegaSpec.data && Array.isArray(vegaSpec.data)) {
      dataSelector.innerHTML = '';
      vegaSpec.data.forEach((source: { name: string }) => {
        if (source.name) {
          const option = document.createElement('option');
          option.value = source.name;
          option.textContent = source.name;
          dataSelector.appendChild(option);
        }
      });
      dataSelector.addEventListener('change', updateDataDisplay);
    }

    // Toggle inspector panel visibility
    toggleButton.addEventListener('click', () => {
      const isHidden = inspectorPanel.hidden;
      inspectorPanel.hidden = !isHidden;
      toggleButton.setAttribute('aria-expanded', String(isHidden));
      toggleButton.textContent = isHidden ? 'Hide Inspector' : 'Inspect Data';
      if (isHidden) {
        updateDataDisplay();
      }
    });

  } catch (error) {
    console.error('Error loading or rendering Vega chart:', error);
    visContainer.innerHTML = `<p style="color: red; padding: 1rem;">Failed to load chart. See browser console for details.</p>`;
  }
}

async function main() {
  const fileSelector = document.getElementById('file-selector') as HTMLSelectElement | null;

  if (!fileSelector) {
    console.error('Required UI elements are missing.');
    return;
  }

  // Load and populate file selector
  const files = await fetchVegaSpecFiles();
  fileSelector.innerHTML = '';
  files.forEach(f => {
    const option = document.createElement('option');
    option.value = f;
    option.textContent = f;
    fileSelector.appendChild(option);
  });

  let currentFile = files[0] || '';
  if (currentFile) {
    await fetchAndRenderVegaSpec(currentFile);
  }

  // Handle file selection change
  fileSelector.addEventListener('change', async () => {
    currentFile = fileSelector.value;
    await fetchAndRenderVegaSpec(currentFile);
  });
}

// Run the main function when the document is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
