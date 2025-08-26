# How to install the PoC

## Generate input data

```bash
node elastic-scriptsinput-data/generate_data.js
````
upload the `input.ndjson` to elasticsearch into index named `input-logs`

validate in Dev-tools if all entries were uploaded successfully

`GET input-logs/_count`

## setup injest pipeline `asset-stats`

execute in Dev-tools the request in ingest-pipeline-asset-stats.http





