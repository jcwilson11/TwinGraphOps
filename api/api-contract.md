# TwinGraphOps API Contract

## POST /ingest

Uploads one structured `.md` or `.txt` manual and runs the Gemini extraction pipeline.

### Request

- Content-Type: `multipart/form-data`
- Fields:
  - `file`: required upload
  - `replace_existing`: optional boolean, default `true`
  - `ingestion_id`: optional client-generated id used to poll live processing activity

### Success response

```json
{
  "status": "ok",
  "data": {
    "ingestion_id": "0f31b0d0-dad1-4f9c-b86d-84d2db4d6f1e",
    "filename": "demo_system.md",
    "source": "user",
    "chunks_total": 1,
    "artifacts_path": "runtime/artifacts/0f31b0d0-dad1-4f9c-b86d-84d2db4d6f1e",
    "replaced_existing": true,
    "nodes_created": 5,
    "edges_created": 5,
    "risk_nodes_scored": 5
  }
}
```

### Error response

```json
{
  "status": "error",
  "error": {
    "code": "gemini_extraction_failed",
    "message": "edges[0].source is missing",
    "details": {
      "chunk_index": 1,
      "validation_errors": [
        "edges[0].source is missing"
      ]
    }
  }
}
```

### Curl

```bash
curl -X POST http://localhost:8000/ingest \
  -F "file=@api/examples/demo_system.md" \
  -F "replace_existing=true" \
  -F "ingestion_id=0f31b0d0-dad1-4f9c-b86d-84d2db4d6f1e"
```

## GET /ingest/{ingestion_id}/events

Returns the current processing state plus recent backend ingestion events for the given run. The frontend can poll this endpoint while `/ingest` is still executing so the UI reflects real chunk-by-chunk progress.

### Success response

```json
{
  "status": "ok",
  "data": {
    "ingestion_id": "0f31b0d0-dad1-4f9c-b86d-84d2db4d6f1e",
    "state": "running",
    "filename": "demo_system.md",
    "chunks_total": 3,
    "current_chunk": 2,
    "started_at": "2026-04-08T19:22:51.184Z",
    "completed_at": null,
    "latest_event": "Processing chunk 2.",
    "events": [
      {
        "timestamp": "2026-04-08T19:22:54.102Z",
        "level": "INFO",
        "event": "ingest_chunk_started",
        "message": "Processing chunk 2.",
        "chunk_index": 2
      }
    ]
  }
}
```

## GET /graph

Returns the active graph. If the database is empty, the API seeds a small demo graph first.

## GET /impact

Query parameter:

- `component_id`: graph node id

### Curl

```bash
curl "http://localhost:8000/impact?component_id=api"
```

## GET /risk

Query parameter:

- `component_id`: graph node id

### Curl

```bash
curl "http://localhost:8000/risk?component_id=api"
```

## POST /seed

Seeds the compact demo graph used for local smoke checks and fallback behavior.
