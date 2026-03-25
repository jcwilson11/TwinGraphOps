import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from neo4j import GraphDatabase

from gemini_client import GeminiExtractionError, GeminiGraphExtractor
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
from models import ChunkGraph, GraphEdge, GraphNode, MergedGraph, model_dump_compat

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

APP_START_TIME = time.time()
METRICS_LOCK = Lock()
REQUEST_METRICS = {"total": 0, "by_path": {}}
DRIVER_LOCK = Lock()
DRIVER = None


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


@app.exception_handler(ApiError)
def handle_api_error(_, exc: ApiError) -> JSONResponse:
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


def record_request(path: str) -> None:
    with METRICS_LOCK:
        REQUEST_METRICS["total"] += 1
        REQUEST_METRICS["by_path"][path] = REQUEST_METRICS["by_path"].get(path, 0) + 1


def render_metrics() -> str:
    with METRICS_LOCK:
        total_requests = REQUEST_METRICS["total"]
        by_path = dict(REQUEST_METRICS["by_path"])

    uptime_seconds = max(time.time() - APP_START_TIME, 0)
    lines = [
        "# HELP twingraphops_requests_total Total HTTP requests served by the API.",
        "# TYPE twingraphops_requests_total counter",
        f"twingraphops_requests_total {total_requests}",
        "# HELP twingraphops_endpoint_requests_total Requests served by endpoint path.",
        "# TYPE twingraphops_endpoint_requests_total counter",
    ]
    for path, count in sorted(by_path.items()):
        safe_path = path.replace('"', '\\"')
        lines.append(f'twingraphops_endpoint_requests_total{{path="{safe_path}"}} {count}')
    lines.extend(
        [
            "# HELP twingraphops_uptime_seconds Seconds since the API process started.",
            "# TYPE twingraphops_uptime_seconds gauge",
            f"twingraphops_uptime_seconds {uptime_seconds:.0f}",
            "# HELP twingraphops_environment_info Current application environment.",
            "# TYPE twingraphops_environment_info gauge",
            f'twingraphops_environment_info{{environment="{get_environment()}"}} 1',
        ]
    )
    return "\n".join(lines) + "\n"


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
    )


def get_artifacts_root() -> Path:
    return Path(os.getenv("ARTIFACTS_DIR", "runtime/artifacts"))


