export { installRuntimeWindowConfig } from './runtime-globals.mjs';

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

export function createSampleMergedGraphData() {
  return {
    nodes: [
      {
        id: 'api',
        name: 'API Service',
        type: 'software',
        description: 'Core API',
        risk_score: 82,
        risk_level: 'high',
        degree: 2,
        betweenness: 0.55,
        closeness: 0.67,
        blast_radius: 3,
        dependency_span: 2,
        risk_explanation: 'Handles core requests.',
        source: 'sample',
      },
      {
        id: 'db',
        name: 'Database',
        type: 'data',
        description: 'Persistence layer',
        risk_score: 44,
        risk_level: 'medium',
        degree: 1,
        betweenness: 0.22,
        closeness: 0.44,
        blast_radius: 1,
        dependency_span: 1,
        risk_explanation: 'Stores records.',
        source: 'sample',
      },
    ],
    edges: [
      {
        source: 'api',
        target: 'db',
        relation: 'depends_on',
        rationale: 'Reads and writes records.',
      },
    ],
  };
}

export function createSampleDocumentGraphData() {
  const nodes = [
    {
      id: 'D1',
      label: 'Retention Policy',
      kind: 'requirement',
      canonicalName: 'Retention Policy',
      aliases: ['records policy'],
      summary: 'Defines record retention.',
      evidence: [{ quote: 'Records are retained for 7 years.', pageStart: 1, pageEnd: 1 }],
      sources: [
        {
          documentName: 'policy.pdf',
          chunkFile: 'chunk_01.txt',
          chunkId: 'chunk_01',
          pdfPageStart: 1,
          pdfPageEnd: 1,
        },
      ],
      degree: 1,
      source: 'document',
      val: 20,
    },
    {
      id: 'D2',
      label: 'Seven Years',
      kind: 'date',
      canonicalName: 'Seven Years',
      aliases: [],
      summary: 'Retention duration.',
      evidence: [{ quote: '7 years', pageStart: 1, pageEnd: 1 }],
      sources: [],
      degree: 1,
      source: 'document',
      val: 20,
    },
  ];

  return {
    source: 'document',
    ingestionId: 'doc-123',
    nodes,
    links: [
      {
        id: 'DE1',
        source: 'D1',
        target: 'D2',
        type: 'requires',
        summary: 'Retention policy requires seven years.',
        evidence: [{ quote: 'retained for 7 years', pageStart: 1, pageEnd: 1 }],
        sourceChunk: {
          documentName: 'policy.pdf',
          chunkFile: 'chunk_01.txt',
          chunkId: 'chunk_01',
          pdfPageStart: 1,
          pdfPageEnd: 1,
        },
      },
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    kindTypes: ['date', 'requirement'],
    relationTypes: ['requires'],
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
    documentUpload: {
      phase: 'idle',
      selectedFile: null,
      error: null,
      statusMessage: 'Upload a .pdf, .md, or .txt file to build a document graph.',
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
    },
    documentGraph: {
      status: 'idle',
      data: null,
      error: null,
      lastLoadedAt: null,
      artifacts: null,
      artifactsError: null,
    },
    uploadedGraphUpload: {
      phase: 'idle',
      selectedFile: null,
      error: null,
      statusMessage: 'Upload a merged_graph.json file to inspect a finalized knowledge graph.',
    },
    uploadedGraph: {
      status: 'idle',
      kind: null,
      operationalData: null,
      documentData: null,
      error: null,
      lastLoadedAt: null,
      filename: null,
      rawData: null,
    },
    setDragActive: () => {},
    selectFile: () => true,
    clearSelectedFile: () => {},
    beginProcessing: async () => {},
    loadGraph: async () => {},
    setDocumentDragActive: () => {},
    selectDocumentFile: () => true,
    clearSelectedDocumentFile: () => {},
    beginDocumentProcessing: async () => {},
    loadDocumentGraph: async () => {},
    setUploadedGraphDragActive: () => {},
    selectUploadedGraphFile: () => true,
    clearSelectedUploadedGraphFile: () => {},
    loadUploadedGraphFromSelectedFile: async () => {},
    resetUploadState: () => {},
    ...overrides,
  };
}
