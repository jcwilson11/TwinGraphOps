import assert from 'node:assert/strict';
import test from 'node:test';
import { installRuntimeWindowConfig } from './test-utils';

installRuntimeWindowConfig();

const stateModule = await import('../src/state/AppContext');
const {
  createSelectedDocumentFileUploadState,
  createSelectedFileUploadState,
  createSelectedUploadedGraphFileState,
  getFileExtension,
  parseUploadedGraphJson,
  validateSelectedDocumentFile,
  validateSelectedFile,
  validateSelectedUploadedGraphFile,
} = stateModule;

test('getFileExtension normalizes file extensions', () => {
  assert.equal(getFileExtension('manual.MD'), '.md');
  assert.equal(getFileExtension('notes.txt'), '.txt');
  assert.equal(getFileExtension('README'), '');
});

test('validateSelectedFile rejects unsupported file types', () => {
  const file = new File(['bad'], 'diagram.pdf', { type: 'application/pdf' });
  const result = validateSelectedFile(file, 10 * 1024 * 1024);

  assert.equal(result.phase, 'error');
  assert.equal(result.error, 'Only .md and .txt files are supported.');
  assert.equal(result.statusMessage, 'Unsupported file type.');
});

test('validateSelectedFile rejects oversized files', () => {
  const file = new File([new Uint8Array(12)], 'system.md', { type: 'text/markdown' });
  Object.defineProperty(file, 'size', { configurable: true, value: 52 * 1024 * 1024 });

  const result = validateSelectedFile(file, 50 * 1024 * 1024);

  assert.equal(result.phase, 'error');
  assert.match(result.error || '', /50 MB upload limit/);
  assert.equal(result.statusMessage, 'Selected file is too large.');
});

test('validateSelectedFile accepts supported files and returns the selected-file state', () => {
  const file = new File(['hello'], 'system.md', { type: 'text/markdown' });
  const result = validateSelectedFile(file, 10 * 1024 * 1024);

  assert.deepEqual(result, createSelectedFileUploadState(file));
});

test('validateSelectedDocumentFile accepts pdf markdown and text files', () => {
  for (const filename of ['policy.pdf', 'policy.md', 'policy.txt']) {
    const file = new File(['hello'], filename);
    const result = validateSelectedDocumentFile(file, 10 * 1024 * 1024);

    assert.deepEqual(result, createSelectedDocumentFileUploadState(file));
  }
});

test('validateSelectedUploadedGraphFile rejects non-json files', () => {
  const file = new File(['bad'], 'graph.md', { type: 'text/markdown' });
  const result = validateSelectedUploadedGraphFile(file, 10 * 1024 * 1024);

  assert.equal(result.phase, 'error');
  assert.equal(result.error, 'Only .json graph artifact files are supported.');
});

test('validateSelectedUploadedGraphFile accepts json files', () => {
  const file = new File(['{}'], 'merged_graph.json', { type: 'application/json' });
  const result = validateSelectedUploadedGraphFile(file, 10 * 1024 * 1024);

  assert.deepEqual(result, createSelectedUploadedGraphFileState(file));
});

test('parseUploadedGraphJson rejects malformed JSON text', () => {
  assert.throws(() => parseUploadedGraphJson('{bad json}'), /not valid JSON/);
});

test('parseUploadedGraphJson rejects valid JSON with the wrong schema', () => {
  assert.throws(
    () => parseUploadedGraphJson(JSON.stringify({ nodes: [{ id: 'n1' }], edges: [] })),
    /supported operational or document graph artifact schema/
  );
});

test('parseUploadedGraphJson accepts finalized merged graph payloads', () => {
  const payload = parseUploadedGraphJson(
    JSON.stringify({
      nodes: [
        {
          id: 'api',
          name: 'API',
          type: 'software',
          description: 'Core API',
          risk_score: 82,
          risk_level: 'high',
          degree: 2,
          betweenness: 0.5,
          closeness: 0.6,
          blast_radius: 3,
          dependency_span: 2,
          risk_explanation: 'Critical dependency hub.',
          source: 'user',
        },
      ],
      edges: [],
    })
  );

  assert.equal(payload.kind, 'operational');
  assert.equal((payload.rawData as any).nodes[0].id, 'api');
  assert.deepEqual((payload.rawData as any).edges, []);
});

test('parseUploadedGraphJson accepts merged_document_graph payloads', () => {
  const payload = parseUploadedGraphJson(
    JSON.stringify({
      source: 'document',
      nodes: [
        {
          id: 'D1',
          label: 'Retention Policy',
          kind: 'requirement',
          canonical_name: 'Retention Policy',
          aliases: ['records policy'],
          summary: 'Defines retention.',
          evidence: [],
          sources: [],
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
          evidence: [],
          source_chunk: null,
        },
      ],
    })
  );

  assert.equal(payload.kind, 'document');
  assert.equal((payload.rawData as any).source, 'document');
});

test('parseUploadedGraphJson accepts neo4j_document_payload-style payloads', () => {
  const payload = parseUploadedGraphJson(
    JSON.stringify({
      source: 'document',
      nodes: [
        {
          id: 'D1',
          label: 'Retention Policy',
          kind: 'requirement',
          canonical_name: 'Retention Policy',
          aliases: [],
          summary: 'Defines retention.',
          evidence: [],
          sources: [],
          degree: 1,
          source: 'document',
        },
      ],
      edges: [],
    })
  );

  assert.equal(payload.kind, 'document');
});
