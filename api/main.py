import io
import json
import logging
import os
import re
import time
import traceback
import uuid
import zipfile
from collections import deque
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock, Thread
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from neo4j import GraphDatabase

from document_pipeline import (
    DOCUMENT_PART_COUNT,
    DOCUMENT_PART_OVERLAP_PAGES,
    DocumentPageMarkerError,
    build_document_extraction_prompt,
    convert_pdf_bytes_to_markdown,
    merge_document_chunk_graphs,
    split_document_markdown_parts,
)
from gemini_client import GeminiDocumentGraphExtractor, GeminiExtractionError, GeminiGraphExtractor
from graph_pipeline import (
    GraphValidationError,
    build_demo_graph,
    build_extraction_prompt,
    chunk_text,
    compute_graph_metrics,
    get_impacted_components,
    get_node_by_id,
    merge_chunk_graphs,
)
from models import (
    ChunkGraph,
    DocumentChunkGraph,
    DocumentEvidence,
    DocumentGraphEdge,
    DocumentGraphNode,
    DocumentMergedGraph,
    DocumentSource,
    GraphEdge,
    GraphNode,
    MergedGraph,
    model_dump_compat,
)
from observability import Observability, normalize_http_path

app = FastAPI(title="TwinGraphOps API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DRIVER_LOCK = Lock()
DRIVER = None
OBSERVABILITY = Observability()
REQUEST_ID_CTX: ContextVar[str] = ContextVar("request_id", default="-")

LOGGER = logging.getLogger("twingraphops")
LOGGER.setLevel(logging.INFO)
INGESTION_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
ARTIFACT_FILENAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$")
ARTIFACT_DIR_NAMESPACE = uuid.UUID("6aef8b2d-51f2-4f8a-9519-5c6dbfe5375a")
DOCUMENT_ARTIFACT_BUNDLE_FILENAME = "document_source_materials.zip"
DOCUMENT_ARTIFACT_FINAL_MARKDOWN = "source_document.md"
DOCUMENT_ARTIFACT_MERGED_JSON = "merged_document_graph.json"

if not LOGGER.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    LOGGER.addHandler(handler)


def _to_event_message(event: str, fields: dict[str, Any]) -> str:
    if event == "ingest_started":
        return f"Started processing {fields.get('filename', 'document')}."
    if event == "ingest_chunking_completed":
        return f"Split the document into {fields.get('chunks_total', 0)} chunk(s)."
    if event == "ingest_chunk_started":
        return f"Processing chunk {fields.get('chunk_index', '?')}."
    if event == "ingest_chunk_succeeded":
        return (
            f"Chunk {fields.get('chunk_index', '?')} produced "
            f"{fields.get('node_count', 0)} node(s) and {fields.get('edge_count', 0)} edge(s)."
        )
    if event == "ingest_chunk_failed":
        return f"Chunk {fields.get('chunk_index', '?')} failed: {fields.get('error_message', 'unknown error')}."
    if event == "graph_merge_completed":
        return (
            f"Merged graph with {fields.get('nodes_created', 0)} node(s) and "
            f"{fields.get('edges_created', 0)} edge(s)."
        )
    if event == "graph_persisted":
        return "Saved the graph to Neo4j."
    if event == "graph_persist_failed":
        return f"Failed to save the graph: {fields.get('error_message', 'unknown error')}."
    if event == "ingest_completed":
        return "Processing completed successfully."
    if event == "document_ingest_started":
        return f"Started processing {fields.get('filename', 'document')}."
    if event == "document_pdf_conversion_started":
        return "Converting PDF to page-marked markdown."
    if event == "document_pdf_conversion_completed":
        return f"Converted PDF to markdown with {fields.get('markdown_chars', 0)} character(s)."
    if event == "document_pdf_conversion_failed":
        return f"PDF conversion failed: {fields.get('error_message', 'unknown error')}."
    if event == "document_chunking_completed":
        return f"Split the document into {fields.get('chunks_total', 0)} chunk(s)."
    if event == "document_chunking_failed":
        return f"Document chunking failed: {fields.get('error_message', 'unknown error')}."
    if event == "document_chunk_started":
        return f"Processing document chunk {fields.get('chunk_index', '?')}."
    if event == "document_chunk_succeeded":
        return (
            f"Document chunk {fields.get('chunk_index', '?')} produced "
            f"{fields.get('node_count', 0)} node(s) and {fields.get('edge_count', 0)} edge(s)."
        )
    if event == "document_chunk_failed":
        return f"Document chunk {fields.get('chunk_index', '?')} failed: {fields.get('error_message', 'unknown error')}."
    if event == "document_graph_merge_completed":
        return (
            f"Merged document graph with {fields.get('nodes_created', 0)} node(s) and "
            f"{fields.get('edges_created', 0)} edge(s)."
        )
    if event == "document_graph_persisted":
        return "Saved the document graph to Neo4j."
    if event == "document_graph_persist_failed":
        return f"Failed to save the document graph: {fields.get('error_message', 'unknown error')}."
    if event == "document_ingest_completed":
        return "Document processing completed successfully."
    if event == "document_ingest_configuration_failed":
        return f"Configuration failed: {fields.get('error_message', 'unknown error')}."
    if event == "document_graph_merge_failed":
        return f"Document graph merge failed: {fields.get('error_message', 'unknown error')}."
    if event == "ingest_configuration_failed":
        return f"Configuration failed: {fields.get('error_message', 'unknown error')}."
    if event == "graph_merge_failed":
        return f"Graph merge failed: {fields.get('error_message', 'unknown error')}."
    return event.replace("_", " ").capitalize()


class IngestionEventStore:
    def __init__(self, max_events: int = 50) -> None:
        self._lock = Lock()
        self._max_events = max_events
        self._entries: dict[str, dict[str, Any]] = {}

    def register(self, ingestion_id: str, filename: str | None = None) -> None:
        with self._lock:
            entry = self._entries.setdefault(
                ingestion_id,
                {
                    "ingestion_id": ingestion_id,
                    "state": "pending",
                    "filename": filename,
                    "chunks_total": None,
                    "current_chunk": None,
                    "started_at": None,
                    "completed_at": None,
                    "latest_event": "Waiting for ingestion to start.",
                    "events": deque(maxlen=self._max_events),
                },
            )
            if filename:
                entry["filename"] = filename

    def append(self, payload: dict[str, Any]) -> None:
        ingestion_id = str(payload.get("ingestion_id") or "").strip()
        if not ingestion_id:
            return

        event = str(payload.get("event") or "")
        fields = {
            key: value
            for key, value in payload.items()
            if key
            not in {"timestamp", "level", "service", "environment", "event", "request_id", "ingestion_id", "traceback"}
        }
        message = _to_event_message(event, fields)

        with self._lock:
            entry = self._entries.setdefault(
                ingestion_id,
                {
                    "ingestion_id": ingestion_id,
                    "state": "pending",
                    "filename": fields.get("filename"),
                    "chunks_total": None,
                    "current_chunk": None,
                    "started_at": None,
                    "completed_at": None,
                    "latest_event": "Waiting for ingestion to start.",
                    "events": deque(maxlen=self._max_events),
                },
            )

            if fields.get("filename"):
                entry["filename"] = fields["filename"]
            if fields.get("chunks_total") is not None:
                entry["chunks_total"] = fields["chunks_total"]
            if fields.get("chunk_index") is not None:
                entry["current_chunk"] = fields["chunk_index"]

            if event == "ingest_started":
                entry["state"] = "running"
                entry["started_at"] = payload.get("timestamp")
            elif event == "ingest_completed":
                entry["state"] = "succeeded"
                entry["completed_at"] = payload.get("timestamp")
            elif event == "document_ingest_started":
                entry["state"] = "running"
                entry["started_at"] = payload.get("timestamp")
            elif event == "document_ingest_completed":
                entry["state"] = "succeeded"
                entry["completed_at"] = payload.get("timestamp")
            elif event in {
                "ingest_chunk_failed",
                "graph_merge_failed",
                "graph_persist_failed",
                "ingest_configuration_failed",
                "document_pdf_conversion_failed",
                "document_chunking_failed",
                "document_chunk_failed",
                "document_graph_merge_failed",
                "document_graph_persist_failed",
                "document_ingest_configuration_failed",
            }:
                entry["state"] = "failed"
                entry["completed_at"] = payload.get("timestamp")

            entry["latest_event"] = message
            entry["events"].append(
                {
                    "timestamp": payload.get("timestamp"),
                    "level": payload.get("level"),
                    "event": event,
                    "message": message,
                    "chunk_index": fields.get("chunk_index"),
                }
            )

    def get(self, ingestion_id: str) -> dict[str, Any]:
        with self._lock:
            entry = self._entries.get(ingestion_id)
            if not entry:
                return {
                    "ingestion_id": ingestion_id,
                    "state": "pending",
                    "filename": None,
                    "chunks_total": None,
                    "current_chunk": None,
                    "started_at": None,
                    "completed_at": None,
                    "latest_event": "Waiting for ingestion to start.",
                    "events": [],
                }
            return {
                "ingestion_id": entry["ingestion_id"],
                "state": entry["state"],
                "filename": entry["filename"],
                "chunks_total": entry["chunks_total"],
                "current_chunk": entry["current_chunk"],
                "started_at": entry["started_at"],
                "completed_at": entry["completed_at"],
                "latest_event": entry["latest_event"],
                "events": list(entry["events"]),
            }


INGESTION_EVENTS = IngestionEventStore()


def log_event(level: str, event: str, **fields: Any) -> None:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),
        "service": "twin_api",
        "environment": get_environment(),
        "event": event,
        "request_id": REQUEST_ID_CTX.get(),
        **fields,
    }
    INGESTION_EVENTS.append(payload)
    getattr(LOGGER, level.lower(), LOGGER.info)(json.dumps(payload, default=str))


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


