import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  createMockContext,
  createSampleDocumentGraphData,
  createSampleGraphData,
  installRuntimeWindowConfig,
} from './test-utils';

installRuntimeWindowConfig();

const { AppContext } = await import('../src/state/AppContext');
const { default: LandingPage } = await import('../src/pages/LandingPage');
const { default: ProcessingPage } = await import('../src/pages/ProcessingPage');
const { default: SystemOverview } = await import('../src/components/SystemOverview');
const { default: DocumentUploadPage } = await import('../src/pages/DocumentUploadPage');
const { default: DocumentOverview } = await import('../src/components/DocumentOverview');
const { default: UploadedGraphUploadPage } = await import('../src/pages/UploadedGraphUploadPage');
const { default: UploadedGraphWorkspace } = await import('../src/pages/UploadedGraphWorkspace');

function renderWithContext(
  element: ReactNode,
  contextOverrides = {},
  initialEntries = ['/']
) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={initialEntries}>
      <AppContext.Provider value={createMockContext(contextOverrides)}>{element}</AppContext.Provider>
    </MemoryRouter>
  );
}

test('landing page renders the upload workspace content', () => {
  const html = renderWithContext(<LandingPage />);

  assert.match(html, /TwinGraphOps/);
  assert.match(html, /Upload System Documentation/);
  assert.match(html, /Supported formats: \.md and \.txt/);
  assert.match(html, /Document Workspace/);
  assert.match(html, /Graph Workspace/);
});

test('processing page renders the active processing state', () => {
  const html = renderWithContext(
    <ProcessingPage />,
    {
      upload: {
        ...createMockContext().upload,
        phase: 'uploading',
        selectedFile: new File(['hello'], 'system.md', { type: 'text/markdown' }),
        statusMessage: 'Uploading system.md...',
        startedAt: Date.now(),
      },
    },
    ['/processing']
  );

  assert.match(html, /Processing Your Documentation/);
  assert.match(html, /Uploading document/);
  assert.match(html, /Uploading system\.md/);
});

test('system overview renders the loaded workspace summary', () => {
  const graphData = createSampleGraphData();
  const html = renderToStaticMarkup(<SystemOverview graphData={graphData} />);

  assert.match(html, /System Overview/);
  assert.match(html, /Total Components/);
  assert.match(html, /Relationships/);
  assert.match(html, /Most Connected Components/);
  assert.match(html, /API Service/);
});

test('document upload page renders pdf markdown and text support', () => {
  const html = renderWithContext(<DocumentUploadPage />, {}, ['/documents']);

  assert.match(html, /Document Knowledge Graphs/);
  assert.match(html, /Supported formats: \.pdf, \.md, and \.txt/);
  assert.match(html, /Risk Workspace/);
  assert.match(html, /Graph Workspace/);
});

test('uploaded graph upload page renders json-only copy', () => {
  const html = renderWithContext(<UploadedGraphUploadPage />, {}, ['/graphs']);

  assert.match(html, /Finalized Knowledge Graphs/);
  assert.match(html, /operational or document graph artifact JSON/i);
  assert.match(html, /Open Uploaded Graph/);
});

test('uploaded graph workspace renders loaded graph summary', () => {
  const graphData = createSampleGraphData();
  const html = renderWithContext(
    <UploadedGraphWorkspace />,
    {
      uploadedGraph: {
        ...createMockContext().uploadedGraph,
        status: 'ready',
        kind: 'operational',
        operationalData: graphData,
        filename: 'merged_graph.json',
      },
    },
    ['/graphs/workspace']
  );

  assert.match(html, /Uploaded Graph Workspace/);
  assert.match(html, /Auto-detected operational artifact/);
  assert.match(html, /merged_graph\.json/i);
});

test('uploaded graph workspace renders empty state when no graph is loaded', () => {
  const html = renderWithContext(<UploadedGraphWorkspace />, {}, ['/graphs/workspace']);

  assert.match(html, /No Uploaded Graph Loaded/);
  assert.match(html, /Upload Graph JSON/);
});

test('uploaded graph workspace renders document-style viewer for document artifacts', () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    <UploadedGraphWorkspace />,
    {
      uploadedGraph: {
        ...createMockContext().uploadedGraph,
        status: 'ready',
        kind: 'document',
        documentData: graphData,
        filename: 'merged_document_graph.json',
      },
    },
    ['/graphs/workspace']
  );

  assert.match(html, /Uploaded Document Graph Workspace/);
  assert.match(html, /Auto-detected document artifact/);
  assert.match(html, /merged_document_graph\.json/i);
});

test('document overview renders the loaded document graph summary', () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderToStaticMarkup(<DocumentOverview graphData={graphData} />);

  assert.match(html, /Document Overview/);
  assert.match(html, /Document Nodes/);
  assert.match(html, /Evidence Items/);
  assert.match(html, /Retention Policy/);
});
