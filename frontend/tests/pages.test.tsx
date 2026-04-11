import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createMockContext, createSampleGraphData, installRuntimeWindowConfig } from './test-utils';

installRuntimeWindowConfig();

const { AppContext } = await import('../src/state/AppContext');
const { default: LandingPage } = await import('../src/pages/LandingPage');
const { default: ProcessingPage } = await import('../src/pages/ProcessingPage');
const { default: MainApp } = await import('../src/pages/MainApp');

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

test('main app renders the workspace for a loaded graph', () => {
  const graphData = createSampleGraphData();
  const html = renderWithContext(
    <MainApp initialView="overview" />,
    {
      graph: {
        status: 'ready',
        data: graphData,
        error: null,
        lastLoadedAt: Date.now(),
      },
    },
    ['/app']
  );

  assert.match(html, /Active Graph Workspace/);
  assert.match(html, /2 components, 1 relationships/);
  assert.match(html, /System Overview/);
});
