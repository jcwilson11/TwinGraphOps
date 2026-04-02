from __future__ import annotations

from collections import defaultdict
from threading import Lock
from typing import Any


PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


def normalize_http_path(actual_path: str, route_path: str | None) -> str:
    if route_path:
        return route_path
    return actual_path or "/"


def _format_labels(labels: dict[str, Any]) -> str:
    if not labels:
        return ""
    parts = []
    for key, value in sorted(labels.items()):
        escaped = str(value).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        parts.append(f'{key}="{escaped}"')
    return "{" + ",".join(parts) + "}"


class _GaugeHandle:
    def __init__(self) -> None:
        self._value = 0.0
        self._lock = Lock()

    def inc(self, amount: float = 1.0) -> None:
        with self._lock:
            self._value += amount

    def dec(self, amount: float = 1.0) -> None:
        with self._lock:
            self._value -= amount

    def get(self) -> float:
        with self._lock:
            return self._value


class Observability:
    def __init__(self) -> None:
        self.http_in_flight_requests = _GaugeHandle()
        self._lock = Lock()
        self._http_requests = defaultdict(int)
        self._http_request_duration = defaultdict(float)
        self._api_errors = defaultdict(int)
        self._ingest_failures = defaultdict(int)
        self._ingest_documents = defaultdict(int)
        self._ingest_chunks_total = 0
        self._neo4j_checks = defaultdict(int)
        self._neo4j_duration = defaultdict(float)
        self._gemini_requests = defaultdict(int)
        self._gemini_duration = defaultdict(float)
        self._graph_persist = defaultdict(int)
        self._graph_counts = {
            "nodes_created_total": 0,
            "edges_created_total": 0,
            "risk_nodes_scored_total": 0,
            "current_nodes": 0,
            "current_edges": 0,
        }

    def record_http_request(self, method: str, path: str, status_code: int, duration_seconds: float) -> None:
        key = (method.upper(), path, str(status_code))
        with self._lock:
            self._http_requests[key] += 1
            self._http_request_duration[key] += max(duration_seconds, 0.0)

    def record_api_error(self, code: str) -> None:
        with self._lock:
            self._api_errors[code] += 1

    def record_ingest_failure(self, code: str) -> None:
        with self._lock:
            self._ingest_failures[code] += 1

    def record_ingest_document(self, source: str, chunk_count: int) -> None:
        with self._lock:
            self._ingest_documents[source] += 1
            self._ingest_chunks_total += max(chunk_count, 0)

    def observe_neo4j(self, operation: str, success: bool, duration_seconds: float) -> None:
        key = (operation, str(success).lower())
        with self._lock:
            self._neo4j_checks[key] += 1
            self._neo4j_duration[key] += max(duration_seconds, 0.0)

    def observe_gemini(self, attempts: int, duration_seconds: float, success: bool, code: str) -> None:
        key = (str(success).lower(), code, str(max(attempts, 0)))
        with self._lock:
            self._gemini_requests[key] += 1
            self._gemini_duration[key] += max(duration_seconds, 0.0)

    def record_graph_persist(self, success: bool) -> None:
        with self._lock:
            self._graph_persist[str(success).lower()] += 1

    def record_graph_counts(self, nodes_created: int, edges_created: int) -> None:
        with self._lock:
            self._graph_counts["nodes_created_total"] += max(nodes_created, 0)
            self._graph_counts["edges_created_total"] += max(edges_created, 0)
            self._graph_counts["risk_nodes_scored_total"] += max(nodes_created, 0)

    def update_graph_summary(self, graph: Any) -> None:
        nodes = getattr(graph, "nodes", []) or []
        edges = getattr(graph, "edges", []) or []
        with self._lock:
            self._graph_counts["current_nodes"] = len(nodes)
            self._graph_counts["current_edges"] = len(edges)

    def render_metrics(self, environment: str) -> tuple[str, str]:
        with self._lock:
            http_requests = dict(self._http_requests)
            http_request_duration = dict(self._http_request_duration)
            api_errors = dict(self._api_errors)
            ingest_failures = dict(self._ingest_failures)
            ingest_documents = dict(self._ingest_documents)
            ingest_chunks_total = self._ingest_chunks_total
            neo4j_checks = dict(self._neo4j_checks)
            neo4j_duration = dict(self._neo4j_duration)
            gemini_requests = dict(self._gemini_requests)
            gemini_duration = dict(self._gemini_duration)
            graph_persist = dict(self._graph_persist)
            graph_counts = dict(self._graph_counts)

        lines = [
            "# HELP twingraphops_environment_info Current application environment.",
            "# TYPE twingraphops_environment_info gauge",
            f'twingraphops_environment_info{{environment="{environment}"}} 1',
            "# HELP twingraphops_http_in_flight_requests In-flight HTTP requests.",
            "# TYPE twingraphops_http_in_flight_requests gauge",
            f"twingraphops_http_in_flight_requests {self.http_in_flight_requests.get():.0f}",
            "# HELP twingraphops_http_requests_total Total HTTP requests served by method, path, and status.",
            "# TYPE twingraphops_http_requests_total counter",
        ]

        for (method, path, status_code), count in sorted(http_requests.items()):
            lines.append(
                f"twingraphops_http_requests_total"
                f"{_format_labels({'method': method, 'path': path, 'status_code': status_code})} {count}"
            )

        lines.extend(
            [
                "# HELP twingraphops_http_request_duration_seconds_total Total HTTP request time in seconds.",
                "# TYPE twingraphops_http_request_duration_seconds_total counter",
            ]
        )
        for (method, path, status_code), total in sorted(http_request_duration.items()):
            lines.append(
                f"twingraphops_http_request_duration_seconds_total"
                f"{_format_labels({'method': method, 'path': path, 'status_code': status_code})} {total:.6f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_api_errors_total API errors grouped by code.",
                "# TYPE twingraphops_api_errors_total counter",
            ]
        )
        for code, count in sorted(api_errors.items()):
            lines.append(f"twingraphops_api_errors_total{_format_labels({'code': code})} {count}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_failures_total Ingest failures grouped by error code.",
                "# TYPE twingraphops_ingest_failures_total counter",
            ]
        )
        for code, count in sorted(ingest_failures.items()):
            lines.append(f"twingraphops_ingest_failures_total{_format_labels({'code': code})} {count}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_documents_total Ingested documents grouped by source.",
                "# TYPE twingraphops_ingest_documents_total counter",
            ]
        )
        for source, count in sorted(ingest_documents.items()):
            lines.append(f"twingraphops_ingest_documents_total{_format_labels({'source': source})} {count}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_chunks_total Total chunks produced during ingestion.",
                "# TYPE twingraphops_ingest_chunks_total counter",
                f"twingraphops_ingest_chunks_total {ingest_chunks_total}",
                "# HELP twingraphops_neo4j_operations_total Neo4j operations grouped by operation and success.",
                "# TYPE twingraphops_neo4j_operations_total counter",
            ]
        )
        for (operation, success), count in sorted(neo4j_checks.items()):
            lines.append(
                f"twingraphops_neo4j_operations_total"
                f"{_format_labels({'operation': operation, 'success': success})} {count}"
            )

        lines.extend(
            [
                "# HELP twingraphops_neo4j_operation_duration_seconds_total Total Neo4j operation duration.",
                "# TYPE twingraphops_neo4j_operation_duration_seconds_total counter",
            ]
        )
        for (operation, success), total in sorted(neo4j_duration.items()):
            lines.append(
                f"twingraphops_neo4j_operation_duration_seconds_total"
                f"{_format_labels({'operation': operation, 'success': success})} {total:.6f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_gemini_requests_total Gemini extraction attempts grouped by outcome.",
                "# TYPE twingraphops_gemini_requests_total counter",
            ]
        )
        for (success, code, attempts), count in sorted(gemini_requests.items()):
            lines.append(
                f"twingraphops_gemini_requests_total"
                f"{_format_labels({'success': success, 'code': code, 'attempts': attempts})} {count}"
            )

        lines.extend(
            [
                "# HELP twingraphops_gemini_request_duration_seconds_total Total Gemini request duration.",
                "# TYPE twingraphops_gemini_request_duration_seconds_total counter",
            ]
        )
        for (success, code, attempts), total in sorted(gemini_duration.items()):
            lines.append(
                f"twingraphops_gemini_request_duration_seconds_total"
                f"{_format_labels({'success': success, 'code': code, 'attempts': attempts})} {total:.6f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_graph_persist_total Graph persistence attempts grouped by success.",
                "# TYPE twingraphops_graph_persist_total counter",
            ]
        )
        for success, count in sorted(graph_persist.items()):
            lines.append(f"twingraphops_graph_persist_total{_format_labels({'success': success})} {count}")

        lines.extend(
            [
                "# HELP twingraphops_graph_nodes_created_total Total graph nodes created.",
                "# TYPE twingraphops_graph_nodes_created_total counter",
                f"twingraphops_graph_nodes_created_total {graph_counts['nodes_created_total']}",
                "# HELP twingraphops_graph_edges_created_total Total graph edges created.",
                "# TYPE twingraphops_graph_edges_created_total counter",
                f"twingraphops_graph_edges_created_total {graph_counts['edges_created_total']}",
                "# HELP twingraphops_risk_nodes_scored_total Total graph nodes scored for risk.",
                "# TYPE twingraphops_risk_nodes_scored_total counter",
                f"twingraphops_risk_nodes_scored_total {graph_counts['risk_nodes_scored_total']}",
                "# HELP twingraphops_graph_nodes_current Current graph node count.",
                "# TYPE twingraphops_graph_nodes_current gauge",
                f"twingraphops_graph_nodes_current {graph_counts['current_nodes']}",
                "# HELP twingraphops_graph_edges_current Current graph edge count.",
                "# TYPE twingraphops_graph_edges_current gauge",
                f"twingraphops_graph_edges_current {graph_counts['current_edges']}",
            ]
        )

        return "\n".join(lines) + "\n", PROMETHEUS_CONTENT_TYPE
