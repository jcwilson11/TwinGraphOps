import time
from typing import TYPE_CHECKING

from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram, generate_latest

if TYPE_CHECKING:
    from models import MergedGraph


class Observability:
    def __init__(self) -> None:
        self.app_start_time = time.time()
        self.registry = CollectorRegistry(auto_describe=True)

        self.requests_total = Counter(
            "twingraphops_requests_total",
            "Total HTTP requests served by the API.",
            registry=self.registry,
        )
        self.endpoint_requests_total = Counter(
            "twingraphops_endpoint_requests_total",
            "Requests served by endpoint path.",
            labelnames=("path",),
            registry=self.registry,
        )
        self.http_requests_total = Counter(
            "twingraphops_http_requests_total",
            "HTTP requests served by method, path, and status.",
            labelnames=("method", "path", "status"),
            registry=self.registry,
        )
        self.http_request_duration_seconds = Histogram(
            "twingraphops_http_request_duration_seconds",
            "HTTP request latency in seconds by method, path, and status.",
            labelnames=("method", "path", "status"),
            buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
            registry=self.registry,
        )
        self.http_in_flight_requests = Gauge(
            "twingraphops_http_in_flight_requests",
            "Current in-flight HTTP requests.",
            registry=self.registry,
        )
        self.uptime_seconds = Gauge(
            "twingraphops_uptime_seconds",
            "Seconds since the API process started.",
            registry=self.registry,
        )
        self.environment_info = Gauge(
            "twingraphops_environment_info",
            "Current application environment.",
            labelnames=("environment",),
            registry=self.registry,
        )
        self.api_errors_total = Counter(
            "twingraphops_api_errors_total",
            "Application errors by error code.",
            labelnames=("code",),
            registry=self.registry,
        )
        self.neo4j_up = Gauge(
            "twingraphops_dependency_neo4j_up",
            "Whether the Neo4j dependency is reachable.",
            registry=self.registry,
        )
        self.neo4j_query_duration_seconds = Histogram(
            "twingraphops_dependency_neo4j_query_duration_seconds",
            "Neo4j dependency check/query latency in seconds.",
            labelnames=("operation", "result"),
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
            registry=self.registry,
        )
        self.gemini_requests_total = Counter(
            "twingraphops_gemini_requests_total",
            "Gemini extraction attempts by result code.",
            labelnames=("result", "code"),
            registry=self.registry,
        )
        self.gemini_request_duration_seconds = Histogram(
            "twingraphops_gemini_request_duration_seconds",
            "Gemini extraction latency in seconds by result code.",
            labelnames=("result", "code"),
            buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
            registry=self.registry,
        )
        self.gemini_retries_total = Counter(
            "twingraphops_gemini_retries_total",
            "Gemini extraction retries.",
            registry=self.registry,
        )
        self.gemini_timeouts_total = Counter(
            "twingraphops_gemini_timeouts_total",
            "Gemini extraction timeouts.",
            registry=self.registry,
        )
        self.ingest_documents_total = Counter(
            "twingraphops_ingest_documents_total",
            "Uploaded documents processed by source.",
            labelnames=("source",),
            registry=self.registry,
        )
        self.ingest_chunks_total = Counter(
            "twingraphops_ingest_chunks_total",
            "Document chunks sent through the ingestion pipeline.",
            registry=self.registry,
        )
        self.ingest_failures_total = Counter(
            "twingraphops_ingest_failures_total",
            "Ingestion failures by error code.",
            labelnames=("code",),
            registry=self.registry,
        )
        self.graph_nodes_created_total = Counter(
            "twingraphops_graph_nodes_created_total",
            "Graph nodes created by ingestion or demo seeding.",
            registry=self.registry,
        )
        self.graph_edges_created_total = Counter(
            "twingraphops_graph_edges_created_total",
            "Graph edges created by ingestion or demo seeding.",
            registry=self.registry,
        )
        self.graph_persist_operations_total = Counter(
            "twingraphops_graph_persist_operations_total",
            "Graph persistence operations by result.",
            labelnames=("result",),
            registry=self.registry,
        )
        self.graph_nodes = Gauge(
            "twingraphops_graph_nodes",
            "Current number of nodes in the active graph.",
            registry=self.registry,
        )
        self.graph_edges = Gauge(
            "twingraphops_graph_edges",
            "Current number of edges in the active graph.",
            registry=self.registry,
        )
        self.graph_high_risk_nodes = Gauge(
            "twingraphops_graph_high_risk_nodes",
            "Current number of high-risk nodes in the active graph.",
            registry=self.registry,
        )
        self.graph_average_risk_score = Gauge(
            "twingraphops_graph_average_risk_score",
            "Current average risk score in the active graph.",
            registry=self.registry,
        )
        self.graph_risk_level_nodes = Gauge(
            "twingraphops_graph_risk_level_nodes",
            "Current count of nodes per risk level in the active graph.",
            labelnames=("risk_level",),
            registry=self.registry,
        )

    def render_metrics(self, environment: str) -> tuple[bytes, str]:
        self.uptime_seconds.set(max(time.time() - self.app_start_time, 0))
        self.environment_info.labels(environment=environment).set(1)
        return generate_latest(self.registry), CONTENT_TYPE_LATEST

    def record_http_request(self, method: str, path: str, status_code: int, duration_seconds: float) -> None:
        status = str(status_code)
        self.requests_total.inc()
        self.endpoint_requests_total.labels(path=path).inc()
        self.http_requests_total.labels(method=method, path=path, status=status).inc()
        self.http_request_duration_seconds.labels(method=method, path=path, status=status).observe(duration_seconds)

    def record_api_error(self, code: str) -> None:
        self.api_errors_total.labels(code=code).inc()

    def observe_neo4j(self, operation: str, healthy: bool, duration_seconds: float) -> None:
        result = "success" if healthy else "error"
        self.neo4j_up.set(1 if healthy else 0)
        self.neo4j_query_duration_seconds.labels(operation=operation, result=result).observe(duration_seconds)

    def observe_gemini(self, attempts: int, duration_seconds: float, success: bool, code: str) -> None:
        result = "success" if success else "error"
        self.gemini_requests_total.labels(result=result, code=code).inc(max(attempts, 1))
        self.gemini_request_duration_seconds.labels(result=result, code=code).observe(duration_seconds)
        if attempts > 1:
            self.gemini_retries_total.inc(attempts - 1)
        if code == "gemini_request_timeout":
            self.gemini_timeouts_total.inc()

    def record_ingest_document(self, source: str, chunk_count: int) -> None:
        self.ingest_documents_total.labels(source=source).inc()
        self.ingest_chunks_total.inc(chunk_count)

    def record_ingest_failure(self, code: str) -> None:
        self.ingest_failures_total.labels(code=code).inc()

    def record_graph_counts(self, nodes_created: int, edges_created: int) -> None:
        self.graph_nodes_created_total.inc(nodes_created)
        self.graph_edges_created_total.inc(edges_created)

    def record_graph_persist(self, success: bool) -> None:
        self.graph_persist_operations_total.labels(result="success" if success else "error").inc()

    def update_graph_summary(self, graph: "MergedGraph") -> None:
        node_count = len(graph.nodes)
        edge_count = len(graph.edges)
        high_risk_count = sum(1 for node in graph.nodes if node.risk_level == "high")
        average_risk = sum(node.risk_score for node in graph.nodes) / node_count if node_count else 0
        self.graph_nodes.set(node_count)
        self.graph_edges.set(edge_count)
        self.graph_high_risk_nodes.set(high_risk_count)
        self.graph_average_risk_score.set(average_risk)

        risk_counts = {"low": 0, "medium": 0, "high": 0}
        for node in graph.nodes:
            risk_counts[node.risk_level] = risk_counts.get(node.risk_level, 0) + 1
        for risk_level, count in risk_counts.items():
            self.graph_risk_level_nodes.labels(risk_level=risk_level).set(count)


def normalize_http_path(raw_path: str, route_path: str | None = None) -> str:
    if route_path:
        return route_path
    if raw_path.startswith("/docs"):
        return "/docs"
    if raw_path.startswith("/openapi"):
        return "/openapi.json"
    return raw_path
