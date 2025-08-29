# How to install the PoC in Elastic

## Purpose

List of commands to create artifacts in Elastic for this project.

## Components

The following files are part of this project:

### 1. create-asset-stats-index.json
Creates the asset-stats index with mappings for session_id and sorted_assets.

### 2. ingest-pipeline-asset-stats.json
Defines an ingest pipeline to convert a list of sorted assets into asset pairs for graph edges.

### 3. transform-asset-stats.json
Creates a transform to group events by session_id and produce a sorted list of assets per session.

### 4. transform-asset-dependencies.json
Creates a transform to aggregate asset pairs into a dependency index for graph construction.
