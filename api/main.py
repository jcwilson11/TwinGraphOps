from fastapi import FastAPI
from neo4j import GraphDatabase
from pydantic import BaseModel
import os

app = FastAPI()


class IngestRequest(BaseModel):
    text: str


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
            with open(file_path, "r", encoding="utf-8") as f:
                file_value = f.read().strip()
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


NEO4J_URI = _load_secret("NEO4J_URI", default="bolt://neo4j:7687")
NEO4J_USER = _load_secret("NEO4J_USER", default="neo4j")
NEO4J_PASSWORD = _load_secret("NEO4J_PASSWORD", required=True)

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
)

@app.get("/")
def root():
    return {"service": "twin_api", "status": "ok", "docs": "/docs", "health": "/health"}
    

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/neo4j")
def health_neo4j():
    with driver.session() as session:
        r = session.run("RETURN 1 AS ok").single()
        return {"neo4j": "ok" if r["ok"] == 1 else "bad"}


@app.post("/seed")
def seed_graph():
    with driver.session() as session:
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
    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Component)-[:DEPENDS_ON]->(b:Component)
            RETURN a.name AS source, b.name AS target
        """
        )
        edges = [{"source": r["source"], "target": r["target"]} for r in result]
        return {"edges": edges}


@app.get("/impact")
def impact(component: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (c:Component {name: $name})-[:DEPENDS_ON*]->(dependent)
            RETURN dependent.name AS name
        """,
            name=component,
        )

        impacted = [r["name"] for r in result]
        return {"impacted_components": impacted}


@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Accepts simple dependency lines like:
      Frontend -> API
      API -> Database
    Ignores blank lines and lines without '->'.
    """
    lines = req.text.splitlines()

    with driver.session() as session:
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
