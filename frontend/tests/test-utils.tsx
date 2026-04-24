export function installRuntimeWindowConfig(overrides: Partial<Record<string, string | number>> = {}) {
  const requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0);
  const cancelAnimationFrame = (handle: number) => clearTimeout(handle);

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      __TWIN_CONFIG__: {
        MAX_UPLOAD_MB: 10,
        PROCESSING_TIMEOUT_MS: 90000,
        APP_ENV: 'test',
        ...overrides,
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame,
      cancelAnimationFrame,
      devicePixelRatio: 1,
    },
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: {
      createElement: () => ({
        getContext: () => ({}),
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
      }),
      body: {
        appendChild: () => {},
      },
    },
  });

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      userAgent: 'node.js',
    },
  });

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: requestAnimationFrame,
  });

  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: cancelAnimationFrame,
  });

  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  }
}

export function createSampleGraphData() {
  const nodes = [
    {
      id: 'api',
      name: 'API Service',
      type: 'software',
      description: 'Core API',
      riskScore: 82,
      riskLevel: 'high',
      degree: 2,
      betweenness: 0.55,
      closeness: 0.67,
      blastRadius: 3,
      dependencySpan: 2,
      riskExplanation: 'Handles core requests.',
      source: 'sample',
      dependencies: ['db'],
      dependents: ['frontend'],
      val: 36,
    },
    {
      id: 'db',
      name: 'Database',
      type: 'data',
      description: 'Persistence layer',
      riskScore: 44,
      riskLevel: 'medium',
      degree: 1,
      betweenness: 0.22,
      closeness: 0.44,
      blastRadius: 1,
      dependencySpan: 1,
      riskExplanation: 'Stores records.',
      source: 'sample',
      dependencies: [],
      dependents: ['api'],
      val: 28,
    },
  ];

  return {
    source: 'sample',
    nodes,
    links: [
      {
        id: 'api-db-0',
        source: 'api',
        target: 'db',
        relation: 'depends_on',
        rationale: 'Reads and writes records.',
      },
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    relationTypes: ['depends_on'],
  };
}

export function createMockContext(overrides = {}) {
  return {
    upload: {
      phase: 'idle',
      selectedFile: null,
      error: null,
      statusMessage: 'Upload a .md or .txt file to build the graph.',
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
    },
    graph: {
      status: 'idle',
      data: null,
      error: null,
      lastLoadedAt: null,
    },
    setDragActive: () => {},
    selectFile: () => true,
    clearSelectedFile: () => {},
    beginProcessing: async () => {},
    loadGraph: async () => {},
    resetUploadState: () => {},
    ...overrides,
  };
}
