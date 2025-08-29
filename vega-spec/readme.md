
# Vega Spec Folder Documentation

## Purpose

This folder contains Vega visualization specifications used in this proof of concept (PoC). These specifications define how data is visualized using the Vega grammar.

## Components

### Example Vega Specifications

- `directed-graph-tooltip.vg.json`: Defines a directed graph visualization with tooltips, optimized for use with the `data.json` file from the input-data folder. This spec is designed for simplicity and minimal configuration.
- `e2e-view.vg.json`: Provides an end-to-end visualization spec, intended to demonstrate the full data flow and relationships in the PoC.

## Usage

These Vega spec files can be loaded into Vega-compatible viewers or embedded in web applications. They are designed to work with the example and raw data provided in the `input-data` folder.

Refer to the main project documentation for instructions on how to render these visualizations or integrate them into your workflow.


## Data structure in the vega script.

### Data File: `data.json`

The `data.json` file provides the input data for the directed graph visualization. It defines the nodes and their properties, which are visualized and used for tooltips in the Vega graph specifications (such as `directed-graph-tooltip.vg.json`).

#### Structure

- **nodes**: An array of node objects, each representing a service or component in the graph.
    - **name**: The stable identifier (ID) of the node. This is used to reference nodes from links (`source`/`target`) and should be unique. It is not displayed by default.
    - **label**: The display label of the node, shown on the node and in tooltips.
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
            "name": "ledger-plus",
            "label": "Ledger+",
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

- Render each node with its `label`, `group`, and `borderColor`.
- Display a tooltip for each node, showing the list of `details` (key/value/color) when hovered.
- Use the `color` fields to visually indicate the status of each metric in the tooltip.

Note:
- Link endpoints (`source`/`target`) must match the node `name` (ID) values, not the `label`.

**Summary:**
- Update `data.json` to change the nodes, their metrics, or status colors.
- The Vega spec (`directed-graph-tooltip.vg.json`) will automatically reflect these changes in the visualization and tooltips.