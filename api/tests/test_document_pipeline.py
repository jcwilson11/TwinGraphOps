import unittest

from pathlib import Path
import sys
import types
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from document_pipeline import (
    chunk_document_text,
    convert_pdf_bytes_to_markdown,
    split_document_markdown_parts,
    merge_document_chunk_graphs,
    validate_document_chunk_graph_payload,
)
from graph_pipeline import GraphValidationError
from models import DocumentChunkGraph, DocumentChunkNode, DocumentEvidence, DocumentSource, DocumentChunkEdge


class DocumentPipelineTests(unittest.TestCase):
    def test_convert_pdf_bytes_to_markdown_uses_page_metadata(self):
        captured_kwargs = {}
        fake_doc = types.SimpleNamespace(close=lambda: None)
        fake_pymupdf = types.SimpleNamespace(open=lambda _path: fake_doc)

        def fake_to_markdown(*_args, **kwargs):
            captured_kwargs.update(kwargs)
            return [
                {"metadata": {"page": 1}, "text": "First page"},
                {"metadata": {"page": 2}, "text": "Second page"},
            ]

        fake_pymupdf4llm = types.SimpleNamespace(to_markdown=fake_to_markdown)

        with patch.dict(sys.modules, {"pymupdf": fake_pymupdf, "pymupdf4llm": fake_pymupdf4llm}):
            markdown = convert_pdf_bytes_to_markdown(b"%PDF-1.4 fake")

        self.assertTrue(captured_kwargs["page_chunks"])
        self.assertTrue(captured_kwargs["ignore_images"])
        self.assertFalse(captured_kwargs["show_progress"])
        self.assertIn("[PDF_PAGE_START=1]", markdown)
        self.assertIn("[PDF_PAGE_END=1]", markdown)
        self.assertIn("[PDF_PAGE_START=2]", markdown)
        self.assertIn("[PDF_PAGE_END=2]", markdown)

    def test_convert_pdf_bytes_to_markdown_uses_page_number_metadata(self):
        fake_doc = types.SimpleNamespace(close=lambda: None)
        fake_pymupdf = types.SimpleNamespace(open=lambda _path: fake_doc)
        fake_pymupdf4llm = types.SimpleNamespace(
            to_markdown=lambda *_args, **_kwargs: [
                {"metadata": {"page_number": 1}, "text": "First page"},
                {"metadata": {"page_number": 2}, "text": "Second page"},
            ]
        )

        with patch.dict(sys.modules, {"pymupdf": fake_pymupdf, "pymupdf4llm": fake_pymupdf4llm}):
            markdown = convert_pdf_bytes_to_markdown(b"%PDF-1.4 fake")

        self.assertIn("[PDF_PAGE_START=1]", markdown)
        self.assertIn("[PDF_PAGE_END=1]", markdown)
        self.assertIn("[PDF_PAGE_START=2]", markdown)
        self.assertIn("[PDF_PAGE_END=2]", markdown)

    def test_page_marked_markdown_writes_exactly_18_parts(self):
        text = "\n\n".join(
            [
                f"[PDF_PAGE_START={page}]\n\nPage {page}\n\n[PDF_PAGE_END={page}]"
                for page in range(1, 5)
            ]
        )

        result = split_document_markdown_parts(text)

        self.assertTrue(result.page_markers_detected)
        self.assertEqual(result.total_pages, 4)
        self.assertEqual(len(result.parts), 18)
        self.assertIn("num_parts: 18", result.meta_text)
        self.assertIn("overlap_pages: 2", result.meta_text)
        self.assertIn("files_written: 18", result.meta_text)
        for part in [part for part in result.parts if part.text]:
            self.assertRegex(part.text, r"^\[PDF_PAGE_START=\d+\]")
            self.assertRegex(part.text, r"\[PDF_PAGE_END=\d+\]$")
            self.assertEqual(part.filename, f"{part.part_id}.md")

    def test_page_marked_markdown_uses_two_page_overlap(self):
        text = "\n\n".join(
            [
                f"[PDF_PAGE_START={page}]\n\npage {page}\n\n[PDF_PAGE_END={page}]"
                for page in range(1, 41)
            ]
        )

        result = split_document_markdown_parts(text)

        self.assertEqual(len(result.parts), 18)
        self.assertEqual(result.parts[0].page_start, 1)
        self.assertEqual(result.parts[0].page_end, 3)
        self.assertEqual(result.parts[1].page_start, 2)
        self.assertEqual(result.parts[1].page_end, 6)
        self.assertIn("[PDF_PAGE_START=2]", result.parts[1].text)
        self.assertIn("[PDF_PAGE_START=3]", result.parts[1].text)
        for part in [part for part in result.parts if part.text]:
            self.assertRegex(part.text, r"^\[PDF_PAGE_START=\d+\]")
            self.assertRegex(part.text, r"\[PDF_PAGE_END=\d+\]$")

    def test_page_marked_245_page_markdown_splits_like_financial_report(self):
        text = "\n\n".join(
            [
                f"[PDF_PAGE_START={page}]\n\npage {page}\n\n[PDF_PAGE_END={page}]"
                for page in range(1, 246)
            ]
        )

        result = split_document_markdown_parts(text)

        self.assertEqual(len(result.parts), 18)
        self.assertEqual(result.total_pages, 245)
        self.assertEqual(result.parts[0].page_start, 1)
        self.assertEqual(result.parts[0].page_end, 14)
        self.assertEqual(result.parts[1].page_start, 13)
        self.assertEqual(result.parts[1].page_end, 28)
        self.assertEqual(result.parts[-1].page_start, 237)
        self.assertEqual(result.parts[-1].page_end, 245)

    def test_plain_markdown_becomes_one_downloadable_part(self):
        result = split_document_markdown_parts("# Policy\n\nRecords are retained for 7 years.")

        self.assertFalse(result.page_markers_detected)
        self.assertEqual(result.total_pages, 0)
        self.assertEqual(len(result.parts), 1)
        self.assertEqual(result.parts[0].filename, "source_document_part_001.md")
        self.assertIn("page_markers_detected: false", result.meta_text)

    def test_chunk_document_text_keeps_compatibility_wrapper(self):
        chunks = chunk_document_text("# Policy\n\nRecords are retained for 7 years.")

        self.assertEqual(chunks, ["# Policy\n\nRecords are retained for 7 years."])

    def test_validate_document_chunk_graph_rejects_bad_edges(self):
        with self.assertRaises(GraphValidationError) as context:
            validate_document_chunk_graph_payload(
                {
                    "source": {"document_name": "manual.md", "chunk_file": "chunk_01.txt", "chunk_id": "chunk_01"},
                    "nodes": [
                        {
                            "id": "chunk_01:N1",
                            "label": "Policy",
                            "kind": "section",
                            "canonical_name": "Policy",
                            "aliases": [],
                            "summary": "",
                            "evidence": [{"quote": "Policy text", "page_start": None, "page_end": None}],
                        }
                    ],
                    "edges": [
                        {
                            "id": "chunk_01:E1",
                            "source": "chunk_01:N1",
                            "target": "missing",
                            "type": "references",
                            "summary": "",
                            "evidence": [],
                        }
                    ],
                }
            )

        self.assertIn("references unknown node 'missing'", context.exception.validation_errors[0])

    def test_merge_document_chunk_graphs_deduplicates_nodes_and_preserves_evidence(self):
        source_a = DocumentSource(document_name="manual.md", chunk_file="chunk_01.txt", chunk_id="chunk_01")
        source_b = DocumentSource(document_name="manual.md", chunk_file="chunk_02.txt", chunk_id="chunk_02")
        chunk_a = DocumentChunkGraph(
            source=source_a,
            nodes=[
                DocumentChunkNode(
                    id="chunk_01:N1",
                    label="Service Level",
                    kind="requirement",
                    canonical_name="Service Level",
                    aliases=["SLA"],
                    summary="Defines service level.",
                    evidence=[DocumentEvidence(quote="Service Level means uptime.", page_start=1, page_end=1)],
                ),
                DocumentChunkNode(
                    id="chunk_01:N2",
                    label="Uptime",
                    kind="metric",
                    canonical_name="Uptime",
                    evidence=[DocumentEvidence(quote="uptime", page_start=1, page_end=1)],
                ),
            ],
            edges=[
                DocumentChunkEdge(
                    id="chunk_01:E1",
                    source="chunk_01:N1",
                    target="chunk_01:N2",
                    type="measures",
                    summary="Service level measures uptime.",
                    evidence=[DocumentEvidence(quote="Service Level means uptime.", page_start=1, page_end=1)],
                )
            ],
        )
        chunk_b = DocumentChunkGraph(
            source=source_b,
            nodes=[
                DocumentChunkNode(
                    id="chunk_02:N1",
                    label="service level",
                    kind="requirement",
                    canonical_name="service level",
                    aliases=["availability target"],
                    evidence=[DocumentEvidence(quote="service level target", page_start=2, page_end=2)],
                )
            ],
            edges=[],
        )

        merged = merge_document_chunk_graphs([chunk_a, chunk_b])
        service_level = next(node for node in merged.nodes if node.canonical_name == "Service Level")

        self.assertEqual(len(merged.nodes), 2)
        self.assertEqual(len(merged.edges), 1)
        self.assertIn("SLA", service_level.aliases)
        self.assertIn("availability target", service_level.aliases)
        self.assertEqual(len(service_level.evidence), 2)
        self.assertEqual(len(service_level.sources), 2)


if __name__ == "__main__":
    unittest.main()
