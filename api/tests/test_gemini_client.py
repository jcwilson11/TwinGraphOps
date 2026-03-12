import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_client import GeminiExtractionError, GeminiGraphExtractor


class FakeResponse:
    def __init__(self, text=None, parsed=None):
        self.text = text
        self.parsed = parsed


class GeminiClientTests(unittest.TestCase):
    def test_extract_chunk_returns_valid_graph(self):
        extractor = GeminiGraphExtractor(api_key="test-key", max_retries=1)
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
