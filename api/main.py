import os
import time
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from neo4j import GraphDatabase
from pydantic import BaseModel

app = FastAPI(title="TwinGraphOps API")


class IngestRequest(BaseModel):
    text: str


APP_START_TIME = time.time()
METRICS_LOCK = Lock()
REQUEST_METRICS = {"total": 0, "by_path": {}}
DRIVER_LOCK = Lock()
DRIVER = None


def _load_secret(env_var: str, default: str | None = None, required: bool = False) -> str | None:
    """
    Load a value directly from ENV or from an *_FILE path.

    Precedence:
      1. <ENV_VAR>
      2. <ENV_VAR>_FILE contents
      3. default
    """
    direct_value = os.getenv(env_var)
    if direct_value:
        return direct_value

    file_var = f"{env_var}_FILE"
    file_path = os.getenv(file_var)
    if file_path:
        try:
            with open(file_path, "r", encoding="utf-8") as file_handle:
                file_value = file_handle.read().strip()
        except OSError as exc:
            raise RuntimeError(f"Unable to read secret file from {file_var}={file_path}: {exc}") from exc

        if file_value:
            return file_value

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
            neo4j_uri = _load_secret("NEO4J_URI", default="bolt://neo4j:7687")
            neo4j_user = _load_secret("NEO4J_USER", default="neo4j")
            neo4j_password = _load_secret("NEO4J_PASSWORD", required=True)
            DRIVER = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    return DRIVER


def check_neo4j() -> tuple[bool, str | None]:
    try:
        with get_driver().session() as session:
            result = session.run("RETURN 1 AS ok").single()
            if result and result["ok"] == 1:
                return True, None
    except Exception as exc:  # pragma: no cover - exercised in runtime smoke tests
        return False, str(exc)

    return False, "Neo4j returned an unexpected response."


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
def seed_graph():
    record_request("/seed")
    with get_driver().session() as session:
        session.run(
            """
            MERGE (a:Component {name: 'API'})
            MERGE (b:Component {name: 'Database'})
            MERGE (c:Component {name: 'Frontend'})
            MERGE (a)-[:DEPENDS_ON]->(b)
            MERGE (c)-[:DEPENDS_ON]->(a)
        """
        )
    return {"status": "seeded"}


@app.get("/graph")
def get_graph():
    record_request("/graph")
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (a:Component)-[:DEPENDS_ON]->(b:Component)
            RETURN a.name AS source, b.name AS target
        """
        )
        edges = [{"source": record["source"], "target": record["target"]} for record in result]
        return {"edges": edges}


@app.get("/impact")
def impact(component: str):
    record_request("/impact")
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (c:Component {name: $name})-[:DEPENDS_ON*]->(dependent)
            RETURN dependent.name AS name
        """,
            name=component,
        )

        impacted = [record["name"] for record in result]
        return {"impacted_components": impacted}


@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Accepts simple dependency lines like:
      Frontend -> API
      API -> Database
    Ignores blank lines and lines without '->'.
    """
    record_request("/ingest")
    lines = req.text.splitlines()

    with get_driver().session() as session:
        for line in lines:
            line = line.strip()
            if not line or "->" not in line:
                continue

            source, target = line.split("->", 1)
            source = source.strip()
            target = target.strip()

            if not source or not target:
                continue

            session.run(
                """
                MERGE (a:Component {name: $source})
                MERGE (b:Component {name: $target})
                MERGE (a)-[:DEPENDS_ON]->(b)
            """,
                source=source,
                target=target,
            )

    return {"status": "ingested", "lines_processed": len(lines)}
