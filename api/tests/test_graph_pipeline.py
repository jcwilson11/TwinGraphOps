import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from graph_pipeline import chunk_text, compute_graph_metrics, get_impacted_components, merge_chunk_graphs
from models import ChunkEdge, ChunkGraph, ChunkNode


class GraphPipelineTests(unittest.TestCase):
    def test_chunk_text_applies_overlap(self):
        text = "A" * 3500
        chunks = chunk_text(text, max_chars=3000, overlap=400)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0][-400:], chunks[1][:400])

    def test_merge_chunk_graphs_deduplicates_components_by_name(self):
        chunk_a = ChunkGraph(
            nodes=[
                ChunkNode(id="C1", name="API Gateway", type="software", description="Entry point"),
                ChunkNode(id="C2", name="Graph Store", type="data", description="Neo4j"),
            ],
            edges=[ChunkEdge(source="C1", target="C2", relation="reads_from", rationale="Queries graph data")],
        )
        chunk_b = ChunkGraph(
            nodes=[
                ChunkNode(id="C1", name="api gateway", type="software", description="Longer entry point description"),
                ChunkNode(id="C2", name="Risk Engine", type="software", description="Scores risk"),
            ],
            edges=[ChunkEdge(source="C1", target="C2", relation="calls", rationale="Requests scoring")],
        )
        merged = merge_chunk_graphs([chunk_a, chunk_b])
        self.assertEqual(len(merged.nodes), 3)
        api_gateway = next(node for node in merged.nodes if node.id == "api-gateway")
        self.assertIn("Longer", api_gateway.description)

    def test_compute_graph_metrics_assigns_scores(self):
        graph = merge_chunk_graphs(
            [
                ChunkGraph(
                    nodes=[
                        ChunkNode(id="C1", name="Frontend", type="software", description="UI"),
                        ChunkNode(id="C2", name="API", type="software", description="Backend"),
                        ChunkNode(id="C3", name="Neo4j", type="data", description="Database"),
                    ],
                    edges=[
                        ChunkEdge(source="C1", target="C2", relation="depends_on", rationale="Calls API"),
                        ChunkEdge(source="C2", target="C3", relation="depends_on", rationale="Stores graph"),
                    ],
                )
            ]
        )
        scored = compute_graph_metrics(graph)
        api = next(node for node in scored.nodes if node.id == "api")
        self.assertGreater(api.risk_score, 0)
        self.assertIn(api.risk_level, {"low", "medium", "high"})

    def test_get_impacted_components_uses_reverse_dependencies(self):
        graph = compute_graph_metrics(
            merge_chunk_graphs(
                [
                    ChunkGraph(
                        nodes=[
                            ChunkNode(id="C1", name="Frontend", type="software", description="UI"),
                            ChunkNode(id="C2", name="API", type="software", description="Backend"),
                            ChunkNode(id="C3", name="Graph Store", type="data", description="Database"),
                        ],
                        edges=[
                            ChunkEdge(source="C1", target="C2", relation="depends_on", rationale="Calls API"),
                            ChunkEdge(source="C2", target="C3", relation="depends_on", rationale="Reads store"),
                        ],
                    )
                ]
            )
        )
        self.assertEqual(get_impacted_components(graph, "api"), ["frontend"])
