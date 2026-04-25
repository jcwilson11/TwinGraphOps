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

## POST /document/ingest

Uploads one `.pdf`, `.md`, or `.txt` document and runs the generic document knowledge graph extraction pipeline. PDF uploads are converted to page-marked markdown before chunking and extraction.

When page markers are present, the backend creates downloadable markdown part files under `chunks/` using the page-aware splitter from `1_5.page_aware_chunking.py`: `num_parts` is hardcoded to `18`, `overlap_pages` is hardcoded to `2`, and non-empty generated parts start with `[PDF_PAGE_START=n]` and end with `[PDF_PAGE_END=n]`. PDF uploads must produce valid page markers; if conversion produces plain markdown without markers, ingestion fails with `pdf_page_markers_missing` instead of falling back to one huge chunk. Plain markdown/text uploads without page markers are still written as one downloadable markdown part for extraction.

The `18` value is a target number of downloadable markdown part files, not an arbitrary LLM chunk failure cap.

Document extraction treats Gemini `503 UNAVAILABLE`, high-demand responses, and deadline-exceeded responses as retryable provider availability errors. The document workspace uses a more patient default profile than the risk ingest path: `GEMINI_DOCUMENT_MAX_RETRIES` defaults to `5`, `GEMINI_DOCUMENT_RETRY_BACKOFF_SECONDS` defaults to `3.0`, and `GEMINI_DOCUMENT_TIMEOUT_MS` defaults to `60000`. Each setting can still fall back to the shared `GEMINI_*` variable of the same purpose.

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
    "ingestion_id": "doc_ingest-01",
    "filename": "policy.pdf",
    "source": "document",
    "chunks_total": 18,
    "markdown_parts_created": 18,
    "page_markers_detected": true,
    "total_pages": 245,
    "artifacts_path": "runtime/artifacts/...",
    "replaced_existing": true,
    "nodes_created": 12,
    "edges_created": 18,
    "evidence_items": 30
  }
}
```

## GET /document/ingest/{ingestion_id}/events

Returns the current processing state plus recent backend document ingestion events for the given run. It uses the same response shape as `GET /ingest/{ingestion_id}/events`.

## GET /document/graph

Returns the active generic document graph from Neo4j. Document graphs are stored separately from risk components using `DocumentNode` nodes and `DOCUMENT_RELATION` relationships.

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