@app.exception_handler(ApiError)
def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    OBSERVABILITY.record_api_error(exc.code)
    if request.url.path == "/ingest":
        OBSERVABILITY.record_ingest_failure(exc.code)

    log_event(
        "error",
        "api_error",
        path=request.url.path,
        status_code=exc.status_code,
        error_code=exc.code,
        error_message=exc.message,
        details=exc.details,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.exception_handler(Exception)
def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    OBSERVABILITY.record_api_error("internal_server_error")
    if request.url.path == "/ingest":
        OBSERVABILITY.record_ingest_failure("internal_server_error")

    log_event(
        "error",
        "unhandled_exception",
        path=request.url.path,
        error_type=type(exc).__name__,
        error_message=str(exc),
        traceback=traceback.format_exc(),
    )

    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": {
                "code": "internal_server_error",
                "message": "Internal Server Error",
                "details": {},
            },
        },
    )


def success_response(data: dict[str, Any]) -> dict[str, Any]:
    return {"status": "ok", "data": data}


def _load_secret(env_var: str, default: str | None = None, required: bool = False) -> str | None:
    direct_value = os.getenv(env_var)
    if direct_value:
        return direct_value

    file_var = f"{env_var}_FILE"
    file_path = os.getenv(file_var)
    if file_path:
        try:
            return Path(file_path).read_text(encoding="utf-8").strip() or default
        except OSError as exc:  # pragma: no cover
            raise RuntimeError(f"Unable to read secret file from {file_var}={file_path}: {exc}") from exc

    if default is not None:
        return default

    if required:
        raise RuntimeError(
            f"Missing required secret '{env_var}'. Set {env_var} or provide {file_var} pointing to a readable file."
        )

    return None


def get_environment() -> str:
    return os.getenv("TWIN_ENV", "local")


def get_driver():
    global DRIVER
    if DRIVER is not None:
        return DRIVER

    with DRIVER_LOCK:
        if DRIVER is None:
            DRIVER = GraphDatabase.driver(
                _load_secret("NEO4J_URI", default="bolt://neo4j:7687"),
                auth=(
                    _load_secret("NEO4J_USER", default="neo4j"),
                    _load_secret("NEO4J_PASSWORD", required=True),
                ),
            )

    return DRIVER


def get_gemini_client() -> GeminiGraphExtractor:
    return GeminiGraphExtractor(
        api_key=_load_secret("GEMINI_API_KEY", required=True),
        model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview"),
        max_retries=int(os.getenv("GEMINI_MAX_RETRIES", "2")),
        backoff_seconds=float(os.getenv("GEMINI_RETRY_BACKOFF_SECONDS", "1.0")),
        timeout_ms=int(os.getenv("GEMINI_TIMEOUT_MS", "300000")),
    )


def get_gemini_document_client() -> GeminiDocumentGraphExtractor:
    return GeminiDocumentGraphExtractor(
        api_key=_load_secret("GEMINI_API_KEY", required=True),
        model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview"),
        max_retries=int(os.getenv("GEMINI_DOCUMENT_MAX_RETRIES", os.getenv("GEMINI_MAX_RETRIES", "5"))),
        backoff_seconds=float(
            os.getenv("GEMINI_DOCUMENT_RETRY_BACKOFF_SECONDS", os.getenv("GEMINI_RETRY_BACKOFF_SECONDS", "3.0"))
        ),
        timeout_ms=int(os.getenv("GEMINI_DOCUMENT_TIMEOUT_MS", os.getenv("GEMINI_TIMEOUT_MS", "300000"))),
    )


def get_artifacts_root() -> Path:
    return Path(os.getenv("ARTIFACTS_DIR", "runtime/artifacts"))


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def normalize_ingestion_id(ingestion_id: str | None) -> str:
    if ingestion_id is None:
        return str(uuid.uuid4())

    normalized = ingestion_id.strip()
    if not normalized:
        raise ApiError(
            400,
            "invalid_ingestion_id",
            "ingestion_id must contain only letters, numbers, hyphens, and underscores.",
        )

    if not INGESTION_ID_PATTERN.fullmatch(normalized):
        raise ApiError(
            400,
            "invalid_ingestion_id",
            "ingestion_id must contain only letters, numbers, hyphens, and underscores.",
        )

    return normalized


def get_artifact_dir(ingestion_id: str) -> Path:
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id)
    artifacts_root = get_artifacts_root().resolve()
    artifact_dir_name = uuid.uuid5(ARTIFACT_DIR_NAMESPACE, normalized_ingestion_id).hex
    return artifacts_root / artifact_dir_name


def check_neo4j() -> tuple[bool, str | None]:
    start_time = time.perf_counter()
    try:
        with get_driver().session() as session:
            result = session.run("RETURN 1 AS ok").single()
            if result and result["ok"] == 1:
                duration = time.perf_counter() - start_time
                OBSERVABILITY.observe_neo4j("healthcheck", True, duration)
                log_event(
                    "info",
                    "neo4j_healthcheck_succeeded",
                    duration_ms=round(duration * 1000, 2),
                )
                return True, None
    except Exception as exc:  # pragma: no cover
        duration = time.perf_counter() - start_time
        OBSERVABILITY.observe_neo4j("healthcheck", False, duration)
        log_event(
            "error",
            "neo4j_healthcheck_failed",
            duration_ms=round(duration * 1000, 2),
            error_message=str(exc),
        )
        return False, str(exc)

    duration = time.perf_counter() - start_time
    OBSERVABILITY.observe_neo4j("healthcheck", False, duration)
    log_event(
        "error",
        "neo4j_healthcheck_failed",
        duration_ms=round(duration * 1000, 2),
        error_message="Neo4j returned an unexpected response.",
    )
    return False, "Neo4j returned an unexpected response."


