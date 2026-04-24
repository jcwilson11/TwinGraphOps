import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
from gemini_client import GeminiExtractionError
from observability import Observability
from graph_pipeline import build_demo_graph, compute_graph_metrics
from models import ChunkGraph, ChunkEdge, ChunkNode, MergedGraph, model_dump_compat


class FakeExtractor:
    def __init__(self, graph: ChunkGraph | None = None, error: Exception | None = None, last_attempts: int = 1) -> None:
        self.graph = graph
        self.error = error
        self.last_attempts = last_attempts

    def extract_chunk(self, chunk_text: str, prompt: str, chunk_index: int):
        del chunk_text
        del prompt
        del chunk_index
        if self.error is not None:
            raise self.error
        return self.graph, model_dump_compat(self.graph)


class TwinGraphOpsApiTests(unittest.TestCase):
    def setUp(self):
        main.OBSERVABILITY = Observability()
        self.client = TestClient(main.app)

    def _metrics_text(self) -> str:
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        return response.text

    def test_root_exposes_operational_routes(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["ready"], "/ready")
        self.assertEqual(payload["metrics"], "/metrics")

    def test_ready_reports_dependency_state(self):
        with patch.object(main, "check_neo4j", return_value=(True, None)):
            response = main.ready()
        self.assertEqual(response["status"], "ready")
        self.assertEqual(response["dependencies"]["neo4j"], "ok")

    def test_ready_returns_503_when_dependency_is_unavailable(self):
        with patch.object(main, "check_neo4j", return_value=(False, "Neo4j unavailable")):
            with self.assertRaises(HTTPException) as context:
                main.ready()
        self.assertEqual(context.exception.status_code, 503)

    def test_metrics_include_request_totals(self):
        self.client.get("/")
        self.client.get("/health")
        metrics_payload = self._metrics_text()
        self.assertIn("twingraphops_requests_total 2.0", metrics_payload)
        self.assertIn('twingraphops_endpoint_requests_total{path="/"} 1.0', metrics_payload)
        self.assertIn('twingraphops_endpoint_requests_total{path="/health"} 1.0', metrics_payload)
        self.assertIn('twingraphops_http_requests_total{method="GET",path="/",status="200"} 1.0', metrics_payload)
        self.assertIn(
            'twingraphops_http_requests_total{method="GET",path="/health",status="200"} 1.0',
            metrics_payload,
        )
        self.assertIn(f'twingraphops_environment_info{{environment="{main.get_environment()}"}} 1.0', metrics_payload)

    def test_ready_failure_updates_dependency_and_error_metrics(self):
        with patch.object(main, "get_driver", side_effect=RuntimeError("Neo4j unavailable")):
            response = self.client.get("/ready")
        self.assertEqual(response.status_code, 503)

        metrics_payload = self._metrics_text()
        self.assertIn("twingraphops_dependency_neo4j_up 0.0", metrics_payload)
        self.assertIn('twingraphops_api_errors_total{code="neo4j_unavailable"} 1.0', metrics_payload)

    def test_graph_auto_seeds_demo_when_store_is_empty(self):
        with patch.object(main, "fetch_graph_from_store", return_value=MergedGraph()), patch.object(
            main, "persist_graph_to_store"
        ):
            response = self.client.get("/graph")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["source"], "demo")
        self.assertGreaterEqual(len(payload["data"]["nodes"]), 1)

    def test_seed_returns_consistent_counts(self):
        with patch.object(main, "persist_graph_to_store"):
            response = self.client.post("/seed")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["data"]
        self.assertEqual(payload["source"], "demo")
        self.assertGreater(payload["nodes_created"], 0)
        self.assertGreater(payload["edges_created"], 0)

    def test_impact_and_risk_use_same_graph(self):
        graph = compute_graph_metrics(build_demo_graph())
        with patch.object(main, "ensure_active_graph", return_value=graph):
            impact_response = self.client.get("/impact", params={"component_id": "graph-service"})
            risk_response = self.client.get("/risk", params={"component_id": "graph-service"})
        self.assertEqual(impact_response.status_code, 200)
        self.assertEqual(risk_response.status_code, 200)
        impacted = impact_response.json()["data"]["impacted_components"]
        risk_payload = risk_response.json()["data"]
        self.assertEqual(impacted, risk_payload["impacted_components"])
        self.assertIn(risk_payload["level"], {"low", "medium", "high"})

    def test_ingest_rejects_unsupported_extension(self):
        response = self.client.post(
            "/ingest",
            files={"file": ("manual.pdf", io.BytesIO(b"pdf"), "application/pdf")},
        )
        self.assertEqual(response.status_code, 415)
        self.assertEqual(response.json()["error"]["code"], "unsupported_file_type")

    def test_ingest_rejects_empty_upload(self):
        response = self.client.post(
            "/ingest",
            files={"file": ("manual.md", io.BytesIO(b""), "text/markdown")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "empty_upload")

    def test_ingest_rejects_unsafe_ingestion_id(self):
        response = self.client.post(
            "/ingest",
            files={"file": ("manual.md", io.BytesIO(b"Example manual text"), "text/markdown")},
            data={"ingestion_id": "../escape"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_ingestion_id")

    def test_ingest_persists_graph_and_artifacts(self):
        chunk_graph = ChunkGraph(
            nodes=[
                ChunkNode(id="C1", name="Frontend", type="software", description="UI"),
                ChunkNode(id="C2", name="API", type="software", description="Backend"),
            ],
            edges=[ChunkEdge(source="C1", target="C2", relation="depends_on", rationale="Calls the API")],
        )
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            main, "get_gemini_client", return_value=FakeExtractor(graph=chunk_graph)
        ), patch.object(main, "persist_graph_to_store") as persist_graph, patch.object(
            main, "get_artifacts_root", return_value=Path(tmpdir)
        ):
            response = self.client.post(
                "/ingest",
                files={"file": ("manual.md", io.BytesIO(b"Example manual text"), "text/markdown")},
                data={"replace_existing": "true"},
            )
            self.assertTrue((Path(response.json()["data"]["artifacts_path"]) / "merged_graph.json").exists())

        self.assertEqual(response.status_code, 200)
        payload = response.json()["data"]
        self.assertEqual(payload["source"], "user")
        self.assertEqual(payload["chunks_total"], 1)
        persist_graph.assert_called_once()

    def test_ingest_accepts_safe_client_supplied_ingestion_id(self):
        chunk_graph = ChunkGraph(
            nodes=[ChunkNode(id="C1", name="Frontend", type="software", description="UI")],
            edges=[],
        )
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            main, "get_gemini_client", return_value=FakeExtractor(graph=chunk_graph)
        ), patch.object(main, "persist_graph_to_store"), patch.object(
            main, "get_artifacts_root", return_value=Path(tmpdir)
        ):
            response = self.client.post(
                "/ingest",
                files={"file": ("manual.md", io.BytesIO(b"Example manual text"), "text/markdown")},
                data={"ingestion_id": "client_ingest-01"},
            )

            self.assertEqual(response.status_code, 200)
            payload = response.json()["data"]
            self.assertEqual(payload["ingestion_id"], "client_ingest-01")
            self.assertTrue((Path(payload["artifacts_path"]) / "merged_graph.json").exists())

    def test_get_ingestion_events_rejects_unsafe_ingestion_id(self):
        response = self.client.get("/ingest/bad.id/events")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_ingestion_id")

    def test_ingest_fails_closed_when_gemini_chunk_is_invalid(self):
        error = GeminiExtractionError(
            code="gemini_extraction_failed",
            chunk_index=1,
            validation_errors=["edges[0].source is missing"],
            raw_payload={"nodes": [], "edges": [{}]},
        )
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            main, "get_gemini_client", return_value=FakeExtractor(error=error)
        ), patch.object(main, "persist_graph_to_store") as persist_graph, patch.object(
            main, "get_artifacts_root", return_value=Path(tmpdir)
        ):
            response = self.client.post(
                "/ingest",
                files={"file": ("manual.md", io.BytesIO(b"Example manual text"), "text/markdown")},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "gemini_extraction_failed")
        persist_graph.assert_not_called()

        metrics_payload = self._metrics_text()
        self.assertIn('twingraphops_gemini_requests_total{code="gemini_extraction_failed",result="error"} 1.0', metrics_payload)
        self.assertIn('twingraphops_ingest_failures_total{code="gemini_extraction_failed"} 1.0', metrics_payload)

    def test_ingest_surfaces_gemini_timeout_errors(self):
        error = GeminiExtractionError(
            code="gemini_request_timeout",
            chunk_index=1,
            validation_errors=["The Gemini request timed out."],
        )
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            main, "get_gemini_client", return_value=FakeExtractor(error=error, last_attempts=2)
        ), patch.object(main, "persist_graph_to_store") as persist_graph, patch.object(
            main, "get_artifacts_root", return_value=Path(tmpdir)
        ):
            response = self.client.post(
                "/ingest",
                files={"file": ("manual.md", io.BytesIO(b"Example manual text"), "text/markdown")},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "gemini_request_timeout")
        persist_graph.assert_not_called()

        metrics_payload = self._metrics_text()
        self.assertIn('twingraphops_gemini_requests_total{code="gemini_request_timeout",result="error"} 2.0', metrics_payload)
        self.assertIn("twingraphops_gemini_retries_total 1.0", metrics_payload)
        self.assertIn("twingraphops_gemini_timeouts_total 1.0", metrics_payload)

    def test_seed_updates_graph_summary_metrics(self):
        with patch.object(main, "persist_graph_to_store"):
            response = self.client.post("/seed")
        self.assertEqual(response.status_code, 200)

        metrics_payload = self._metrics_text()
        self.assertIn("twingraphops_graph_nodes 5.0", metrics_payload)
        self.assertIn("twingraphops_graph_edges 5.0", metrics_payload)
        self.assertIn("twingraphops_graph_average_risk_score", metrics_payload)
