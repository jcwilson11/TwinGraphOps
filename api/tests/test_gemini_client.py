import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_client import GeminiDocumentGraphExtractor, GeminiExtractionError, GeminiGraphExtractor


class FakeResponse:
    def __init__(self, text=None, parsed=None):
        self.text = text
        self.parsed = parsed


class GeminiClientTests(unittest.TestCase):
    def test_extract_chunk_returns_valid_graph(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=1, backoff_seconds=0)
        payload = {
            "nodes": [
                {"id": "C1", "name": "API", "type": "software", "description": "Backend"},
                {"id": "C2", "name": "Neo4j", "type": "data", "description": "Graph store"},
            ],
            "edges": [{"source": "C1", "target": "C2", "relation": "depends_on", "rationale": "Stores data"}],
        }
        with patch.object(extractor, "_generate_payload", return_value=FakeResponse(text=json.dumps(payload))):
            graph, raw_payload = extractor.extract_chunk("chunk", "prompt", 1)
        self.assertEqual(len(graph.nodes), 2)
        self.assertEqual(raw_payload["nodes"][0]["name"], "API")

    def test_extract_chunk_retries_transient_failure(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=1)
        payload = {
            "nodes": [
                {"id": "C1", "name": "API", "type": "software", "description": "Backend"},
                {"id": "C2", "name": "Neo4j", "type": "data", "description": "Graph store"},
            ],
            "edges": [{"source": "C1", "target": "C2", "relation": "depends_on", "rationale": "Stores data"}],
        }
        with patch.object(
            extractor,
            "_generate_payload",
            side_effect=[RuntimeError("temporary failure"), FakeResponse(text=json.dumps(payload))],
        ):
            graph, _ = extractor.extract_chunk("chunk", "prompt", 2)
        self.assertEqual(graph.edges[0].target, "C2")

    def test_extract_chunk_surfaces_validation_errors(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=1)
        invalid_payload = {
            "nodes": [{"id": "C1", "name": "API", "type": "software", "description": "Backend"}],
            "edges": [{"source": "C2", "target": "C1", "relation": "depends_on", "rationale": "Invalid"}],
        }
        with patch.object(extractor, "_generate_payload", return_value=FakeResponse(text=json.dumps(invalid_payload))):
            with self.assertRaises(GeminiExtractionError) as context:
                extractor.extract_chunk("chunk", "prompt", 3)
        self.assertEqual(context.exception.chunk_index, 3)
        self.assertIn("unknown node", context.exception.validation_errors[0])

    def test_extract_chunk_marks_timeout_failures(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=0)
        with patch.object(extractor, "_generate_payload", side_effect=TimeoutError("request timed out")):
            with self.assertRaises(GeminiExtractionError) as context:
                extractor.extract_chunk("chunk", "prompt", 4)
        self.assertEqual(context.exception.code, "gemini_request_timeout")
        self.assertEqual(context.exception.chunk_index, 4)

    def test_document_extract_chunk_retries_gemini_unavailable(self):
        extractor = GeminiDocumentGraphExtractor(api_key="test-key", max_retries=1, backoff_seconds=0)
        payload = {
            "source": {"document_name": "manual.pdf", "chunk_file": "chunks/source_document_part_001.md", "chunk_id": "source_document_part_001"},
            "nodes": [
                {
                    "id": "source_document_part_001:N1",
                    "label": "Policy",
                    "kind": "section",
                    "canonical_name": "Policy",
                    "aliases": [],
                    "summary": "",
                    "evidence": [{"quote": "Policy text", "page_start": 1, "page_end": 1}],
                }
            ],
            "edges": [],
        }
        with patch.object(
            extractor,
            "_generate_payload",
            side_effect=[
                RuntimeError("503 UNAVAILABLE. This model is currently experiencing high demand."),
                FakeResponse(text=json.dumps(payload)),
            ],
        ):
            graph, _ = extractor.extract_chunk("chunk", "prompt", 5)

        self.assertEqual(extractor.last_attempts, 2)
        self.assertEqual(graph.nodes[0].canonical_name, "Policy")

    def test_extract_chunk_marks_gemini_unavailable_after_retries(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=0)
        with patch.object(
            extractor,
            "_generate_payload",
            side_effect=RuntimeError("503 UNAVAILABLE. This model is currently experiencing high demand."),
        ):
            with self.assertRaises(GeminiExtractionError) as context:
                extractor.extract_chunk("chunk", "prompt", 6)

        self.assertEqual(context.exception.code, "gemini_request_unavailable")