def _graph_source(graph: MergedGraph) -> str:
    if graph.nodes:
        return graph.nodes[0].source
    return "demo"


def _serialize_graph(graph: MergedGraph) -> dict[str, Any]:
    return {
        "source": _graph_source(graph),
        "nodes": [model_dump_compat(node) for node in graph.nodes],
        "edges": [model_dump_compat(edge) for edge in graph.edges],
    }


def _artifact_file_path(artifact_dir: Path, filename: str) -> Path:
    if not ARTIFACT_FILENAME_PATTERN.fullmatch(filename):
        raise ApiError(400, "invalid_artifact_filename", "Artifact filename contains unsupported characters.")
    artifacts_root = get_artifacts_root().resolve()
    artifact_path = (artifact_dir / filename).resolve()
    if not _is_relative_to(artifact_path, artifacts_root):
        raise ApiError(400, "invalid_artifact_path", "Artifact path resolved outside the configured artifacts directory.")
    return artifact_path


def _artifact_relative_path(artifact_dir: Path, relative_path: str) -> Path:
    parts = Path(relative_path).parts
    if not parts:
        raise ApiError(400, "invalid_artifact_filename", "Artifact filename contains unsupported characters.")
    for part in parts:
        if part in {".", ".."} or not ARTIFACT_FILENAME_PATTERN.fullmatch(part):
            raise ApiError(400, "invalid_artifact_filename", "Artifact filename contains unsupported characters.")

    artifacts_root = get_artifacts_root().resolve()
    artifact_path = (artifact_dir.joinpath(*parts)).resolve()
    if not _is_relative_to(artifact_path, artifacts_root):
        raise ApiError(400, "invalid_artifact_path", "Artifact path resolved outside the configured artifacts directory.")
    return artifact_path


