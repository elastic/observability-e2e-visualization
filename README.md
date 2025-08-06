# observability-e2e-visualization

## Purpose
To have a directed graph analogue to service map as custom vega script in Kibana.

## Features
- directed Graph using forced layout
- colored border (intended to be used for status)
- tooltip with key/value/color list

![Example visualization](example.png)


## Usage

## Limitations of Vega Scripting in Kibana

Kibana's Vega integration is powerful but comes with important limitations:

- **Single-file scripts:** Kibana only supports a single Vega (or Vega-Lite) specification per visualization. There is no support for importing or composing multiple files or components.
- **No reusable components:** Unlike some visualization frameworks, Vega in Kibana does not support modularization or reusable components. All logic, data transforms, and visual encodings must be defined in one file.
- **No external script execution:** You cannot use JavaScript or external code for data transformation; all data manipulation must be done using Vega's built-in transforms.

### Approach for Reusability

To make this visualization script as reusable as possible within Kibana's constraints:

- **Elastic Query Integration:** The Vega script should include an ElasticSearch query to fetch the relevant data directly from your cluster.
- **In-script Data Transformation:** Use Vega's `transform` blocks to reshape the query results into the node structure described in the `data.json` documentation above. This means mapping your ElasticSearch data to an array of nodes, each with `name`, `group`, `details`, and `borderColor` fields.
- **Self-contained Specification:** All logic for data fetching, transformation, and visualization must be contained in the single Vega spec file (e.g., `directed-graph-tooltip.vg.json`).

**Summary:**
- The script must be adapted for Kibana by embedding the ElasticSearch query and transforming the results to match the expected node structure, as described above. This enables the visualization to be reused with different data sources, as long as the transform produces the required structure.

### Data File: `data.json`

The `data.json` file provides the input data for the directed graph visualization. It defines the nodes and their properties, which are visualized and used for tooltips in the Vega graph specifications (such as `directed-graph-tooltip.vg.json`).

#### Structure

- **nodes**: An array of node objects, each representing a service or component in the graph.
    - **name**: The display name of the node.
    - **group**: A category or grouping for the node (e.g., "Accounting", "Customer", "Reporting", "Banking").
    - **details**: An array of key performance indicators (KPIs) or metrics for the node. Each detail object contains:
        - **key**: The name of the metric (e.g., "KPI1", "Uptime").
        - **value**: The value of the metric.
        - **color**: The color representing the status of the metric (e.g., "green", "orange").
    - **borderColor**: The color of the node's border, typically reflecting the overall status (e.g., "green", "orange").

#### Example

```json
{
    "nodes": [
        {
            "name": "Ledger+",
            "group": "Accounting",
            "details": [
                {"key": "KPI1", "value": 95.2, "color": "green"},
                {"key": "KPI2", "value": 8.7, "color": "green"},
                {"key": "Uptime", "value": 99.7, "color": "green"},
                {"key": "Errors", "value": 0.02, "color": "green"}
            ],
            "borderColor": "green"
        }
        // ... more nodes ...
    ]
}
```


#### Links (Edges)

In a directed graph, **links** (or edges) represent the relationships or flows between nodes. In the provided `data.json`, the `links` array contains two types of entries:

- Entries with only a `value` field (e.g., `{ "value": "Sales performance metrics" }`).
- Entries with `source`, `target`, and `value` fields (e.g., `{ "source": "PowerBI", "target": "Sisense", "value": "Market trends" }`).

**Structure:**
- **links**: An array of link objects.
    - **source**: The name of the source node.
    - **target**: The name of the target node.
    - **value**: A string describing the relationship or type of connection.

**Example:**

```json
{
    "links": [
        { "value": "Sales performance metrics" },
        { "source": "PowerBI", "target": "Sisense", "value": "Market trends" },
        { "source": "RTGS-Plus", "target": "CBS-Pro", "value": "Market trends" },
        { "source": "PowerBI", "target": "CBS-Pro", "value": "Market trends" },
        { "source": "PowerBI", "target": "Birst", "value": "Customer feedback" }
        // ... more links ...
    ]
}
```

**Note:**
- For the graph visualization to work as intended, only the entries with both `source` and `target` will be used to draw edges between nodes.

- If you want to visualize relationships, ensure your `links` array contains objects with at least `source` and `target` fields. The `value` field does not have any effect for now.

### Relation to `directed-graph-tooltip.vg.json`

The `directed-graph-tooltip.vg.json` file is a Vega specification that defines how the graph is rendered and how tooltips are displayed. It consumes the data from `data.json` to:

- Render each node with its `name`, `group`, and `borderColor`.
- Display a tooltip for each node, showing the list of `details` (key/value/color) when hovered.
- Use the `color` fields to visually indicate the status of each metric in the tooltip.

**Summary:**
- Update `data.json` to change the nodes, their metrics, or status colors.
- The Vega spec (`directed-graph-tooltip.vg.json`) will automatically reflect these changes in the visualization and tooltips.

### Development

For an optimal development experience, consider using these tools:

#### IDE Integration
VS Code users can enhance productivity with these Vega-specific plugins:
- [Vega Viewer](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-vega-viewer) - Preview Vega visualizations directly in your editor
- [Vega for VS Code](https://marketplace.visualstudio.com/items?itemName=kanitw.vega-vscode) - Syntax highlighting and linting for Vega specifications

#### AI-Assisted Development
When using AI coding assistants:
- Start with the provided `prompt.txt` file to enable AI agents to access terminal output and read error messages
- Note that the `render_vega.sh` script execution will always require your confirmation for security reasons