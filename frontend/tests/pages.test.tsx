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
const { default: SystemOverview } = await import('../src/components/SystemOverview');

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

test('system overview renders the loaded workspace summary', () => {
  const graphData = createSampleGraphData();
  const html = renderToStaticMarkup(<SystemOverview graphData={graphData} />);

  assert.match(html, /System Overview/);
  assert.match(html, /Total Components/);
  assert.match(html, /Relationships/);
  assert.match(html, /Most Connected Components/);
  assert.match(html, /API Service/);
});
