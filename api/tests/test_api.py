import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main  
from fastapi import HTTPException  


class TwinGraphOpsApiTests(unittest.TestCase):
    def setUp(self):
        main.REQUEST_METRICS["total"] = 0
        main.REQUEST_METRICS["by_path"] = {}

    def test_root_exposes_operational_routes(self):
        response = main.root()
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["ready"], "/ready")
        self.assertEqual(response["metrics"], "/metrics")

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
        main.root()
        main.health()
        metrics_payload = main.metrics()

        self.assertIn("twingraphops_requests_total 3", metrics_payload)
        self.assertIn('twingraphops_endpoint_requests_total{path="/"} 1', metrics_payload)
        self.assertIn('twingraphops_endpoint_requests_total{path="/health"} 1', metrics_payload)
        self.assertIn('twingraphops_endpoint_requests_total{path="/metrics"} 1', metrics_payload)


if __name__ == "__main__":
    unittest.main()
