import assert from 'node:assert/strict';
import test from 'node:test';
import { installRuntimeWindowConfig } from './test-utils';

installRuntimeWindowConfig();

const { adaptDocumentGraph } = await import('../src/lib/adapters');

test('adaptDocumentGraph maps evidence sources kinds and relations', () => {
  const graph = adaptDocumentGraph({
    source: 'document',
    nodes: [
      {
        id: 'D1',
        label: 'Retention Policy',
        kind: 'requirement',
        canonical_name: 'Retention Policy',
        aliases: ['records policy'],
        summary: 'Defines retention.',
        evidence: [{ quote: 'Records are retained for 7 years.', page_start: 1, page_end: 1 }],
        sources: [
          {
            document_name: 'policy.pdf',
            chunk_file: 'chunk_01.txt',
            chunk_id: 'chunk_01',
            pdf_page_start: 1,
            pdf_page_end: 1,
          },
        ],
        degree: 1,
        source: 'document',
      },
    ],
    edges: [
      {
        id: 'DE1',
        source: 'D1',
        target: 'D1',
        type: 'references',
        summary: 'Self reference in fixture only.',
        evidence: [{ quote: 'Records', page_start: 1, page_end: 1 }],
        source_chunk: null,
      },
    ],
  });

  assert.equal(graph.source, 'document');
  assert.equal(graph.nodes[0].canonicalName, 'Retention Policy');
  assert.equal(graph.nodes[0].evidence[0].pageStart, 1);
  assert.deepEqual(graph.kindTypes, ['requirement']);
  assert.deepEqual(graph.relationTypes, ['references']);
});

test('adaptDocumentGraph handles empty document graphs', () => {
  const graph = adaptDocumentGraph({ source: 'document', nodes: [], edges: [] });

  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.links.length, 0);
  assert.deepEqual(graph.nodeIndex, {});
});