def check_neo4j() -> tuple[bool, str | None]:
    try:
        with get_driver().session() as session:
            result = session.run("RETURN 1 AS ok").single()
            if result and result["ok"] == 1:
                return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)
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


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_text(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


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
    with get_driver().session() as session:
        session.execute_write(_write_graph_tx, graph, source, ingestion_id, replace_existing)


def fetch_graph_from_store() -> MergedGraph:
    with get_driver().session() as session:
        node_records = list(
            session.run(
                """
                MATCH (c:Component)
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
                MATCH (a:Component)-[r:DEPENDS_ON]->(b:Component)
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
    return MergedGraph(nodes=nodes, edges=edges)


def seed_demo_graph() -> MergedGraph:
    graph = compute_graph_metrics(build_demo_graph())
    persist_graph_to_store(graph, source="demo", ingestion_id="demo-seed", replace_existing=True)
    return graph


def ensure_active_graph() -> MergedGraph:
    graph = fetch_graph_from_store()
    if graph.nodes:
        return graph
    return seed_demo_graph()


def run_ingestion_pipeline(filename: str, text: str, replace_existing: bool) -> dict[str, Any]:
    ingestion_id = str(uuid.uuid4())
    artifact_dir = get_artifacts_root() / ingestion_id
    try:
        extractor = get_gemini_client()
    except RuntimeError as exc:
        raise ApiError(500, "gemini_not_configured", str(exc)) from exc

    chunks = chunk_text(
        text,
        max_chars=int(os.getenv("GEMINI_MAX_CHARS", "2400")),
        overlap=int(os.getenv("GEMINI_CHUNK_OVERLAP", "200")),
    )
    if not chunks:
        raise ApiError(400, "empty_upload", "Uploaded file is empty.")

    _write_text(artifact_dir / "source_document.md", text)

    chunk_graphs: list[ChunkGraph] = []
    for index, chunk in enumerate(chunks, start=1):
        prompt = build_extraction_prompt(chunk)
        chunk_name = f"chunk_{index:02d}"
        _write_text(artifact_dir / f"{chunk_name}.txt", chunk)
        _write_text(artifact_dir / f"{chunk_name}_prompt.txt", prompt)

        try:
            graph, payload = extractor.extract_chunk(chunk_text=chunk, prompt=prompt, chunk_index=index)
        except GeminiExtractionError as exc:
            if exc.raw_payload is not None:
                _write_json(artifact_dir / f"{chunk_name}_response.json", exc.raw_payload)
            _write_json(
                artifact_dir / f"{chunk_name}_validation.json",
                {
                    "status": "error",
                    "code": exc.code,
                    "message": str(exc),
                    "validation_errors": exc.validation_errors,
                },
            )
            raise ApiError(
                422,
                exc.code,
                str(exc),
                {"chunk_index": exc.chunk_index, "validation_errors": exc.validation_errors},
            ) from exc

        _write_json(artifact_dir / f"{chunk_name}_response.json", payload)
        _write_json(
            artifact_dir / f"{chunk_name}_validation.json",
            {"status": "ok", "validation_errors": [], "node_count": len(graph.nodes), "edge_count": len(graph.edges)},
        )
        chunk_graphs.append(graph)

    try:
        merged_graph = compute_graph_metrics(merge_chunk_graphs(chunk_graphs))
    except GraphValidationError as exc:
        raise ApiError(422, "graph_merge_failed", str(exc), {"validation_errors": exc.validation_errors}) from exc

    persist_graph_to_store(merged_graph, source="user", ingestion_id=ingestion_id, replace_existing=replace_existing)
    _write_json(artifact_dir / "merged_graph.json", model_dump_compat(merged_graph))
    _write_json(artifact_dir / "neo4j_payload.json", model_dump_compat(merged_graph))
    _write_json(artifact_dir / "risk_summary.json", _risk_summary(merged_graph))

    return {
        "ingestion_id": ingestion_id,
        "filename": filename,
        "source": "user",
        "chunks_total": len(chunks),
        "artifacts_path": str(artifact_dir).replace("\\", "/"),
        "replaced_existing": replace_existing,
        **_graph_counts(merged_graph),
    }


@app.on_event("shutdown")
def shutdown_driver() -> None:
    global DRIVER
    if DRIVER is not None:
        DRIVER.close()
        DRIVER = None


@app.get("/")
def root():
    record_request("/")
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
    record_request("/health")
    return {"status": "ok", "environment": get_environment()}


@app.get("/ready")
def ready():
    record_request("/ready")
    healthy, reason = check_neo4j()
    if not healthy:
        raise HTTPException(status_code=503, detail={"status": "not_ready", "reason": reason})
    return {"status": "ready", "dependencies": {"neo4j": "ok"}, "environment": get_environment()}


@app.get("/health/neo4j")
def health_neo4j():
    record_request("/health/neo4j")
    healthy, reason = check_neo4j()
    if not healthy:
        raise HTTPException(status_code=503, detail={"neo4j": "bad", "reason": reason})
    return {"neo4j": "ok"}


@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    record_request("/metrics")
    return render_metrics()


@app.post("/seed")
def seed():
    record_request("/seed")
    graph = seed_demo_graph()
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
    record_request("/graph")
    return success_response(_serialize_graph(ensure_active_graph()))


@app.get("/impact")
def impact(component_id: str):
    record_request("/impact")
    graph = ensure_active_graph()
    if not get_node_by_id(graph, component_id):
        raise ApiError(404, "component_not_found", f"Component '{component_id}' was not found.")
    impacted = get_impacted_components(graph, component_id)
    return success_response(
        {
            "component_id": component_id,
            "impacted_components": impacted,
            "impact_count": len(impacted),
        }
    )


@app.get("/risk")
def risk(component_id: str):
    record_request("/risk")
    graph = ensure_active_graph()
    node = get_node_by_id(graph, component_id)
    if not node:
        raise ApiError(404, "component_not_found", f"Component '{component_id}' was not found.")
    impacted = get_impacted_components(graph, component_id)
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
def ingest(file: UploadFile = File(...), replace_existing: bool = Form(True)):
    record_request("/ingest")
    filename, text = read_upload(file)
    return success_response(run_ingestion_pipeline(filename=filename, text=text, replace_existing=replace_existing))
