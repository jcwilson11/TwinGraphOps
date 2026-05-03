from __future__ import annotations

from collections import defaultdict
from threading import Lock
from typing import Any


PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"
HISTOGRAM_BUCKETS = (
    0.005,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1.0,
    2.5,
    5.0,
    10.0,
    30.0,
    60.0,
    120.0,
    300.0,
)
DEVSECOPS_CONTROLS = (
    ("ci_tests", "GitHub Actions", ".github/workflows/ci.yml"),
    ("filesystem_vulnerability_scan", "Trivy", ".github/workflows/trivy.yml"),
    ("image_vulnerability_scan", "Trivy", ".github/workflows/ci.yml"),
    ("secret_scan", "Gitleaks", ".github/workflows/secret-scan.yml"),
    ("static_analysis", "CodeQL", ".github/workflows/codeql.yml"),
    ("oidc_aws_release", "GitHub OIDC", ".github/workflows/release.yml"),
    ("rollback_automation", "GitHub Actions", ".github/workflows/manual-rollback.yml"),
)


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


def _bucket_label(value: float) -> str:
    return f"{value:g}"


def _bucket_sort_key(value: str) -> float:
    if value == "+Inf":
        return float("inf")
    return float(value)


def _observe_histogram(buckets: defaultdict[tuple[Any, ...], int], base_key: tuple[Any, ...], value: float) -> None:
    normalized = max(value, 0.0)
    for bucket in HISTOGRAM_BUCKETS:
        if normalized <= bucket:
            buckets[base_key + (_bucket_label(bucket),)] += 1
    buckets[base_key + ("+Inf",)] += 1


