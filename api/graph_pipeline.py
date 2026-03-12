import re
from collections import deque

import networkx as nx

from models import ChunkGraph, GraphEdge, GraphNode, MergedGraph, model_validate_compat

EXTRACTION_PROMPT_TEMPLATE = """
You are a systems integration risk analyst.
You read technical manuals and extract a machine-readable graph of components and dependencies.

Extract components and dependencies from the following system description.

Return ONLY valid JSON with this exact schema (no commentary, no markdown):

{{
  "nodes": [
    {{
      "id": "C1",
      "name": "Power Distribution Unit",
      "type": "hardware|software|data|interface|human|other",
      "description": "1-3 sentence description"
    }}
  ],
  "edges": [
    {{
      "source": "C1",
      "target": "C5",
      "relation": "short_verb_phrase",
      "rationale": "1-2 sentence justification"
    }}
  ]
}}

Rules:
- Use short, stable IDs within this chunk (C1, C2, ...).
- Only create edges where there is a clear integration dependency
  (data, control, power, timing, safety).
- Prefer specific relation phrases like "sends_telemetry_to",
  "reads_from", "controls", "supplies_power_to".

TEXT CHUNK START
----------------
{chunk_text}
----------------
TEXT CHUNK END
""".strip()


class GraphValidationError(ValueError):
    def __init__(self, message: str, validation_errors: list[str] | None = None) -> None:
        self.validation_errors = validation_errors or []
        super().__init__(message)


def chunk_text(text: str, max_chars: int = 3000, overlap: int = 400) -> list[str]:
    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(length, start + max_chars)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == length:
            break
        start = max(end - overlap, 0)
    return chunks


def build_extraction_prompt(chunk_text: str) -> str:
    return EXTRACTION_PROMPT_TEMPLATE.format(chunk_text=chunk_text)


def validate_chunk_graph_payload(payload) -> ChunkGraph:
    try:
        graph = model_validate_compat(ChunkGraph, payload)
    except Exception as exc:
        raise GraphValidationError("Chunk graph schema validation failed.", [str(exc)]) from exc

    errors: list[str] = []
    node_ids = set()
    for index, node in enumerate(graph.nodes):
        if not node.id.strip():
            errors.append(f"nodes[{index}].id is missing")
        if not node.name.strip():
            errors.append(f"nodes[{index}].name is missing")
        node_ids.add(node.id)

    for index, edge in enumerate(graph.edges):
        if not edge.source.strip():
            errors.append(f"edges[{index}].source is missing")
        if not edge.target.strip():
            errors.append(f"edges[{index}].target is missing")
        if edge.source == edge.target:
            errors.append(f"edges[{index}] contains a self-loop")
        if edge.source not in node_ids:
            errors.append(f"edges[{index}].source references unknown node '{edge.source}'")
        if edge.target not in node_ids:
            errors.append(f"edges[{index}].target references unknown node '{edge.target}'")

    if errors:
        raise GraphValidationError("Chunk graph business validation failed.", errors)
    return graph


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).lower()


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "component"


def merge_chunk_graphs(chunk_graphs: list[ChunkGraph]) -> MergedGraph:
    nodes_by_name: dict[str, GraphNode] = {}
    name_to_id: dict[str, str] = {}
    edges_seen: set[tuple[str, str, str]] = set()
    merged_edges: list[GraphEdge] = []

    for chunk_graph in chunk_graphs:
        local_id_to_name: dict[str, str] = {}
        for node in chunk_graph.nodes:
            normalized = _normalize_name(node.name)
            local_id_to_name[node.id] = normalized
            if normalized not in nodes_by_name:
                slug = _slugify(node.name)
                candidate = slug
                suffix = 2
                while candidate in name_to_id.values():
                    candidate = f"{slug}-{suffix}"
                    suffix += 1
                name_to_id[normalized] = candidate
                nodes_by_name[normalized] = GraphNode(
                    id=candidate,
                    name=node.name.strip(),
                    type=node.type.strip() or "other",
                    description=node.description.strip(),
                )
            else:
                existing = nodes_by_name[normalized]
                if existing.type == "other" and node.type.strip():
                    existing.type = node.type.strip()
                if len(node.description.strip()) > len(existing.description):
                    existing.description = node.description.strip()

        for edge in chunk_graph.edges:
            source_name = local_id_to_name.get(edge.source)
            target_name = local_id_to_name.get(edge.target)
            if not source_name or not target_name:
                raise GraphValidationError(
                    "Merged graph contains an edge referencing an unknown node.",
                    [f"Unknown edge mapping: {edge.source} -> {edge.target}"],
                )
            merged_edge = GraphEdge(
                source=name_to_id[source_name],
                target=name_to_id[target_name],
                relation=edge.relation.strip() or "depends_on",
                rationale=edge.rationale.strip(),
            )
            edge_key = (merged_edge.source, merged_edge.target, merged_edge.relation)
            if edge_key not in edges_seen:
                edges_seen.add(edge_key)
                merged_edges.append(merged_edge)

    return MergedGraph(nodes=sorted(nodes_by_name.values(), key=lambda node: node.name), edges=merged_edges)


def _build_nx_graph(graph: MergedGraph) -> nx.DiGraph:
    digraph = nx.DiGraph()
    for node in graph.nodes:
        digraph.add_node(node.id, name=node.name)
    for edge in graph.edges:
        digraph.add_edge(edge.source, edge.target, relation=edge.relation)
    return digraph


