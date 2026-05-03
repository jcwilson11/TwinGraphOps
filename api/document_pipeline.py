import math
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent
from typing import Any

from graph_pipeline import GraphValidationError
from models import (
    DocumentChunkGraph,
    DocumentEvidence,
    DocumentGraphEdge,
    DocumentGraphNode,
    DocumentMergedGraph,
    DocumentSource,
    model_validate_compat,
)


DOCUMENT_EXTRACTION_PROMPT_TEMPLATE = dedent("""
    You are a generic document knowledge graph extraction engine.

    Read ONE markdown chunk and extract a machine-readable graph of explicit
    entities, concepts, sections, claims, obligations, requirements, dates,
    metrics, processes, roles, systems, risks, and relationships.

    The chunk may contain page markers such as:
    [PDF_PAGE_START=12]
    [PDF_PAGE_END=12]

    Extract ONLY facts explicitly stated in THIS CHUNK.
    Do NOT infer missing text across chunk boundaries.
    Do NOT use outside knowledge.

    Return ONLY valid JSON with this exact schema (no commentary, no markdown):

    {{
      "source": {{
        "document_name": "{document_name}",
        "chunk_file": "{chunk_file}",
        "chunk_id": "{chunk_id}",
        "pdf_page_start": {pdf_page_start},
        "pdf_page_end": {pdf_page_end}
      }},
      "nodes": [
        {{
          "id": "{chunk_id}:N1",
          "label": "Short display label",
          "kind": "entity|concept|section|claim|obligation|requirement|date|metric|process|role|system|risk|other",
          "canonical_name": "Stable normalized name",
          "aliases": ["Optional alternate name"],
          "summary": "One short neutral sentence.",
          "evidence": [
            {{
              "quote": "Exact verbatim excerpt from this chunk only.",
              "page_start": 12,
              "page_end": 12
            }}
          ]
        }}
      ],
      "edges": [
        {{
          "id": "{chunk_id}:E1",
          "source": "{chunk_id}:N1",
          "target": "{chunk_id}:N2",
          "type": "defines|contains|requires|describes|claims|depends_on|causes|mitigates|measures|assigned_to|applies_to|references|related_to",
          "summary": "One short neutral sentence.",
          "evidence": [
            {{
              "quote": "Exact verbatim excerpt from this chunk only.",
              "page_start": 12,
              "page_end": 12
            }}
          ]
        }}
      ]
    }}

    Rules:
    - Use IDs unique to this chunk only, in the form "{chunk_id}:N1", "{chunk_id}:N2", etc.
    - Create a node only when the concept is materially useful for later retrieval.
    - Create an edge only when the relationship is explicit in the text.
    - Every node and edge must include at least one exact evidence quote when possible.
    - If a page number cannot be determined, use null.
    - If the chunk contains no meaningful entities or relationships, return empty arrays.

    TEXT CHUNK START
    ----------------
    {chunk_text}
    ----------------
    TEXT CHUNK END
""").strip()


PAGE_START_PATTERN = re.compile(r"\[PDF_PAGE_START=(\d+)\]")
PAGE_END_PATTERN = re.compile(r"\[PDF_PAGE_END=(\d+)\]")
PAGE_BLOCK_PATTERN = re.compile(r"(\[PDF_PAGE_START=(\d+)\].*?\[PDF_PAGE_END=\2\])", re.DOTALL)
DOCUMENT_PART_COUNT = 18
DOCUMENT_PART_OVERLAP_PAGES = 2


class DocumentPageMarkerError(ValueError):
    pass


@dataclass(frozen=True)
class DocumentMarkdownPart:
    part_id: str
    filename: str
    text: str
    page_start: int | None = None
    page_end: int | None = None


@dataclass(frozen=True)
class DocumentChunkingResult:
    parts: list[DocumentMarkdownPart]
    meta_text: str
    total_pages: int
    page_markers_detected: bool


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def normalize_kind(kind: str | None) -> str:
    value = normalize_text(kind).lower()
    allowed = {
        "entity",
        "concept",
        "section",
        "claim",
        "obligation",
        "requirement",
        "date",
        "metric",
        "process",
        "role",
        "system",
        "risk",
        "other",
    }
    return value if value in allowed else "other"


def extract_page_range(text: str) -> tuple[int | None, int | None]:
    starts = [int(match.group(1)) for match in PAGE_START_PATTERN.finditer(text)]
    ends = [int(match.group(1)) for match in PAGE_END_PATTERN.finditer(text)]
    if not starts and not ends:
        return None, None
    values = starts + ends
    return min(values), max(values)