def _append_histogram(
    lines: list[str],
    *,
    name: str,
    description: str,
    label_names: tuple[str, ...],
    buckets: dict[tuple[Any, ...], int],
    sums: dict[tuple[Any, ...], float],
    counts: dict[tuple[Any, ...], int],
) -> None:
    lines.extend(
        [
            f"# HELP {name} {description}",
            f"# TYPE {name} histogram",
        ]
    )
    bucket_items = sorted(buckets.items(), key=lambda item: (item[0][:-1], _bucket_sort_key(str(item[0][-1]))))
    for key, count in bucket_items:
        labels = dict(zip(label_names, key[:-1]))
        labels["le"] = key[-1]
        lines.append(f"{name}_bucket{_format_labels(labels)} {float(count):.1f}")
    for key, total in sorted(sums.items()):
        lines.append(f"{name}_sum{_format_labels(dict(zip(label_names, key)))} {total:.6f}")
    for key, count in sorted(counts.items()):
        lines.append(f"{name}_count{_format_labels(dict(zip(label_names, key)))} {float(count):.1f}")


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
        self._http_request_duration_buckets = defaultdict(int)
        self._api_errors = defaultdict(int)
        self._ingest_failures = defaultdict(int)
        self._ingest_documents = defaultdict(int)
        self._ingest_chunks_total = 0
        self._document_ingest_jobs = defaultdict(int)
        self._document_ingest_failures = defaultdict(int)
        self._document_ingest_in_flight = 0
        self._document_ingest_chunks_total = 0
        self._document_ingest_chunk_failures = defaultdict(int)
        self._document_pdf_conversions = defaultdict(int)
        self._document_page_marker_failures = defaultdict(int)
        self._document_graph_persist = defaultdict(int)
        self._document_graph_counts = {
            "nodes_created_total": 0,
            "edges_created_total": 0,
            "evidence_items_created_total": 0,
            "current_nodes": 0,
            "current_edges": 0,
            "current_evidence_items": 0,
        }
        self._document_graph_node_kinds = defaultdict(int)
        self._document_graph_relation_types = defaultdict(int)
        self._neo4j_checks = defaultdict(int)
        self._neo4j_duration = defaultdict(float)
        self._neo4j_duration_buckets = defaultdict(int)
        self._gemini_requests = defaultdict(int)
        self._gemini_duration = defaultdict(float)
        self._gemini_duration_buckets = defaultdict(int)
        self._graph_persist = defaultdict(int)
        self._graph_counts = {
            "nodes_created_total": 0,
            "edges_created_total": 0,
            "risk_nodes_scored_total": 0,
            "current_nodes": 0,
            "current_edges": 0,
            "average_risk_score": 0.0,
            "high_risk_nodes": 0,
        }
        self._graph_risk_levels = defaultdict(int)
        self._dependency_neo4j_up = 0.0

    def record_http_request(self, method: str, path: str, status_code: int, duration_seconds: float) -> None:
        key = (method.upper(), path, str(status_code))
        with self._lock:
            self._http_requests[key] += 1
            self._http_request_duration[key] += max(duration_seconds, 0.0)
            _observe_histogram(self._http_request_duration_buckets, key, duration_seconds)

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

    def record_document_ingest_accepted(self) -> None:
        with self._lock:
            self._document_ingest_jobs["accepted"] += 1
            self._document_ingest_in_flight += 1

    def record_document_ingest_started(self) -> None:
        with self._lock:
            self._document_ingest_jobs["running"] += 1

    def record_document_ingest_completed(self, success: bool, code: str = "ok") -> None:
        with self._lock:
            state = "succeeded" if success else "failed"
            self._document_ingest_jobs[state] += 1
            if not success:
                self._document_ingest_failures[code] += 1
            self._document_ingest_in_flight = max(0, self._document_ingest_in_flight - 1)

    def record_document_ingest_chunks(self, chunk_count: int) -> None:
        with self._lock:
            self._document_ingest_chunks_total += max(chunk_count, 0)

    def record_document_ingest_chunk_failure(self, code: str) -> None:
        with self._lock:
            self._document_ingest_chunk_failures[code] += 1

    def record_document_pdf_conversion(self, success: bool, code: str = "ok") -> None:
        result = "success" if success else "error"
        with self._lock:
            self._document_pdf_conversions[(result, code)] += 1

    def record_document_page_marker_failure(self, code: str) -> None:
        with self._lock:
            self._document_page_marker_failures[code] += 1

    def record_document_graph_persist(self, success: bool) -> None:
        with self._lock:
            self._document_graph_persist[str(success).lower()] += 1

    def update_document_graph_summary(self, graph: Any, count_created: bool = False) -> None:
        nodes = getattr(graph, "nodes", []) or []
        edges = getattr(graph, "edges", []) or []
        evidence_items = sum(len(getattr(node, "evidence", []) or []) for node in nodes)
        evidence_items += sum(len(getattr(edge, "evidence", []) or []) for edge in edges)
        node_kinds = defaultdict(int)
        relation_types = defaultdict(int)
        for node in nodes:
            node_kinds[str(getattr(node, "kind", "other") or "other")] += 1
        for edge in edges:
            relation_types[str(getattr(edge, "type", "related_to") or "related_to")] += 1

        with self._lock:
            if count_created:
                self._document_graph_counts["nodes_created_total"] += len(nodes)
                self._document_graph_counts["edges_created_total"] += len(edges)
                self._document_graph_counts["evidence_items_created_total"] += evidence_items
            self._document_graph_counts["current_nodes"] = len(nodes)
            self._document_graph_counts["current_edges"] = len(edges)
            self._document_graph_counts["current_evidence_items"] = evidence_items
            self._document_graph_node_kinds = node_kinds
            self._document_graph_relation_types = relation_types

    def observe_neo4j(self, operation: str, success: bool, duration_seconds: float) -> None:
        key = (operation, str(success).lower())
        with self._lock:
            self._neo4j_checks[key] += 1
            self._neo4j_duration[key] += max(duration_seconds, 0.0)
            _observe_histogram(self._neo4j_duration_buckets, key, duration_seconds)
            if operation == "healthcheck":
                self._dependency_neo4j_up = 1.0 if success else 0.0

    def observe_gemini(self, attempts: int, duration_seconds: float, success: bool, code: str) -> None:
        key = (str(success).lower(), code, str(max(attempts, 0)))
        with self._lock:
            self._gemini_requests[key] += 1
            self._gemini_duration[key] += max(duration_seconds, 0.0)
            _observe_histogram(self._gemini_duration_buckets, key, duration_seconds)

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
        risk_scores = [float(getattr(node, "risk_score", 0) or 0) for node in nodes]
        average_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0
        risk_levels = defaultdict(int)
        for node in nodes:
            risk_levels[str(getattr(node, "risk_level", "low") or "low")] += 1
        with self._lock:
            self._graph_counts["current_nodes"] = len(nodes)
            self._graph_counts["current_edges"] = len(edges)
            self._graph_counts["average_risk_score"] = average_risk_score
            self._graph_counts["high_risk_nodes"] = risk_levels.get("high", 0)
            self._graph_risk_levels = risk_levels

    def render_metrics(self, environment: str, deployment_info: dict[str, str] | None = None) -> tuple[str, str]:
        deployment = deployment_info or {}
        release_sha = deployment.get("release_sha") or "unknown"
        api_image = deployment.get("api_image") or "unknown"
        frontend_image = deployment.get("frontend_image") or "unknown"

        with self._lock:
            http_requests = dict(self._http_requests)
            http_request_duration = dict(self._http_request_duration)
            http_request_duration_buckets = dict(self._http_request_duration_buckets)
            api_errors = dict(self._api_errors)
            ingest_failures = dict(self._ingest_failures)
            ingest_documents = dict(self._ingest_documents)
            ingest_chunks_total = self._ingest_chunks_total
            document_ingest_jobs = dict(self._document_ingest_jobs)
            document_ingest_failures = dict(self._document_ingest_failures)
            document_ingest_in_flight = self._document_ingest_in_flight
            document_ingest_chunks_total = self._document_ingest_chunks_total
            document_ingest_chunk_failures = dict(self._document_ingest_chunk_failures)
            document_pdf_conversions = dict(self._document_pdf_conversions)
            document_page_marker_failures = dict(self._document_page_marker_failures)
            document_graph_persist = dict(self._document_graph_persist)
            document_graph_counts = dict(self._document_graph_counts)
            document_graph_node_kinds = dict(self._document_graph_node_kinds)
            document_graph_relation_types = dict(self._document_graph_relation_types)
            neo4j_checks = dict(self._neo4j_checks)
            neo4j_duration = dict(self._neo4j_duration)
            neo4j_duration_buckets = dict(self._neo4j_duration_buckets)
            gemini_requests = dict(self._gemini_requests)
            gemini_duration = dict(self._gemini_duration)
            gemini_duration_buckets = dict(self._gemini_duration_buckets)
            graph_persist = dict(self._graph_persist)
            graph_counts = dict(self._graph_counts)
            graph_risk_levels = dict(self._graph_risk_levels)
            dependency_neo4j_up = self._dependency_neo4j_up

        total_requests = sum(http_requests.values())
        endpoint_requests = defaultdict(int)
        for (_method, path, _status_code), count in http_requests.items():
            endpoint_requests[path] += count

        gemini_attempts_by_result = defaultdict(int)
        gemini_retries_total = 0
        gemini_timeouts_total = 0
        for (success, code, attempts), count in gemini_requests.items():
            attempts_count = max(int(attempts), 0)
            result = "success" if success == "true" else "error"
            gemini_attempts_by_result[(code, result)] += attempts_count * count
            gemini_retries_total += max(attempts_count - 1, 0) * count
            if code == "gemini_request_timeout":
                gemini_timeouts_total += count

        lines = [
            "# HELP twingraphops_environment_info Current application environment.",
            "# TYPE twingraphops_environment_info gauge",
            f'twingraphops_environment_info{{environment="{environment}"}} 1.0',
            "# HELP twingraphops_deployment_info Current deployed source and image identity.",
            "# TYPE twingraphops_deployment_info gauge",
            (
                "twingraphops_deployment_info"
                f"{_format_labels({'environment': environment, 'release_sha': release_sha, 'api_image': api_image, 'frontend_image': frontend_image})} 1.0"
            ),
            "# HELP twingraphops_devsecops_control_info Configured DevSecOps controls and evidence files.",
            "# TYPE twingraphops_devsecops_control_info gauge",
        ]

        for control, tool, evidence in DEVSECOPS_CONTROLS:
            labels = {"control": control, "tool": tool, "evidence": evidence, "status": "configured"}
            lines.append(f"twingraphops_devsecops_control_info{_format_labels(labels)} 1.0")

        lines.extend(
            [
                "# HELP twingraphops_http_in_flight_requests In-flight HTTP requests.",
                "# TYPE twingraphops_http_in_flight_requests gauge",
                f"twingraphops_http_in_flight_requests {self.http_in_flight_requests.get():.1f}",
                "# HELP twingraphops_requests_total Total HTTP requests served.",
                "# TYPE twingraphops_requests_total counter",
                f"twingraphops_requests_total {float(total_requests):.1f}",
                "# HELP twingraphops_endpoint_requests_total Total HTTP requests served by path.",
                "# TYPE twingraphops_endpoint_requests_total counter",
            ]
        )

        for path, count in sorted(endpoint_requests.items()):
            lines.append(f"twingraphops_endpoint_requests_total{_format_labels({'path': path})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_http_requests_total Total HTTP requests served by method, path, and status.",
                "# TYPE twingraphops_http_requests_total counter",
            ]
        )

        for (method, path, status_code), count in sorted(http_requests.items()):
            lines.append(
                f"twingraphops_http_requests_total"
                f"{_format_labels({'method': method, 'path': path, 'status': status_code})} {float(count):.1f}"
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
                f"{_format_labels({'method': method, 'path': path, 'status': status_code})} {total:.6f}"
            )

        _append_histogram(
            lines,
            name="twingraphops_http_request_duration_seconds",
            description="HTTP request latency distribution in seconds.",
            label_names=("method", "path", "status"),
            buckets=http_request_duration_buckets,
            sums=http_request_duration,
            counts=http_requests,
        )

        lines.extend(
            [
                "# HELP twingraphops_api_errors_total API errors grouped by code.",
                "# TYPE twingraphops_api_errors_total counter",
            ]
        )
        for code, count in sorted(api_errors.items()):
            lines.append(f"twingraphops_api_errors_total{_format_labels({'code': code})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_failures_total Legacy component ingest failures grouped by error code.",
                "# TYPE twingraphops_ingest_failures_total counter",
            ]
        )
        for code, count in sorted(ingest_failures.items()):
            lines.append(f"twingraphops_ingest_failures_total{_format_labels({'code': code})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_documents_total Legacy component ingest documents grouped by source.",
                "# TYPE twingraphops_ingest_documents_total counter",
            ]
        )
        for source, count in sorted(ingest_documents.items()):
            lines.append(f"twingraphops_ingest_documents_total{_format_labels({'source': source})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_ingest_chunks_total Total chunks produced during legacy component ingestion.",
                "# TYPE twingraphops_ingest_chunks_total counter",
                f"twingraphops_ingest_chunks_total {float(ingest_chunks_total):.1f}",
                "# HELP twingraphops_document_ingest_jobs_total Async document knowledge graph jobs by lifecycle state.",
                "# TYPE twingraphops_document_ingest_jobs_total counter",
            ]
        )
        for state in ("accepted", "running", "succeeded", "failed"):
            count = document_ingest_jobs.get(state, 0)
            lines.append(f"twingraphops_document_ingest_jobs_total{_format_labels({'state': state})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_document_ingest_in_flight Current async document knowledge graph jobs in flight.",
                "# TYPE twingraphops_document_ingest_in_flight gauge",
                f"twingraphops_document_ingest_in_flight {float(document_ingest_in_flight):.1f}",
                "# HELP twingraphops_document_ingest_failures_total Async document ingest failures grouped by code.",
                "# TYPE twingraphops_document_ingest_failures_total counter",
            ]
        )
        for code, count in sorted(document_ingest_failures.items()):
            lines.append(f"twingraphops_document_ingest_failures_total{_format_labels({'code': code})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_document_ingest_chunks_total Total chunks produced during async document knowledge graph ingestion.",
                "# TYPE twingraphops_document_ingest_chunks_total counter",
                f"twingraphops_document_ingest_chunks_total {float(document_ingest_chunks_total):.1f}",
                "# HELP twingraphops_document_ingest_chunk_failures_total Async document chunk failures grouped by code.",
                "# TYPE twingraphops_document_ingest_chunk_failures_total counter",
            ]
        )
        for code, count in sorted(document_ingest_chunk_failures.items()):
            lines.append(
                f"twingraphops_document_ingest_chunk_failures_total{_format_labels({'code': code})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_document_pdf_conversions_total PDF conversion attempts grouped by result and code.",
                "# TYPE twingraphops_document_pdf_conversions_total counter",
            ]
        )
        for (result, code), count in sorted(document_pdf_conversions.items()):
            lines.append(
                f"twingraphops_document_pdf_conversions_total"
                f"{_format_labels({'result': result, 'code': code})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_document_page_marker_failures_total PDF page marker validation failures grouped by code.",
                "# TYPE twingraphops_document_page_marker_failures_total counter",
            ]
        )
        for code, count in sorted(document_page_marker_failures.items()):
            lines.append(
                f"twingraphops_document_page_marker_failures_total{_format_labels({'code': code})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_dependency_neo4j_up Neo4j dependency health where 1 is up and 0 is down.",
                "# TYPE twingraphops_dependency_neo4j_up gauge",
                f"twingraphops_dependency_neo4j_up {dependency_neo4j_up:.1f}",
                "# HELP twingraphops_neo4j_operations_total Neo4j operations grouped by operation and success.",
                "# TYPE twingraphops_neo4j_operations_total counter",
            ]
        )
        for (operation, success), count in sorted(neo4j_checks.items()):
            lines.append(
                f"twingraphops_neo4j_operations_total"
                f"{_format_labels({'operation': operation, 'success': success})} {float(count):.1f}"
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

        _append_histogram(
            lines,
            name="twingraphops_neo4j_operation_duration_seconds",
            description="Neo4j operation latency distribution in seconds.",
            label_names=("operation", "success"),
            buckets=neo4j_duration_buckets,
            sums=neo4j_duration,
            counts=neo4j_checks,
        )

        lines.extend(
            [
                "# HELP twingraphops_gemini_requests_total Gemini extraction attempts grouped by outcome.",
                "# TYPE twingraphops_gemini_requests_total counter",
            ]
        )
        for (code, result), count in sorted(gemini_attempts_by_result.items()):
            lines.append(
                f"twingraphops_gemini_requests_total"
                f"{_format_labels({'code': code, 'result': result})} {float(count):.1f}"
            )
        lines.extend(
            [
                "# HELP twingraphops_gemini_retries_total Gemini extraction retry attempts.",
                "# TYPE twingraphops_gemini_retries_total counter",
                f"twingraphops_gemini_retries_total {float(gemini_retries_total):.1f}",
                "# HELP twingraphops_gemini_timeouts_total Gemini extraction requests that ended in timeout.",
                "# TYPE twingraphops_gemini_timeouts_total counter",
                f"twingraphops_gemini_timeouts_total {float(gemini_timeouts_total):.1f}",
            ]
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

        _append_histogram(
            lines,
            name="twingraphops_gemini_request_duration_seconds",
            description="Gemini extraction request latency distribution in seconds.",
            label_names=("success", "code", "attempts"),
            buckets=gemini_duration_buckets,
            sums=gemini_duration,
            counts=gemini_requests,
        )

        lines.extend(
            [
                "# HELP twingraphops_graph_persist_total Legacy component graph persistence attempts grouped by success.",
                "# TYPE twingraphops_graph_persist_total counter",
            ]
        )
        for success, count in sorted(graph_persist.items()):
            lines.append(f"twingraphops_graph_persist_total{_format_labels({'success': success})} {float(count):.1f}")

        lines.extend(
            [
                "# HELP twingraphops_graph_nodes Current legacy component graph node count.",
                "# TYPE twingraphops_graph_nodes gauge",
                f"twingraphops_graph_nodes {float(graph_counts['current_nodes']):.1f}",
                "# HELP twingraphops_graph_edges Current legacy component graph edge count.",
                "# TYPE twingraphops_graph_edges gauge",
                f"twingraphops_graph_edges {float(graph_counts['current_edges']):.1f}",
                "# HELP twingraphops_graph_average_risk_score Current legacy component graph average risk score.",
                "# TYPE twingraphops_graph_average_risk_score gauge",
                f"twingraphops_graph_average_risk_score {graph_counts['average_risk_score']:.2f}",
                "# HELP twingraphops_graph_high_risk_nodes Current legacy component high-risk graph node count.",
                "# TYPE twingraphops_graph_high_risk_nodes gauge",
                f"twingraphops_graph_high_risk_nodes {float(graph_counts['high_risk_nodes']):.1f}",
                "# HELP twingraphops_graph_risk_level_nodes Current legacy component graph node count by risk level.",
                "# TYPE twingraphops_graph_risk_level_nodes gauge",
            ]
        )
        for risk_level, count in sorted(graph_risk_levels.items()):
            lines.append(
                f"twingraphops_graph_risk_level_nodes"
                f"{_format_labels({'risk_level': risk_level})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_graph_nodes_created_total Total legacy component graph nodes created.",
                "# TYPE twingraphops_graph_nodes_created_total counter",
                f"twingraphops_graph_nodes_created_total {float(graph_counts['nodes_created_total']):.1f}",
                "# HELP twingraphops_graph_edges_created_total Total legacy component graph edges created.",
                "# TYPE twingraphops_graph_edges_created_total counter",
                f"twingraphops_graph_edges_created_total {float(graph_counts['edges_created_total']):.1f}",
                "# HELP twingraphops_risk_nodes_scored_total Total legacy component graph nodes scored for risk.",
                "# TYPE twingraphops_risk_nodes_scored_total counter",
                f"twingraphops_risk_nodes_scored_total {float(graph_counts['risk_nodes_scored_total']):.1f}",
                "# HELP twingraphops_graph_nodes_current Current legacy component graph node count.",
                "# TYPE twingraphops_graph_nodes_current gauge",
                f"twingraphops_graph_nodes_current {float(graph_counts['current_nodes']):.1f}",
                "# HELP twingraphops_graph_edges_current Current legacy component graph edge count.",
                "# TYPE twingraphops_graph_edges_current gauge",
                f"twingraphops_graph_edges_current {float(graph_counts['current_edges']):.1f}",
                "# HELP twingraphops_document_graph_persist_total Document graph persistence attempts grouped by success.",
                "# TYPE twingraphops_document_graph_persist_total counter",
            ]
        )
        for success, count in sorted(document_graph_persist.items()):
            lines.append(
                f"twingraphops_document_graph_persist_total"
                f"{_format_labels({'success': success})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_document_graph_nodes_current Current document knowledge graph node count.",
                "# TYPE twingraphops_document_graph_nodes_current gauge",
                f"twingraphops_document_graph_nodes_current {float(document_graph_counts['current_nodes']):.1f}",
                "# HELP twingraphops_document_graph_edges_current Current document knowledge graph edge count.",
                "# TYPE twingraphops_document_graph_edges_current gauge",
                f"twingraphops_document_graph_edges_current {float(document_graph_counts['current_edges']):.1f}",
                "# HELP twingraphops_document_graph_evidence_items_current Current document knowledge graph evidence item count.",
                "# TYPE twingraphops_document_graph_evidence_items_current gauge",
                (
                    "twingraphops_document_graph_evidence_items_current "
                    f"{float(document_graph_counts['current_evidence_items']):.1f}"
                ),
                "# HELP twingraphops_document_graph_nodes_created_total Total document knowledge graph nodes created.",
                "# TYPE twingraphops_document_graph_nodes_created_total counter",
                f"twingraphops_document_graph_nodes_created_total {float(document_graph_counts['nodes_created_total']):.1f}",
                "# HELP twingraphops_document_graph_edges_created_total Total document knowledge graph edges created.",
                "# TYPE twingraphops_document_graph_edges_created_total counter",
                f"twingraphops_document_graph_edges_created_total {float(document_graph_counts['edges_created_total']):.1f}",
                "# HELP twingraphops_document_graph_evidence_items_created_total Total document knowledge graph evidence items created.",
                "# TYPE twingraphops_document_graph_evidence_items_created_total counter",
                (
                    "twingraphops_document_graph_evidence_items_created_total "
                    f"{float(document_graph_counts['evidence_items_created_total']):.1f}"
                ),
                "# HELP twingraphops_document_graph_node_kind_current Current document knowledge graph nodes grouped by kind.",
                "# TYPE twingraphops_document_graph_node_kind_current gauge",
            ]
        )
        for kind, count in sorted(document_graph_node_kinds.items()):
            lines.append(
                f"twingraphops_document_graph_node_kind_current{_format_labels({'kind': kind})} {float(count):.1f}"
            )

        lines.extend(
            [
                "# HELP twingraphops_document_graph_relation_type_current Current document knowledge graph edges grouped by relation type.",
                "# TYPE twingraphops_document_graph_relation_type_current gauge",
            ]
        )
        for relation_type, count in sorted(document_graph_relation_types.items()):
            lines.append(
                f"twingraphops_document_graph_relation_type_current"
                f"{_format_labels({'type': relation_type})} {float(count):.1f}"
            )

        return "\n".join(lines) + "\n", PROMETHEUS_CONTENT_TYPE