def _reachable_count(digraph: nx.DiGraph, start: str, reverse: bool = False) -> int:
    working_graph = digraph.reverse(copy=False) if reverse else digraph
    visited = set()
    queue: deque[str] = deque([start])
    while queue:
        current = queue.popleft()
        for neighbor in working_graph.successors(current):
            if neighbor == start or neighbor in visited:
                continue
            visited.add(neighbor)
            queue.append(neighbor)
    return len(visited)


def _normalize_metric(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return value / max_value


def _risk_level(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def _risk_explanation(
    *,
    name: str,
    level: str,
    blast_radius: int,
    dependency_span: int,
    degree_norm: float,
    betweenness_norm: float,
) -> str:
    reasons: list[str] = []
    if blast_radius > 0:
        reasons.append("has a large blast radius" if blast_radius > 2 else "can impact dependent components")
    if dependency_span > 1:
        reasons.append("depends on several downstream components")
    if degree_norm >= 0.5 or betweenness_norm >= 0.5:
        reasons.append("has above-average structural centrality")
    if not reasons:
        reasons.append("sits at the edge of the graph with limited propagation paths")
    return f"{level.capitalize()} risk because {name} " + " and ".join(reasons) + "."


def compute_graph_metrics(graph: MergedGraph) -> MergedGraph:
    digraph = _build_nx_graph(graph)
    degrees = dict(digraph.degree())
    betweenness = nx.betweenness_centrality(digraph) if digraph.nodes else {}
    closeness = nx.closeness_centrality(digraph) if digraph.nodes else {}

    blast_radius = {node.id: _reachable_count(digraph, node.id, reverse=True) for node in graph.nodes}
    dependency_span = {node.id: _reachable_count(digraph, node.id, reverse=False) for node in graph.nodes}

    max_degree = max(degrees.values(), default=0)
    max_betweenness = max(betweenness.values(), default=0.0)
    max_blast_radius = max(blast_radius.values(), default=0)
    max_dependency_span = max(dependency_span.values(), default=0)

    for node in graph.nodes:
        degree_value = float(degrees.get(node.id, 0.0))
        betweenness_value = float(betweenness.get(node.id, 0.0))
        closeness_value = float(closeness.get(node.id, 0.0))
        blast_radius_value = int(blast_radius.get(node.id, 0))
        dependency_span_value = int(dependency_span.get(node.id, 0))

        degree_norm = _normalize_metric(degree_value, max_degree)
        betweenness_norm = _normalize_metric(betweenness_value, max_betweenness)
        blast_norm = _normalize_metric(blast_radius_value, max_blast_radius)
        dependency_norm = _normalize_metric(dependency_span_value, max_dependency_span)

        score = round(
            (
                0.45 * blast_norm
                + 0.20 * dependency_norm
                + 0.20 * degree_norm
                + 0.15 * betweenness_norm
            )
            * 100
        )

        node.degree = degree_value
        node.betweenness = betweenness_value
        node.closeness = closeness_value
        node.blast_radius = blast_radius_value
        node.dependency_span = dependency_span_value
        node.risk_score = score
        node.risk_level = _risk_level(score)
        node.risk_explanation = _risk_explanation(
            name=node.name,
            level=node.risk_level,
            blast_radius=blast_radius_value,
            dependency_span=dependency_span_value,
            degree_norm=degree_norm,
            betweenness_norm=betweenness_norm,
        )

    return graph


def build_demo_graph() -> MergedGraph:
    return MergedGraph(
        nodes=[
            GraphNode(id="frontend", name="Frontend", type="software", description="User-facing web interface.", source="demo"),
            GraphNode(id="api", name="API", type="software", description="FastAPI entrypoint for graph ingestion and queries.", source="demo"),
            GraphNode(id="graph-service", name="Graph Service", type="software", description="Queries and persists graph state.", source="demo"),
            GraphNode(id="risk-service", name="Risk Service", type="software", description="Computes risk and impact views.", source="demo"),
            GraphNode(id="neo4j", name="Neo4j", type="data", description="Graph database backing the digital twin.", source="demo"),
        ],
        edges=[
            GraphEdge(source="frontend", target="api", relation="depends_on", rationale="Frontend calls the API."),
            GraphEdge(source="api", target="graph-service", relation="depends_on", rationale="API queries the graph service."),
            GraphEdge(source="graph-service", target="neo4j", relation="depends_on", rationale="Graph service stores data in Neo4j."),
            GraphEdge(source="api", target="risk-service", relation="depends_on", rationale="API requests risk scoring."),
            GraphEdge(source="risk-service", target="graph-service", relation="depends_on", rationale="Risk service reads graph structure."),
        ],
    )


def get_node_by_id(graph: MergedGraph, component_id: str) -> GraphNode | None:
    for node in graph.nodes:
        if node.id == component_id:
            return node
    return None


def get_impacted_components(graph: MergedGraph, component_id: str) -> list[str]:
    digraph = _build_nx_graph(graph)
    reverse_graph = digraph.reverse(copy=False)
    if component_id not in reverse_graph:
        return []
    return sorted(node for node in nx.descendants(reverse_graph, component_id) if node != component_id)