def _write_json(artifact_dir: Path, filename: str, payload: Any) -> None:
    path = _artifact_file_path(artifact_dir, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_json_relative(artifact_dir: Path, relative_path: str, payload: Any) -> None:
    path = _artifact_relative_path(artifact_dir, relative_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_text(artifact_dir: Path, filename: str, payload: str) -> None:
    path = _artifact_file_path(artifact_dir, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def _write_text_relative(artifact_dir: Path, relative_path: str, payload: str) -> None:
    path = _artifact_relative_path(artifact_dir, relative_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def _write_bytes(artifact_dir: Path, filename: str, payload: bytes) -> None:
    path = _artifact_file_path(artifact_dir, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def read_upload(upload: UploadFile) -> tuple[str, str]:
    filename = upload.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in {".md", ".txt"}:
        raise ApiError(415, "unsupported_file_type", "Only .md and .txt uploads are supported.")

    raw = upload.file.read()
    if not raw:
        raise ApiError(400, "empty_upload", "Uploaded file is empty.")

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ApiError(400, "invalid_encoding", "Uploaded file must be valid UTF-8 text.") from exc

    if not text.strip():
        raise ApiError(400, "empty_upload", "Uploaded file is empty.")

    return filename, text


def read_document_upload(upload: UploadFile) -> tuple[str, str, bytes]:
    filename = upload.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in {".pdf", ".md", ".txt"}:
        raise ApiError(415, "unsupported_file_type", "Only .pdf, .md, and .txt uploads are supported.")

    raw = upload.file.read()
    if not raw:
        raise ApiError(400, "empty_upload", "Uploaded file is empty.")

    if suffix in {".md", ".txt"}:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ApiError(400, "invalid_encoding", "Uploaded file must be valid UTF-8 text.") from exc
        if not text.strip():
            raise ApiError(400, "empty_upload", "Uploaded file is empty.")

    return filename, suffix, raw


def _graph_counts(graph: MergedGraph) -> dict[str, int]:
    return {
        "nodes_created": len(graph.nodes),
        "edges_created": len(graph.edges),
        "risk_nodes_scored": len(graph.nodes),
    }


def _risk_summary(graph: MergedGraph) -> dict[str, Any]:
    return {
        "nodes": [
            {
                "id": node.id,
                "name": node.name,
                "risk_score": node.risk_score,
                "risk_level": node.risk_level,
                "blast_radius": node.blast_radius,
                "dependency_span": node.dependency_span,
            }
            for node in graph.nodes
        ]
    }


def _write_graph_tx(tx, graph: MergedGraph, source: str, ingestion_id: str, replace_existing: bool) -> None:
    if replace_existing:
        tx.run("MATCH (n:Component) DETACH DELETE n")

    for node in graph.nodes:
        tx.run(
            """
            MERGE (c:Component {id: $id})
            SET c.name = $name,
                c.type = $type,
                c.description = $description,
                c.risk_score = $risk_score,
                c.risk_level = $risk_level,
                c.degree = $degree,
                c.betweenness = $betweenness,
                c.closeness = $closeness,
                c.blast_radius = $blast_radius,
                c.dependency_span = $dependency_span,
                c.risk_explanation = $risk_explanation,
                c.source = $source,
                c.ingestion_id = $ingestion_id,
                c.created_at = $created_at
            """,
            id=node.id,
            name=node.name,
            type=node.type,
            description=node.description,
            risk_score=node.risk_score,
            risk_level=node.risk_level,
            degree=node.degree,
            betweenness=node.betweenness,
            closeness=node.closeness,
            blast_radius=node.blast_radius,
            dependency_span=node.dependency_span,
            risk_explanation=node.risk_explanation,
            source=source,
            ingestion_id=ingestion_id,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    for edge in graph.edges:
        tx.run(
            """
            MATCH (a:Component {id: $source})
            MATCH (b:Component {id: $target})
            MERGE (a)-[r:DEPENDS_ON {relation: $relation, target_id: $target}]->(b)
            SET r.rationale = $rationale,
                r.source = $source_name,
                r.ingestion_id = $ingestion_id
            """,
            source=edge.source,
            target=edge.target,
            relation=edge.relation,
            rationale=edge.rationale,
            source_name=source,
            ingestion_id=ingestion_id,
        )


def persist_graph_to_store(graph: MergedGraph, source: str, ingestion_id: str, replace_existing: bool) -> None:
    try:
        with get_driver().session() as session:
            session.execute_write(_write_graph_tx, graph, source, ingestion_id, replace_existing)
    except Exception as exc:
        OBSERVABILITY.record_graph_persist(False)
        log_event(
            "error",
            "graph_persist_failed",
            ingestion_id=ingestion_id,
            source=source,
            replace_existing=replace_existing,
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        raise

    OBSERVABILITY.record_graph_persist(True)
    OBSERVABILITY.update_graph_summary(graph)
    log_event(
        "info",
        "graph_persisted",
        ingestion_id=ingestion_id,
        source=source,
        replace_existing=replace_existing,
        nodes_created=len(graph.nodes),
        edges_created=len(graph.edges),
    )


def _loads_list(value: Any) -> list[Any]:
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        loaded = json.loads(value)
        return loaded if isinstance(loaded, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _loads_dict(value: Any) -> dict[str, Any] | None:
    if not value:
        return None
    if isinstance(value, dict):
        return value
    try:
        loaded = json.loads(value)
        return loaded if isinstance(loaded, dict) else None
    except (TypeError, json.JSONDecodeError):
        return None


def _write_document_graph_tx(
    tx,
    graph: DocumentMergedGraph,
    source: str,
    ingestion_id: str,
    replace_existing: bool,
) -> None:
    if replace_existing:
        tx.run("MATCH (n:DocumentNode) DETACH DELETE n")

    for node in graph.nodes:
        tx.run(
            """
            MERGE (d:DocumentNode {id: $id})
            SET d.label = $label,
                d.kind = $kind,
                d.canonical_name = $canonical_name,
                d.aliases = $aliases,
                d.summary = $summary,
                d.evidence_json = $evidence_json,
                d.sources_json = $sources_json,
                d.degree = $degree,
                d.source = $source,
                d.ingestion_id = $ingestion_id,
                d.created_at = $created_at
            """,
            id=node.id,
            label=node.label,
            kind=node.kind,
            canonical_name=node.canonical_name,
            aliases=node.aliases,
            summary=node.summary,
            evidence_json=json.dumps([model_dump_compat(item) for item in node.evidence]),
            sources_json=json.dumps([model_dump_compat(item) for item in node.sources]),
            degree=node.degree,
            source=source,
            ingestion_id=ingestion_id,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    for edge in graph.edges:
        tx.run(
            """
            MATCH (a:DocumentNode {id: $source})
            MATCH (b:DocumentNode {id: $target})
            MERGE (a)-[r:DOCUMENT_RELATION {id: $id}]->(b)
            SET r.type = $type,
                r.summary = $summary,
                r.evidence_json = $evidence_json,
                r.source_chunk_json = $source_chunk_json,
                r.source = $source_name,
                r.ingestion_id = $ingestion_id
            """,
            id=edge.id,
            source=edge.source,
            target=edge.target,
            type=edge.type,
            summary=edge.summary,
            evidence_json=json.dumps([model_dump_compat(item) for item in edge.evidence]),
            source_chunk_json=json.dumps(model_dump_compat(edge.source_chunk)) if edge.source_chunk else None,
            source_name=source,
            ingestion_id=ingestion_id,
        )


def persist_document_graph_to_store(
    graph: DocumentMergedGraph,
    source: str,
    ingestion_id: str,
    replace_existing: bool,
) -> None:
    try:
        with get_driver().session() as session:
            session.execute_write(_write_document_graph_tx, graph, source, ingestion_id, replace_existing)
    except Exception as exc:
        log_event(
            "error",
            "document_graph_persist_failed",
            ingestion_id=ingestion_id,
            source=source,
            replace_existing=replace_existing,
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        raise

    log_event(
        "info",
        "document_graph_persisted",
        ingestion_id=ingestion_id,
        source=source,
        replace_existing=replace_existing,
        nodes_created=len(graph.nodes),
        edges_created=len(graph.edges),
    )


def fetch_document_graph_from_store() -> DocumentMergedGraph:
    with get_driver().session() as session:
        node_records = list(
            session.run(
                """
                MATCH (d:DocumentNode)
                RETURN d.id AS id,
                       d.label AS label,
                       d.kind AS kind,
                       d.canonical_name AS canonical_name,
                       d.aliases AS aliases,
                       d.summary AS summary,
                       d.evidence_json AS evidence_json,
                       d.sources_json AS sources_json,
                       d.degree AS degree,
                       d.source AS source,
                       d.ingestion_id AS ingestion_id
                ORDER BY d.canonical_name
                """
            )
        )
        edge_records = list(
            session.run(
                """
                MATCH (a:DocumentNode)-[r:DOCUMENT_RELATION]->(b:DocumentNode)
                RETURN r.id AS id,
                       a.id AS source,
                       b.id AS target,
                       r.type AS type,
                       r.summary AS summary,
                       r.evidence_json AS evidence_json,
                       r.source_chunk_json AS source_chunk_json
                ORDER BY r.id
                """
            )
        )

    nodes = [
        DocumentGraphNode(
            id=record["id"],
            label=record["label"] or record["canonical_name"] or record["id"],
            kind=record["kind"] or "other",
            canonical_name=record["canonical_name"] or record["label"] or record["id"],
            aliases=list(record["aliases"] or []),
            summary=record["summary"] or "",
            evidence=[DocumentEvidence(**item) for item in _loads_list(record["evidence_json"])],
            sources=[DocumentSource(**item) for item in _loads_list(record["sources_json"])],
            degree=float(record["degree"] or 0.0),
            source=record["source"] or "document",
        )
        for record in node_records
    ]
    edges = [
        DocumentGraphEdge(
            id=record["id"],
            source=record["source"],
            target=record["target"],
            type=record["type"] or "related_to",
            summary=record["summary"] or "",
            evidence=[DocumentEvidence(**item) for item in _loads_list(record["evidence_json"])],
            source_chunk=(
                DocumentSource(**source_chunk)
                if (source_chunk := _loads_dict(record["source_chunk_json"])) is not None
                else None
            ),
        )
        for record in edge_records
    ]
    ingestion_id = next(
        (
            str(record["ingestion_id"])
            for record in node_records
            if record["ingestion_id"]
        ),
        None,
    )
    return DocumentMergedGraph(ingestion_id=ingestion_id, nodes=nodes, edges=edges)


def fetch_graph_from_store() -> MergedGraph:
    with get_driver().session() as session:
        component_exists = session.run(
            """
            MATCH (n)
            WHERE 'Component' IN labels(n)
            RETURN 1 AS found
            LIMIT 1
            """
        ).single()
        if component_exists is None:
            empty_graph = MergedGraph()
            OBSERVABILITY.update_graph_summary(empty_graph)
            return empty_graph

        node_records = list(
            session.run(
                """
                MATCH (c)
                WHERE 'Component' IN labels(c)
                RETURN c.id AS id,
                       c.name AS name,
                       c.type AS type,
                       c.description AS description,
                       c.risk_score AS risk_score,
                       c.risk_level AS risk_level,
                       c.degree AS degree,
                       c.betweenness AS betweenness,
                       c.closeness AS closeness,
                       c.blast_radius AS blast_radius,
                       c.dependency_span AS dependency_span,
                       c.risk_explanation AS risk_explanation,
                       c.source AS source
                ORDER BY c.name
                """
            )
        )
        edge_records = list(
            session.run(
                """
                MATCH (a)-[r]->(b)
                WHERE 'Component' IN labels(a)
                  AND 'Component' IN labels(b)
                  AND type(r) = 'DEPENDS_ON'
                RETURN a.id AS source,
                       b.id AS target,
                       r.relation AS relation,
                       r.rationale AS rationale
                ORDER BY a.id, b.id
                """
            )
        )

    nodes = [
        GraphNode(
            id=record["id"],
            name=record["name"],
            type=record["type"] or "other",
            description=record["description"] or "",
            risk_score=record["risk_score"] or 0,
            risk_level=record["risk_level"] or "low",
            degree=float(record["degree"] or 0.0),
            betweenness=float(record["betweenness"] or 0.0),
            closeness=float(record["closeness"] or 0.0),
            blast_radius=int(record["blast_radius"] or 0),
            dependency_span=int(record["dependency_span"] or 0),
            risk_explanation=record["risk_explanation"] or "",
            source=record["source"] or "user",
        )
        for record in node_records
    ]
    edges = [
        GraphEdge(
            source=record["source"],
            target=record["target"],
            relation=record["relation"] or "depends_on",
            rationale=record["rationale"] or "",
        )
        for record in edge_records
    ]
    graph = MergedGraph(nodes=nodes, edges=edges)
    OBSERVABILITY.update_graph_summary(graph)
    return graph


def seed_demo_graph() -> MergedGraph:
    graph = compute_graph_metrics(build_demo_graph())
    persist_graph_to_store(graph, source="demo", ingestion_id="demo-seed", replace_existing=True)
    OBSERVABILITY.record_graph_counts(nodes_created=len(graph.nodes), edges_created=len(graph.edges))
    OBSERVABILITY.update_graph_summary(graph)
    return graph


def ensure_active_graph() -> MergedGraph:
    graph = fetch_graph_from_store()
    if graph.nodes:
        return graph
    return seed_demo_graph()


def run_ingestion_pipeline(filename: str, text: str, replace_existing: bool, ingestion_id: str | None = None) -> dict[str, Any]:
    ingestion_id = normalize_ingestion_id(ingestion_id)
    artifact_dir = get_artifact_dir(ingestion_id)
    INGESTION_EVENTS.register(ingestion_id, filename)

    log_event(
        "info",
        "ingest_started",
        ingestion_id=ingestion_id,
        filename=filename,
        replace_existing=replace_existing,
    )

    try:
        extractor = get_gemini_client()
    except RuntimeError as exc:
        log_event(
            "error",
            "ingest_configuration_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_message=str(exc),
        )
        raise ApiError(500, "gemini_not_configured", str(exc)) from exc

    chunks = chunk_text(
        text,
        max_chars=int(os.getenv("GEMINI_MAX_CHARS", "2400")),
        overlap=int(os.getenv("GEMINI_CHUNK_OVERLAP", "200")),
    )
    if not chunks:
        raise ApiError(400, "empty_upload", "Uploaded file is empty.")
    OBSERVABILITY.record_ingest_document(source="user", chunk_count=len(chunks))

    log_event(
        "info",
        "ingest_chunking_completed",
        ingestion_id=ingestion_id,
        filename=filename,
        chunks_total=len(chunks),
        payload_chars=len(text),
    )

    _write_text(artifact_dir, "source_document.md", text)

    chunk_graphs: list[ChunkGraph] = []
    for index, chunk in enumerate(chunks, start=1):
        prompt = build_extraction_prompt(chunk)
        chunk_name = f"chunk_{index:02d}"
        _write_text(artifact_dir, f"{chunk_name}.txt", chunk)
        _write_text(artifact_dir, f"{chunk_name}_prompt.txt", prompt)
        log_event(
            "info",
            "ingest_chunk_started",
            ingestion_id=ingestion_id,
            chunk_index=index,
            chunk_name=chunk_name,
            chunk_chars=len(chunk),
        )
        gemini_started_at = time.perf_counter()
        try:
            graph, payload = extractor.extract_chunk(chunk_text=chunk, prompt=prompt, chunk_index=index)
        except GeminiExtractionError as exc:
            OBSERVABILITY.observe_gemini(
                attempts=extractor.last_attempts,
                duration_seconds=time.perf_counter() - gemini_started_at,
                success=False,
                code=exc.code,
            )
            if exc.raw_payload is not None:
                _write_json(artifact_dir, f"{chunk_name}_response.json", exc.raw_payload)
            _write_json(
                artifact_dir,
                f"{chunk_name}_validation.json",
                {
                    "status": "error",
                    "code": exc.code,
                    "message": str(exc),
                    "validation_errors": exc.validation_errors,
                },
            )
            log_event(
                "error",
                "ingest_chunk_failed",
                ingestion_id=ingestion_id,
                chunk_index=exc.chunk_index,
                chunk_name=chunk_name,
                error_code=exc.code,
                error_message=str(exc),
                validation_errors=exc.validation_errors,
            )
            raise ApiError(
                422,
                exc.code,
                str(exc),
                {"chunk_index": exc.chunk_index, "validation_errors": exc.validation_errors},
            ) from exc
        OBSERVABILITY.observe_gemini(
            attempts=extractor.last_attempts,
            duration_seconds=time.perf_counter() - gemini_started_at,
            success=True,
            code="ok",
        )

        _write_json(artifact_dir, f"{chunk_name}_response.json", payload)
        _write_json(
            artifact_dir,
            f"{chunk_name}_validation.json",
            {"status": "ok", "validation_errors": [], "node_count": len(graph.nodes), "edge_count": len(graph.edges)},
        )
        chunk_graphs.append(graph)

        log_event(
            "info",
            "ingest_chunk_succeeded",
            ingestion_id=ingestion_id,
            chunk_index=index,
            chunk_name=chunk_name,
            node_count=len(graph.nodes),
            edge_count=len(graph.edges),
        )

    try:
        merged_graph = compute_graph_metrics(merge_chunk_graphs(chunk_graphs))
    except GraphValidationError as exc:
        log_event(
            "error",
            "graph_merge_failed",
            ingestion_id=ingestion_id,
            error_message=str(exc),
            validation_errors=exc.validation_errors,
        )
        raise ApiError(422, "graph_merge_failed", str(exc), {"validation_errors": exc.validation_errors}) from exc

    log_event(
        "info",
        "graph_merge_completed",
        ingestion_id=ingestion_id,
        nodes_created=len(merged_graph.nodes),
        edges_created=len(merged_graph.edges),
    )

    persist_graph_to_store(merged_graph, source="user", ingestion_id=ingestion_id, replace_existing=replace_existing)
    OBSERVABILITY.record_graph_counts(nodes_created=len(merged_graph.nodes), edges_created=len(merged_graph.edges))
    OBSERVABILITY.update_graph_summary(merged_graph)
    _write_json(artifact_dir, "merged_graph.json", model_dump_compat(merged_graph))
    _write_json(artifact_dir, "neo4j_payload.json", model_dump_compat(merged_graph))
    _write_json(artifact_dir, "risk_summary.json", _risk_summary(merged_graph))

    log_event(
        "info",
        "ingest_completed",
        ingestion_id=ingestion_id,
        filename=filename,
        chunks_total=len(chunks),
        artifacts_path=str(artifact_dir).replace("\\", "/"),
    )

    return {
        "ingestion_id": ingestion_id,
        "filename": filename,
        "source": "user",
        "chunks_total": len(chunks),
        "artifacts_path": str(artifact_dir).replace("\\", "/"),
        "replaced_existing": replace_existing,
        **_graph_counts(merged_graph),
    }


def _document_graph_counts(graph: DocumentMergedGraph) -> dict[str, int]:
    return {
        "nodes_created": len(graph.nodes),
        "edges_created": len(graph.edges),
        "evidence_items": sum(len(node.evidence) for node in graph.nodes)
        + sum(len(edge.evidence) for edge in graph.edges),
    }


def _serialize_document_graph(graph: DocumentMergedGraph) -> dict[str, Any]:
    return {
        "source": graph.source,
        "ingestion_id": graph.ingestion_id,
        "nodes": [model_dump_compat(node) for node in graph.nodes],
        "edges": [model_dump_compat(edge) for edge in graph.edges],
    }


def _artifact_download_url(ingestion_id: str, artifact_id: str) -> str:
    return f"/api/document/artifacts/{ingestion_id}/files/{artifact_id}"


def _artifact_bundle_download_url(ingestion_id: str) -> str:
    return f"/api/document/artifacts/{ingestion_id}/bundle"


def _document_artifact_id_for_relative_path(relative_path: str) -> str:
    if relative_path == DOCUMENT_ARTIFACT_FINAL_MARKDOWN:
        return "final-markdown"
    if relative_path == DOCUMENT_ARTIFACT_MERGED_JSON:
        return "merged-json"
    if relative_path.startswith("chunks/") and relative_path.endswith(".md"):
        return f"chunk-{Path(relative_path).stem}"
    raise ApiError(404, "document_artifact_not_found", "Document artifact is not available for download.")


def _document_artifact_type_for_relative_path(relative_path: str) -> str:
    if relative_path == DOCUMENT_ARTIFACT_FINAL_MARKDOWN:
        return "final-markdown"
    if relative_path == DOCUMENT_ARTIFACT_MERGED_JSON:
        return "merged-json"
    if relative_path.startswith("chunks/") and relative_path.endswith(".md"):
        return "chunk-markdown"
    raise ApiError(404, "document_artifact_not_found", "Document artifact is not available for download.")


def _iter_allowed_document_artifact_paths(artifact_dir: Path) -> list[str]:
    allowed = []
    final_markdown = _artifact_relative_path(artifact_dir, DOCUMENT_ARTIFACT_FINAL_MARKDOWN)
    if final_markdown.is_file():
        allowed.append(DOCUMENT_ARTIFACT_FINAL_MARKDOWN)

    chunk_dir = _artifact_relative_path(artifact_dir, "chunks")
    if chunk_dir.exists() and chunk_dir.is_dir():
        for chunk_path in sorted(chunk_dir.glob("*.md")):
            allowed.append(chunk_path.relative_to(artifact_dir).as_posix())

    merged_json = _artifact_relative_path(artifact_dir, DOCUMENT_ARTIFACT_MERGED_JSON)
    if merged_json.is_file():
        allowed.append(DOCUMENT_ARTIFACT_MERGED_JSON)

    return allowed


def _build_document_artifact_manifest(ingestion_id: str) -> dict[str, Any]:
    artifact_dir = get_artifact_dir(ingestion_id)
    allowed_paths = _iter_allowed_document_artifact_paths(artifact_dir)
    artifacts = []

    for relative_path in allowed_paths:
        artifact_path = _artifact_relative_path(artifact_dir, relative_path)
        artifact_id = _document_artifact_id_for_relative_path(relative_path)
        artifact_type = _document_artifact_type_for_relative_path(relative_path)
        artifacts.append(
            {
                "id": artifact_id,
                "type": artifact_type,
                "filename": Path(relative_path).name,
                "relative_path": relative_path,
                "size_bytes": artifact_path.stat().st_size,
                "download_url": _artifact_download_url(ingestion_id, artifact_id),
            }
        )

    chunk_artifacts = [artifact for artifact in artifacts if artifact["type"] == "chunk-markdown"]
    return {
        "ingestion_id": ingestion_id,
        "bundle": {
            "filename": DOCUMENT_ARTIFACT_BUNDLE_FILENAME,
            "download_url": _artifact_bundle_download_url(ingestion_id),
        },
        "artifacts": artifacts,
        "chunk_artifacts": chunk_artifacts,
    }


def _get_document_artifact_relative_path(artifact_dir: Path, artifact_id: str) -> str:
    for relative_path in _iter_allowed_document_artifact_paths(artifact_dir):
        if _document_artifact_id_for_relative_path(relative_path) == artifact_id:
            return relative_path
    raise ApiError(404, "document_artifact_not_found", "Document artifact is not available for download.")


def _convert_and_validate_pdf_markdown(raw: bytes, ingestion_id: str, filename: str) -> str:
    log_event("info", "document_pdf_conversion_started", ingestion_id=ingestion_id, filename=filename)
    try:
        text = convert_pdf_bytes_to_markdown(raw)
    except Exception as exc:
        log_event(
            "error",
            "document_pdf_conversion_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        raise ApiError(422, "pdf_conversion_failed", f"Unable to convert PDF to markdown: {exc}") from exc

    if not text.strip():
        raise ApiError(400, "empty_upload", "PDF conversion produced no markdown text.")

    log_event(
        "info",
        "document_pdf_conversion_completed",
        ingestion_id=ingestion_id,
        filename=filename,
        markdown_chars=len(text),
    )

    try:
        chunking = split_document_markdown_parts(text, source_stem="source_document")
    except DocumentPageMarkerError as exc:
        log_event(
            "error",
            "document_chunking_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_code="invalid_page_markers",
            error_message=str(exc),
        )
        raise ApiError(422, "invalid_page_markers", str(exc)) from exc

    if not chunking.page_markers_detected:
        message = "PDF conversion produced markdown without valid PDF page markers."
        log_event(
            "error",
            "document_chunking_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_code="pdf_page_markers_missing",
            error_message=message,
            num_parts=DOCUMENT_PART_COUNT,
            overlap_pages=DOCUMENT_PART_OVERLAP_PAGES,
        )
        raise ApiError(422, "pdf_page_markers_missing", message)

    return text


def _run_document_ingestion_background_job(
    filename: str,
    suffix: str,
    raw: bytes,
    replace_existing: bool,
    ingestion_id: str,
    converted_markdown: str | None = None,
) -> None:
    try:
        run_document_ingestion_pipeline(
            filename=filename,
            suffix=suffix,
            raw=raw,
            replace_existing=replace_existing,
            ingestion_id=ingestion_id,
            converted_markdown=converted_markdown,
        )
    except ApiError as exc:
        log_event(
            "error",
            "document_background_job_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_code=exc.code,
            error_message=exc.message,
            details=exc.details,
        )
    except Exception as exc:
        log_event(
            "error",
            "document_background_job_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_type=type(exc).__name__,
            error_message=str(exc),
            traceback=traceback.format_exc(),
        )


def run_document_ingestion_pipeline(
    filename: str,
    suffix: str,
    raw: bytes,
    replace_existing: bool,
    ingestion_id: str | None = None,
    converted_markdown: str | None = None,
) -> dict[str, Any]:
    ingestion_id = normalize_ingestion_id(ingestion_id)
    artifact_dir = get_artifact_dir(ingestion_id)
    INGESTION_EVENTS.register(ingestion_id, filename)

    log_event(
        "info",
        "document_ingest_started",
        ingestion_id=ingestion_id,
        filename=filename,
        replace_existing=replace_existing,
    )

    try:
        extractor = get_gemini_document_client()
    except RuntimeError as exc:
        log_event(
            "error",
            "document_ingest_configuration_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_message=str(exc),
        )
        raise ApiError(500, "gemini_not_configured", str(exc)) from exc

    if suffix == ".pdf":
        _write_bytes(artifact_dir, "source_document.pdf", raw)
        if converted_markdown is None:
            text = _convert_and_validate_pdf_markdown(raw, ingestion_id=ingestion_id, filename=filename)
        else:
            text = converted_markdown
    else:
        text = raw.decode("utf-8")

    _write_text(artifact_dir, "source_document.md", text)

    try:
        chunking = split_document_markdown_parts(text, source_stem="source_document")
    except DocumentPageMarkerError as exc:
        log_event(
            "error",
            "document_chunking_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_code="invalid_page_markers",
            error_message=str(exc),
        )
        raise ApiError(422, "invalid_page_markers", str(exc)) from exc
    if suffix == ".pdf" and not chunking.page_markers_detected:
        message = "PDF conversion produced markdown without valid PDF page markers."
        log_event(
            "error",
            "document_chunking_failed",
            ingestion_id=ingestion_id,
            filename=filename,
            error_code="pdf_page_markers_missing",
            error_message=message,
            num_parts=DOCUMENT_PART_COUNT,
            overlap_pages=DOCUMENT_PART_OVERLAP_PAGES,
        )
        raise ApiError(422, "pdf_page_markers_missing", message)
    parts = chunking.parts
    if not parts:
        raise ApiError(400, "empty_upload", "Uploaded document is empty.")

    _write_text_relative(artifact_dir, "chunks/chunking_meta.txt", chunking.meta_text)

    log_event(
        "info",
        "document_chunking_completed",
        ingestion_id=ingestion_id,
        filename=filename,
        chunks_total=len(parts),
        markdown_parts_created=len(parts),
        page_markers_detected=chunking.page_markers_detected,
        total_pages=chunking.total_pages,
        num_parts=DOCUMENT_PART_COUNT,
        overlap_pages=DOCUMENT_PART_OVERLAP_PAGES,
        payload_chars=len(text),
    )

    chunk_graphs: list[DocumentChunkGraph] = []
    for index, part in enumerate(parts, start=1):
        chunk_name = part.part_id
        chunk_file = f"chunks/{part.filename}"
        prompt = build_document_extraction_prompt(
            chunk_text=part.text,
            document_name=filename,
            chunk_file=chunk_file,
            chunk_id=chunk_name,
        )
        _write_text_relative(artifact_dir, chunk_file, part.text)
        _write_text_relative(artifact_dir, f"chunks/{chunk_name}_prompt.txt", prompt)

        log_event(
            "info",
            "document_chunk_started",
            ingestion_id=ingestion_id,
            chunk_index=index,
            chunk_name=chunk_name,
            chunk_file=chunk_file,
            chunk_chars=len(part.text),
            pdf_page_start=part.page_start,
            pdf_page_end=part.page_end,
        )

        gemini_started_at = time.perf_counter()
        try:
            graph, payload = extractor.extract_chunk(chunk_text=part.text, prompt=prompt, chunk_index=index)
        except GeminiExtractionError as exc:
            OBSERVABILITY.observe_gemini(
                attempts=extractor.last_attempts,
                duration_seconds=time.perf_counter() - gemini_started_at,
                success=False,
                code=exc.code,
            )
            if exc.raw_payload is not None:
                _write_json_relative(artifact_dir, f"chunks/{chunk_name}_response.json", exc.raw_payload)
            _write_json_relative(
                artifact_dir,
                f"chunks/{chunk_name}_validation.json",
                {
                    "status": "error",
                    "code": exc.code,
                    "message": str(exc),
                    "validation_errors": exc.validation_errors,
                },
            )
            log_event(
                "error",
                "document_chunk_failed",
                ingestion_id=ingestion_id,
                chunk_index=exc.chunk_index,
                chunk_name=chunk_name,
                chunk_file=chunk_file,
                error_code=exc.code,
                error_message=str(exc),
                validation_errors=exc.validation_errors,
            )
            raise ApiError(
                422,
                exc.code,
                str(exc),
                {"chunk_index": exc.chunk_index, "validation_errors": exc.validation_errors},
            ) from exc

        OBSERVABILITY.observe_gemini(
            attempts=extractor.last_attempts,
            duration_seconds=time.perf_counter() - gemini_started_at,
            success=True,
            code="ok",
        )
        _write_json_relative(artifact_dir, f"chunks/{chunk_name}_response.json", payload)
        _write_json_relative(
            artifact_dir,
            f"chunks/{chunk_name}_validation.json",
            {"status": "ok", "validation_errors": [], "node_count": len(graph.nodes), "edge_count": len(graph.edges)},
        )
        chunk_graphs.append(graph)

        log_event(
            "info",
            "document_chunk_succeeded",
            ingestion_id=ingestion_id,
            chunk_index=index,
            chunk_name=chunk_name,
            chunk_file=chunk_file,
            node_count=len(graph.nodes),
            edge_count=len(graph.edges),
        )

    try:
        merged_graph = merge_document_chunk_graphs(chunk_graphs)
    except GraphValidationError as exc:
        log_event(
            "error",
            "document_graph_merge_failed",
            ingestion_id=ingestion_id,
            error_message=str(exc),
            validation_errors=exc.validation_errors,
        )
        raise ApiError(422, "document_graph_merge_failed", str(exc), {"validation_errors": exc.validation_errors}) from exc

    log_event(
        "info",
        "document_graph_merge_completed",
        ingestion_id=ingestion_id,
        nodes_created=len(merged_graph.nodes),
        edges_created=len(merged_graph.edges),
    )

    persist_document_graph_to_store(
        merged_graph,
        source="document",
        ingestion_id=ingestion_id,
        replace_existing=replace_existing,
    )
    _write_json(artifact_dir, "merged_document_graph.json", model_dump_compat(merged_graph))
    _write_json(artifact_dir, "neo4j_document_payload.json", model_dump_compat(merged_graph))

    log_event(
        "info",
        "document_ingest_completed",
        ingestion_id=ingestion_id,
        filename=filename,
        chunks_total=len(parts),
        markdown_parts_created=len(parts),
        num_parts=DOCUMENT_PART_COUNT,
        overlap_pages=DOCUMENT_PART_OVERLAP_PAGES,
        artifacts_path=str(artifact_dir).replace("\\", "/"),
    )

    return {
        "ingestion_id": ingestion_id,
        "filename": filename,
        "source": "document",
        "chunks_total": len(parts),
        "markdown_parts_created": len(parts),
        "page_markers_detected": chunking.page_markers_detected,
        "total_pages": chunking.total_pages,
        "artifacts_path": str(artifact_dir).replace("\\", "/"),
        "replaced_existing": replace_existing,
        **_document_graph_counts(merged_graph),
    }


@app.on_event("shutdown")
def shutdown_driver() -> None:
    global DRIVER
    if DRIVER is not None:
        DRIVER.close()
        DRIVER = None


@app.middleware("http")
async def instrument_requests(request: Request, call_next):
    started_at = time.perf_counter()
    status_code = 500
    request_id = str(uuid.uuid4())
    REQUEST_ID_CTX.set(request_id)

    OBSERVABILITY.http_in_flight_requests.inc()

    route = request.scope.get("route")
    path = normalize_http_path(request.url.path, getattr(route, "path", None))

    log_event(
        "info",
        "request_started",
        method=request.method,
        path=path,
        client_host=request.client.host if request.client else None,
    )

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id

        log_event(
            "info",
            "request_completed",
            method=request.method,
            path=path,
            status_code=status_code,
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )
        return response

    except Exception as exc:
        OBSERVABILITY.record_api_error("internal_server_error")

        log_event(
            "error",
            "request_failed",
            method=request.method,
            path=path,
            status_code=status_code,
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
            error_type=type(exc).__name__,
            error_message=str(exc),
            traceback=traceback.format_exc(),
        )
        raise

    finally:
        OBSERVABILITY.record_http_request(
            method=request.method,
            path=path,
            status_code=status_code,
            duration_seconds=time.perf_counter() - started_at,
        )
        OBSERVABILITY.http_in_flight_requests.dec()


@app.get("/")
def root():
    log_event("info", "root_requested")
    return {
        "service": "twin_api",
        "status": "ok",
        "environment": get_environment(),
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "metrics": "/metrics",
    }


@app.get("/health")
def health():
    log_event("info", "health_requested")
    return {"status": "ok", "environment": get_environment()}


@app.get("/ready")
def ready():
    healthy, reason = check_neo4j()
    if not healthy:
        OBSERVABILITY.record_api_error("neo4j_unavailable")
        log_event("error", "readiness_failed", dependency="neo4j", reason=reason)
        raise HTTPException(status_code=503, detail={"status": "not_ready", "reason": reason})
    log_event("info", "readiness_succeeded", dependency="neo4j")
    return {"status": "ready", "dependencies": {"neo4j": "ok"}, "environment": get_environment()}


@app.get("/health/neo4j")
def health_neo4j():
    healthy, reason = check_neo4j()
    if not healthy:
        OBSERVABILITY.record_api_error("neo4j_unavailable")
        log_event("error", "neo4j_health_failed", reason=reason)
        raise HTTPException(status_code=503, detail={"neo4j": "bad", "reason": reason})
    log_event("info", "neo4j_health_succeeded")
    return {"neo4j": "ok"}


@app.get("/metrics")
def metrics():
    log_event("info", "metrics_requested")
    payload, content_type = OBSERVABILITY.render_metrics(get_environment())
    return Response(content=payload, media_type=content_type)


@app.get("/ingest/{ingestion_id}/events")
def get_ingestion_events(ingestion_id: str):
    ingestion_id = normalize_ingestion_id(ingestion_id)
    return success_response(INGESTION_EVENTS.get(ingestion_id))


@app.get("/document/ingest/{ingestion_id}/events")
def get_document_ingestion_events(ingestion_id: str):
    ingestion_id = normalize_ingestion_id(ingestion_id)
    return success_response(INGESTION_EVENTS.get(ingestion_id))


@app.post("/seed")
def seed():
    graph = seed_demo_graph()
    log_event(
        "info",
        "seed_completed",
        source="demo",
        nodes_created=len(graph.nodes),
        edges_created=len(graph.edges),
    )
    return success_response(
        {
            "source": "demo",
            "nodes_created": len(graph.nodes),
            "edges_created": len(graph.edges),
            "risk_nodes_scored": len(graph.nodes),
        }
    )


@app.get("/graph")
def get_graph():
    graph = ensure_active_graph()
    log_event(
        "info",
        "graph_requested",
        source=_graph_source(graph),
        node_count=len(graph.nodes),
        edge_count=len(graph.edges),
    )
    return success_response(_serialize_graph(graph))


@app.get("/document/graph")
def get_document_graph():
    graph = fetch_document_graph_from_store()
    log_event(
        "info",
        "document_graph_requested",
        source=graph.source,
        node_count=len(graph.nodes),
        edge_count=len(graph.edges),
    )
    return success_response(_serialize_document_graph(graph))


@app.get("/document/artifacts")
def get_active_document_artifacts():
    graph = fetch_document_graph_from_store()
    if not graph.ingestion_id:
        raise ApiError(404, "document_artifacts_unavailable", "No active document artifact manifest is available.")
    return success_response(_build_document_artifact_manifest(graph.ingestion_id))


@app.get("/document/artifacts/{ingestion_id}")
def get_document_artifacts(ingestion_id: str):
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id)
    return success_response(_build_document_artifact_manifest(normalized_ingestion_id))


@app.get("/document/artifacts/{ingestion_id}/files/{artifact_id}")
def download_document_artifact(ingestion_id: str, artifact_id: str):
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id)
    artifact_dir = get_artifact_dir(normalized_ingestion_id)
    relative_path = _get_document_artifact_relative_path(artifact_dir, artifact_id)
    artifact_path = _artifact_relative_path(artifact_dir, relative_path)
    if not artifact_path.is_file():
        raise ApiError(404, "document_artifact_not_found", "Document artifact is not available for download.")
    return FileResponse(path=artifact_path, filename=artifact_path.name)


@app.get("/document/artifacts/{ingestion_id}/bundle")
def download_document_artifact_bundle(ingestion_id: str):
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id)
    artifact_dir = get_artifact_dir(normalized_ingestion_id)
    allowed_paths = _iter_allowed_document_artifact_paths(artifact_dir)
    if not allowed_paths:
        raise ApiError(404, "document_artifact_not_found", "Document artifact bundle is not available for download.")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for relative_path in allowed_paths:
            artifact_path = _artifact_relative_path(artifact_dir, relative_path)
            if artifact_path.is_file():
                archive.writestr(relative_path, artifact_path.read_bytes())

    buffer.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="{DOCUMENT_ARTIFACT_BUNDLE_FILENAME}"'}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)


@app.get("/impact")
def impact(component_id: str):
    log_event(
        "info",
        "impact_requested",
        component_id=component_id,
    )
    graph = ensure_active_graph()
    if not get_node_by_id(graph, component_id):
        raise ApiError(404, "component_not_found", f"Component '{component_id}' was not found.")
    impacted = get_impacted_components(graph, component_id)
    log_event(
        "info",
        "impact_completed",
        component_id=component_id,
        impact_count=len(impacted),
    )
    return success_response(
        {
            "component_id": component_id,
            "impacted_components": impacted,
            "impact_count": len(impacted),
        }
    )


@app.get("/risk")
def risk(component_id: str):
    log_event(
        "info",
        "risk_requested",
        component_id=component_id,
    )
    graph = ensure_active_graph()
    node = get_node_by_id(graph, component_id)
    if not node:
        raise ApiError(404, "component_not_found", f"Component '{component_id}' was not found.")
    impacted = get_impacted_components(graph, component_id)
    log_event(
        "info",
        "risk_completed",
        component_id=component_id,
        risk_level=node.risk_level,
        risk_score=node.risk_score,
        impact_count=len(impacted),
    )
    return success_response(
        {
            "component_id": component_id,
            "score": node.risk_score,
            "level": node.risk_level,
            "impacted_components": impacted,
            "explanation": node.risk_explanation,
        }
    )


@app.post("/ingest")
def ingest(file: UploadFile = File(...), replace_existing: bool = Form(True), ingestion_id: str | None = Form(None)):
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id) if ingestion_id is not None else None
    if normalized_ingestion_id:
        INGESTION_EVENTS.register(normalized_ingestion_id)
    filename, text = read_upload(file)
    log_event(
        "info",
        "ingest_endpoint_called",
        ingestion_id=normalized_ingestion_id,
        filename=filename,
        replace_existing=replace_existing,
        payload_chars=len(text),
    )
    return success_response(
        run_ingestion_pipeline(
            filename=filename,
            text=text,
            replace_existing=replace_existing,
            ingestion_id=normalized_ingestion_id,
        )
    )


@app.post("/document/ingest")
def document_ingest(
    file: UploadFile = File(...),
    replace_existing: bool = Form(True),
    ingestion_id: str | None = Form(None),
):
    normalized_ingestion_id = normalize_ingestion_id(ingestion_id) if ingestion_id is not None else None
    if normalized_ingestion_id:
        INGESTION_EVENTS.register(normalized_ingestion_id)
    filename, suffix, raw = read_document_upload(file)
    log_event(
        "info",
        "document_ingest_endpoint_called",
        ingestion_id=normalized_ingestion_id,
        filename=filename,
        replace_existing=replace_existing,
        payload_bytes=len(raw),
    )
    effective_ingestion_id = normalize_ingestion_id(normalized_ingestion_id)
    INGESTION_EVENTS.register(effective_ingestion_id, filename)
    converted_markdown = (
        _convert_and_validate_pdf_markdown(raw, ingestion_id=effective_ingestion_id, filename=filename)
        if suffix == ".pdf"
        else None
    )

    thread = Thread(
        target=_run_document_ingestion_background_job,
        kwargs={
            "filename": filename,
            "suffix": suffix,
            "raw": raw,
            "replace_existing": replace_existing,
            "ingestion_id": effective_ingestion_id,
            "converted_markdown": converted_markdown,
        },
        daemon=True,
    )
    thread.start()

    return success_response(
        {
            "ingestion_id": effective_ingestion_id,
            "filename": filename,
            "source": "document",
            "chunks_total": None,
            "markdown_parts_created": None,
            "page_markers_detected": None,
            "total_pages": None,
            "artifacts_path": str(get_artifact_dir(effective_ingestion_id)).replace("\\", "/"),
            "replaced_existing": replace_existing,
            "nodes_created": None,
            "edges_created": None,
            "evidence_items": None,
        }
    )
