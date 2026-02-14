from fastapi import FastAPI
from neo4j import GraphDatabase
from pydantic import BaseModel
import os

app = FastAPI()

class IngestRequest(BaseModel):
    text: str

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD") 

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)

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
        session.run("""
            MERGE (a:Component {name: 'API'})
            MERGE (b:Component {name: 'Database'})
            MERGE (c:Component {name: 'Frontend'})
            MERGE (a)-[:DEPENDS_ON]->(b)
            MERGE (c)-[:DEPENDS_ON]->(a)
        """)
    return {"status": "seeded"}

@app.get("/graph")
def get_graph():
    with driver.session() as session:
        result = session.run("""
            MATCH (a:Component)-[:DEPENDS_ON]->(b:Component)
            RETURN a.name AS source, b.name AS target
        """)
        edges = [{"source": r["source"], "target": r["target"]} for r in result]
        return {"edges": edges}

@app.get("/impact")
def impact(component: str):
    with driver.session() as session:
        result = session.run("""
            MATCH (c:Component {name: $name})-[:DEPENDS_ON*]->(dependent)
            RETURN dependent.name AS name
        """, name=component)

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

            session.run("""
                MERGE (a:Component {name: $source})
                MERGE (b:Component {name: $target})
                MERGE (a)-[:DEPENDS_ON]->(b)
            """, source=source, target=target)

    return {"status": "ingested", "lines_processed": len(lines)}