def convert_pdf_bytes_to_markdown(raw: bytes) -> str:
    import pymupdf
    import pymupdf4llm

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)

    try:
        doc = pymupdf.open(tmp_path)
        try:
            pages = pymupdf4llm.to_markdown(
                doc,
                page_chunks=True,
                use_ocr=False,
                ignore_images=True,
                show_progress=False,
            )
        finally:
            doc.close()
    finally:
        tmp_path.unlink(missing_ok=True)

    parts: list[str] = []
    for index, page in enumerate(pages, start=1):
        metadata = page.get("metadata", {})
        page_number = metadata.get("page_number", metadata.get("page", index))
        text = str(page.get("text") or "").strip()
        if page_number is None:
            parts.append(text)
            continue
        parts.append(f"[PDF_PAGE_START={page_number}]\n\n{text}\n\n[PDF_PAGE_END={page_number}]")
    return "\n\n".join(part for part in parts if part.strip())


def _extract_page_blocks(text: str) -> list[tuple[int, str]]:
    starts = list(PAGE_START_PATTERN.finditer(text))
    ends = list(PAGE_END_PATTERN.finditer(text))
    if not starts and not ends:
        return []

    blocks = [(int(match.group(2)), match.group(1).strip()) for match in PAGE_BLOCK_PATTERN.finditer(text)]
    if len(blocks) != len(starts) or len(blocks) != len(ends):
        raise DocumentPageMarkerError(
            "Page markers are unbalanced or out of order. Expected matching [PDF_PAGE_START=n] and [PDF_PAGE_END=n] blocks."
        )
    return blocks


def split_document_markdown_parts(
    text: str,
    source_stem: str = "source_document",
    num_parts: int = DOCUMENT_PART_COUNT,
    overlap_pages: int = DOCUMENT_PART_OVERLAP_PAGES,
) -> DocumentChunkingResult:
    if num_parts < 1:
        raise ValueError("num_parts must be >= 1")
    if overlap_pages < 0:
        raise ValueError("overlap_pages must be >= 0")

    page_blocks = _extract_page_blocks(text)
    if page_blocks:
        total_pages = len(page_blocks)
        pages_per_part = math.ceil(total_pages / num_parts)
        parts: list[DocumentMarkdownPart] = []

        for index in range(num_parts):
            base_start = index * pages_per_part
            start = base_start
            end = min(total_pages, (index + 1) * pages_per_part)
            if index > 0:
                start = max(0, start - overlap_pages)

            part_pages = page_blocks[start:end]
            part_text = "\n\n".join(page_text for _, page_text in part_pages).strip()
            page_numbers = [page_number for page_number, _ in part_pages]
            part_number = index + 1
            parts.append(
                DocumentMarkdownPart(
                    part_id=f"{source_stem}_part_{part_number:03d}",
                    filename=f"{source_stem}_part_{part_number:03d}.md",
                    text=part_text,
                    page_start=min(page_numbers) if page_numbers else None,
                    page_end=max(page_numbers) if page_numbers else None,
                )
            )

        meta_text = "\n".join(
            [
                f"source_file: {source_stem}.md",
                f"num_parts: {num_parts}",
                f"overlap_pages: {overlap_pages}",
                f"total_pages: {total_pages}",
                f"files_written: {len(parts)}",
                f"approx_pages_per_part: {pages_per_part}",
                "page_markers_detected: true",
            ]
        )
        return DocumentChunkingResult(
            parts=parts,
            meta_text=f"{meta_text}\n",
            total_pages=total_pages,
            page_markers_detected=True,
        )

    part_text = text.strip()
    parts = []
    if part_text:
        parts.append(
            DocumentMarkdownPart(
                part_id=f"{source_stem}_part_001",
                filename=f"{source_stem}_part_001.md",
                text=part_text,
            )
        )

    meta_text = "\n".join(
        [
            f"source_file: {source_stem}.md",
            f"num_parts: {num_parts}",
            f"overlap_pages: {overlap_pages}",
            "total_pages: 0",
            f"files_written: {len(parts)}",
            "approx_pages_per_part: 1",
            "page_markers_detected: false",
        ]
    )
    return DocumentChunkingResult(
        parts=parts,
        meta_text=f"{meta_text}\n",
        total_pages=0,
        page_markers_detected=False,
    )


def chunk_document_text(text: str, max_chars: int = 3000, overlap: int = 400, max_chunks: int = 18) -> list[str]:
    del max_chars, overlap, max_chunks
    return [part.text for part in split_document_markdown_parts(text).parts]


def build_document_extraction_prompt(
    *,
    chunk_text: str,
    document_name: str,
    chunk_file: str,
    chunk_id: str,
) -> str:
    page_start, page_end = extract_page_range(chunk_text)
    return DOCUMENT_EXTRACTION_PROMPT_TEMPLATE.format(
        document_name=document_name,
        chunk_file=chunk_file,
        chunk_id=chunk_id,
        pdf_page_start="null" if page_start is None else page_start,
        pdf_page_end="null" if page_end is None else page_end,
        chunk_text=chunk_text,
    )


