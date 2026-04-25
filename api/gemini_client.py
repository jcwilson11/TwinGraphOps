import json
import time
from dataclasses import dataclass
from typing import Any

from graph_pipeline import GraphValidationError, validate_chunk_graph_payload
from document_pipeline import validate_document_chunk_graph_payload
from models import ChunkGraph, DocumentChunkGraph, model_dump_compat, model_json_schema_compat


@dataclass
class GeminiExtractionError(RuntimeError):
    code: str
    chunk_index: int
    validation_errors: list[str]
    raw_payload: Any | None = None

    def __post_init__(self) -> None:
        RuntimeError.__init__(self, self.validation_errors[0] if self.validation_errors else self.code)


def _is_timeout_error(error: Exception) -> bool:
    timeout_types = (TimeoutError,)
    try:
        import httpx

        timeout_types = timeout_types + (httpx.TimeoutException,)
    except Exception:
        pass

    if isinstance(error, timeout_types):
        return True

    message = str(error).lower()
    return "timed out" in message or "timeout" in message


def _is_unavailable_error(error: Exception) -> bool:
    status_code = getattr(error, "status_code", None) or getattr(error, "code", None)
    if status_code == 503 or str(status_code) == "503":
        return True

    message = str(error).lower()
    return (
        "503" in message
        or "unavailable" in message
        or "deadline_exceeded" in message
        or "deadline exceeded" in message
        or "high demand" in message
    )


def _request_error_code(error: Exception) -> str:
    if _is_timeout_error(error):
        return "gemini_request_timeout"
    if _is_unavailable_error(error):
        return "gemini_request_unavailable"
    return "gemini_request_failed"


class GeminiGraphExtractor:
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3.1-flash-lite-preview",
        max_retries: int = 1,
        backoff_seconds: float = 1.0,
        timeout_ms: int | None = None,
        client_factory=None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.max_retries = max_retries
        self.backoff_seconds = backoff_seconds
        self.timeout_ms = timeout_ms
        self._client_factory = client_factory
        self._client = None
        self.last_attempts = 0

    def _build_client(self):
        if self._client_factory is not None:
            return self._client_factory()

        from google import genai
        from google.genai import types

        if self.timeout_ms is None:
            return genai.Client(api_key=self.api_key)
        return genai.Client(api_key=self.api_key, http_options=types.HttpOptions(timeout=self.timeout_ms))

    @property
    def client(self):
        if self._client is None:
            self._client = self._build_client()
        return self._client

    def _generate_payload(self, prompt: str):
        from google.genai import types

        return self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=model_json_schema_compat(ChunkGraph),
            ),
        )

    def _response_to_payload(self, response) -> Any:
        parsed = getattr(response, "parsed", None)
        if parsed is not None:
            if isinstance(parsed, dict):
                return parsed
            return model_dump_compat(parsed)

        text = getattr(response, "text", None)
        if not text:
            raise ValueError("Gemini returned an empty response body.")
        return json.loads(text)

    def extract_chunk(self, chunk_text: str, prompt: str, chunk_index: int) -> tuple[ChunkGraph, Any]:
        del chunk_text
        self.last_attempts = 0
        last_error: GeminiExtractionError | None = None
        for attempt in range(self.max_retries + 1):
            self.last_attempts = attempt + 1
            raw_payload = None
            try:
                response = self._generate_payload(prompt)
                raw_payload = self._response_to_payload(response)
                graph = validate_chunk_graph_payload(raw_payload)
                return graph, raw_payload
            except GraphValidationError as exc:
                last_error = GeminiExtractionError(
                    code="gemini_extraction_failed",
                    chunk_index=chunk_index,
                    validation_errors=exc.validation_errors or [str(exc)],
                    raw_payload=raw_payload,
                )
            except Exception as exc:
                last_error = GeminiExtractionError(
                    code=_request_error_code(exc),
                    chunk_index=chunk_index,
                    validation_errors=[str(exc)],
                    raw_payload=raw_payload,
                )

            if attempt < self.max_retries and self.backoff_seconds > 0:
                time.sleep(self.backoff_seconds * (2**attempt))

        if last_error is None:
            raise GeminiExtractionError(
                code="gemini_request_failed",
                chunk_index=chunk_index,
                validation_errors=["Gemini extraction failed for an unknown reason."],
            )
        raise last_error


class GeminiDocumentGraphExtractor(GeminiGraphExtractor):
    def _generate_payload(self, prompt: str):
        from google.genai import types

        return self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=model_json_schema_compat(DocumentChunkGraph),
            ),
        )

    def extract_chunk(self, chunk_text: str, prompt: str, chunk_index: int) -> tuple[DocumentChunkGraph, Any]:
        del chunk_text
        self.last_attempts = 0
        last_error: GeminiExtractionError | None = None
        for attempt in range(self.max_retries + 1):
            self.last_attempts = attempt + 1
            raw_payload = None
            try:
                response = self._generate_payload(prompt)
                raw_payload = self._response_to_payload(response)
                graph = validate_document_chunk_graph_payload(raw_payload)
                return graph, raw_payload
            except GraphValidationError as exc:
                last_error = GeminiExtractionError(
                    code="gemini_document_extraction_failed",
                    chunk_index=chunk_index,
                    validation_errors=exc.validation_errors or [str(exc)],
                    raw_payload=raw_payload,
                )
            except Exception as exc:
                last_error = GeminiExtractionError(
                    code=_request_error_code(exc),
                    chunk_index=chunk_index,
                    validation_errors=[str(exc)],
                    raw_payload=raw_payload,
                )

            if attempt < self.max_retries and self.backoff_seconds > 0:
                time.sleep(self.backoff_seconds * (2**attempt))

        if last_error is None:
            raise GeminiExtractionError(
                code="gemini_request_failed",
                chunk_index=chunk_index,
                validation_errors=["Gemini document extraction failed for an unknown reason."],
            )
        raise last_error