def validate_document_chunk_graph_payload(payload: Any) -> DocumentChunkGraph:
    try:
        graph = model_validate_compat(DocumentChunkGraph, payload)
    except Exception as exc:
        raise GraphValidationError("Document chunk graph schema validation failed.", [str(exc)]) from exc

    errors: list[str] = []
    node_ids = set()

    for index, node in enumerate(graph.nodes):
        if not node.id.strip():
            errors.append(f"nodes[{index}].id is missing")
        if not node.label.strip():
            errors.append(f"nodes[{index}].label is missing")
        if not node.canonical_name.strip():
            errors.append(f"nodes[{index}].canonical_name is missing")
        node_ids.add(node.id)

    for index, edge in enumerate(graph.edges):
        if not edge.id.strip():
            errors.append(f"edges[{index}].id is missing")
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
        raise GraphValidationError("Document chunk graph business validation failed.", errors)
    return graph


def _merge_key(node) -> tuple[str, str]:
    return normalize_kind(node.kind), normalize_text(node.canonical_name or node.label).lower()


def _merge_aliases(existing: list[str], incoming: list[str]) -> list[str]:
    seen = {normalize_text(alias).lower(): normalize_text(alias) for alias in existing if normalize_text(alias)}
    for alias in incoming:
        normalized = normalize_text(alias)
        if normalized and normalized.lower() not in seen:
            seen[normalized.lower()] = normalized
    return list(seen.values())


def _merge_evidence(existing: list[DocumentEvidence], incoming: list[DocumentEvidence]) -> list[DocumentEvidence]:
    seen = set()
    merged: list[DocumentEvidence] = []
    for item in existing + incoming:
        quote = normalize_text(item.quote)
        key = (quote, item.page_start, item.page_end)
        if quote and key not in seen:
            seen.add(key)
            merged.append(item)
    return merged


def _merge_sources(existing: list[DocumentSource], incoming: list[DocumentSource]) -> list[DocumentSource]:
    seen = set()
    merged: list[DocumentSource] = []
    for item in existing + incoming:
        key = (item.document_name, item.chunk_file, item.chunk_id, item.pdf_page_start, item.pdf_page_end)
        if key not in seen:
            seen.add(key)
            merged.append(item)
    return merged


def merge_document_chunk_graphs(chunk_graphs: list[DocumentChunkGraph]) -> DocumentMergedGraph:
    nodes_by_key: dict[tuple[str, str], DocumentGraphNode] = {}
    local_to_global: dict[str, str] = {}
    edges: list[DocumentGraphEdge] = []
    edge_seen = set()
    next_node_id = 1
    next_edge_id = 1

    for chunk_graph in chunk_graphs:
        file_local_to_global: dict[str, str] = {}
        source_info = chunk_graph.source

        for node in chunk_graph.nodes:
            key = _merge_key(node)
            if not key[1]:
                continue

            if key not in nodes_by_key:
                global_id = f"D{next_node_id}"
                next_node_id += 1
                nodes_by_key[key] = DocumentGraphNode(
                    id=global_id,
                    label=node.label.strip(),
                    kind=normalize_kind(node.kind),
                    canonical_name=node.canonical_name.strip() or node.label.strip(),
                    aliases=list(node.aliases),
                    summary=node.summary.strip(),
                    evidence=list(node.evidence),
                    sources=[source_info],
                )
            else:
                existing = nodes_by_key[key]
                existing.aliases = _merge_aliases(existing.aliases, node.aliases)
                existing.evidence = _merge_evidence(existing.evidence, node.evidence)
                existing.sources = _merge_sources(existing.sources, [source_info])
                if not existing.summary and node.summary.strip():
                    existing.summary = node.summary.strip()

            file_local_to_global[node.id] = nodes_by_key[key].id
            local_to_global[node.id] = nodes_by_key[key].id

        for edge in chunk_graph.edges:
            source = file_local_to_global.get(edge.source) or local_to_global.get(edge.source)
            target = file_local_to_global.get(edge.target) or local_to_global.get(edge.target)
            if not source or not target or source == target:
                continue

            edge_type = normalize_text(edge.type).lower() or "related_to"
            evidence_key = tuple((normalize_text(item.quote), item.page_start, item.page_end) for item in edge.evidence)
            key = (source, target, edge_type, evidence_key)
            if key in edge_seen:
                continue
            edge_seen.add(key)

            edges.append(
                DocumentGraphEdge(
                    id=f"DE{next_edge_id}",
                    source=source,
                    target=target,
                    type=edge_type,
                    summary=edge.summary.strip(),
                    evidence=list(edge.evidence),
                    source_chunk=source_info,
                )
            )
            next_edge_id += 1

    degree: dict[str, int] = {}
    for edge in edges:
        degree[edge.source] = degree.get(edge.source, 0) + 1
        degree[edge.target] = degree.get(edge.target, 0) + 1

    nodes = sorted(nodes_by_key.values(), key=lambda node: node.canonical_name.lower())
    for node in nodes:
        node.degree = float(degree.get(node.id, 0))

    return DocumentMergedGraph(nodes=nodes, edges=edges)
