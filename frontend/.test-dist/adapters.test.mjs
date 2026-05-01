var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// tests/test-utils.tsx
var test_utils_exports = {};
__export(test_utils_exports, {
  createMockContext: () => createMockContext,
  createSampleDocumentGraphData: () => createSampleDocumentGraphData,
  createSampleGraphData: () => createSampleGraphData,
  createSampleMergedGraphData: () => createSampleMergedGraphData,
  installRuntimeWindowConfig: () => installRuntimeWindowConfig
});
function installRuntimeWindowConfig(overrides = {}) {
  const requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  const cancelAnimationFrame = (handle) => clearTimeout(handle);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      __TWIN_CONFIG__: {
        MAX_UPLOAD_MB: 50,
        PROCESSING_TIMEOUT_MS: 9e4,
        APP_ENV: "test",
        ...overrides
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener: () => {
      },
      removeEventListener: () => {
      },
      requestAnimationFrame,
      cancelAnimationFrame,
      devicePixelRatio: 1
    }
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement: () => ({
        getContext: () => ({}),
        style: {},
        setAttribute: () => {
        },
        appendChild: () => {
        }
      }),
      body: {
        appendChild: () => {
        }
      }
    }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      userAgent: "node.js"
    }
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: requestAnimationFrame
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: cancelAnimationFrame
  });
  if (!("ResizeObserver" in globalThis)) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: class ResizeObserver {
        observe() {
        }
        unobserve() {
        }
        disconnect() {
        }
      }
    });
  }
}
function createSampleGraphData() {
  const nodes = [
    {
      id: "api",
      name: "API Service",
      type: "software",
      description: "Core API",
      riskScore: 82,
      riskLevel: "high",
      degree: 2,
      betweenness: 0.55,
      closeness: 0.67,
      blastRadius: 3,
      dependencySpan: 2,
      riskExplanation: "Handles core requests.",
      source: "sample",
      dependencies: ["db"],
      dependents: ["frontend"],
      val: 36
    },
    {
      id: "db",
      name: "Database",
      type: "data",
      description: "Persistence layer",
      riskScore: 44,
      riskLevel: "medium",
      degree: 1,
      betweenness: 0.22,
      closeness: 0.44,
      blastRadius: 1,
      dependencySpan: 1,
      riskExplanation: "Stores records.",
      source: "sample",
      dependencies: [],
      dependents: ["api"],
      val: 28
    }
  ];
  return {
    source: "sample",
    nodes,
    links: [
      {
        id: "api-db-0",
        source: "api",
        target: "db",
        relation: "depends_on",
        rationale: "Reads and writes records."
      }
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    relationTypes: ["depends_on"]
  };
}
function createSampleMergedGraphData() {
  return {
    nodes: [
      {
        id: "api",
        name: "API Service",
        type: "software",
        description: "Core API",
        risk_score: 82,
        risk_level: "high",
        degree: 2,
        betweenness: 0.55,
        closeness: 0.67,
        blast_radius: 3,
        dependency_span: 2,
        risk_explanation: "Handles core requests.",
        source: "sample"
      },
      {
        id: "db",
        name: "Database",
        type: "data",
        description: "Persistence layer",
        risk_score: 44,
        risk_level: "medium",
        degree: 1,
        betweenness: 0.22,
        closeness: 0.44,
        blast_radius: 1,
        dependency_span: 1,
        risk_explanation: "Stores records.",
        source: "sample"
      }
    ],
    edges: [
      {
        source: "api",
        target: "db",
        relation: "depends_on",
        rationale: "Reads and writes records."
      }
    ]
  };
}
function createSampleDocumentGraphData() {
  const nodes = [
    {
      id: "D1",
      label: "Retention Policy",
      kind: "requirement",
      canonicalName: "Retention Policy",
      aliases: ["records policy"],
      summary: "Defines record retention.",
      evidence: [{ quote: "Records are retained for 7 years.", pageStart: 1, pageEnd: 1 }],
      sources: [
        {
          documentName: "policy.pdf",
          chunkFile: "chunk_01.txt",
          chunkId: "chunk_01",
          pdfPageStart: 1,
          pdfPageEnd: 1
        }
      ],
      degree: 1,
      source: "document",
      val: 20
    },
    {
      id: "D2",
      label: "Seven Years",
      kind: "date",
      canonicalName: "Seven Years",
      aliases: [],
      summary: "Retention duration.",
      evidence: [{ quote: "7 years", pageStart: 1, pageEnd: 1 }],
      sources: [],
      degree: 1,
      source: "document",
      val: 20
    }
  ];
  return {
    source: "document",
    ingestionId: "doc-123",
    nodes,
    links: [
      {
        id: "DE1",
        source: "D1",
        target: "D2",
        type: "requires",
        summary: "Retention policy requires seven years.",
        evidence: [{ quote: "retained for 7 years", pageStart: 1, pageEnd: 1 }],
        sourceChunk: {
          documentName: "policy.pdf",
          chunkFile: "chunk_01.txt",
          chunkId: "chunk_01",
          pdfPageStart: 1,
          pdfPageEnd: 1
        }
      }
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    kindTypes: ["date", "requirement"],
    relationTypes: ["requires"]
  };
}
function createMockContext(overrides = {}) {
  return {
    upload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .md or .txt file to build the graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    },
    graph: {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null
    },
    documentUpload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .pdf, .md, or .txt file to build a document graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    },
    documentGraph: {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null,
      artifacts: null,
      artifactsError: null
    },
    uploadedGraphUpload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a merged_graph.json file to inspect a finalized knowledge graph."
    },
    uploadedGraph: {
      status: "idle",
      kind: null,
      operationalData: null,
      documentData: null,
      error: null,
      lastLoadedAt: null,
      filename: null,
      rawData: null
    },
    setDragActive: () => {
    },
    selectFile: () => true,
    clearSelectedFile: () => {
    },
    beginProcessing: async () => {
    },
    loadGraph: async () => {
    },
    setDocumentDragActive: () => {
    },
    selectDocumentFile: () => true,
    clearSelectedDocumentFile: () => {
    },
    beginDocumentProcessing: async () => {
    },
    loadDocumentGraph: async () => {
    },
    setUploadedGraphDragActive: () => {
    },
    selectUploadedGraphFile: () => true,
    clearSelectedUploadedGraphFile: () => {
    },
    loadUploadedGraphFromSelectedFile: async () => {
    },
    resetUploadState: () => {
    },
    ...overrides
  };
}
var init_test_utils = __esm({
  "tests/test-utils.tsx"() {
    "use strict";
  }
});

// src/lib/adapters.ts
var adapters_exports = {};
__export(adapters_exports, {
  adaptDocumentGraph: () => adaptDocumentGraph,
  adaptGraph: () => adaptGraph,
  adaptMergedGraph: () => adaptMergedGraph,
  adaptNodeDetails: () => adaptNodeDetails
});
function ensureString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`Malformed API response: expected ${label} to be a string.`);
  }
  return value;
}
function ensureNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Malformed API response: expected ${label} to be a number.`);
  }
  return value;
}
function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed API response: expected ${label} to be an array.`);
  }
  return value;
}
function normalizeNode(node, dependencyMap, dependentMap) {
  return {
    id: ensureString(node.id, "node.id"),
    name: ensureString(node.name, "node.name"),
    type: ensureString(node.type, "node.type"),
    description: ensureString(node.description, "node.description"),
    riskScore: ensureNumber(node.risk_score, "node.risk_score"),
    riskLevel: ensureString(node.risk_level, "node.risk_level"),
    degree: ensureNumber(node.degree, "node.degree"),
    betweenness: ensureNumber(node.betweenness, "node.betweenness"),
    closeness: ensureNumber(node.closeness, "node.closeness"),
    blastRadius: ensureNumber(node.blast_radius, "node.blast_radius"),
    dependencySpan: ensureNumber(node.dependency_span, "node.dependency_span"),
    riskExplanation: ensureString(node.risk_explanation, "node.risk_explanation"),
    source: ensureString(node.source, "node.source"),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round(node.risk_score / 100 * 22)
  };
}
function normalizeEdge(edge, index) {
  return {
    id: `${ensureString(edge.source, "edge.source")}-${ensureString(edge.target, "edge.target")}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, "edge.relation"),
    rationale: ensureString(edge.rationale, "edge.rationale")
  };
}
function adaptGraph(apiGraph) {
  const source = ensureString(apiGraph.source, "graph.source");
  const apiNodes = ensureArray(apiGraph.nodes, "graph.nodes");
  const apiEdges = ensureArray(apiGraph.edges, "graph.edges");
  const dependencyMap = /* @__PURE__ */ new Map();
  const dependentMap = /* @__PURE__ */ new Map();
  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, "edge.source");
    const targetId = ensureString(edge.target, "edge.target");
    dependencyMap.set(sourceId, [...dependencyMap.get(sourceId) ?? [], targetId]);
    dependentMap.set(targetId, [...dependentMap.get(targetId) ?? [], sourceId]);
  }
  const nodes = apiNodes.map((node) => normalizeNode(node, dependencyMap, dependentMap));
  const links = apiEdges.map((edge, index) => normalizeEdge(edge, index));
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const relationTypes = [...new Set(links.map((edge) => edge.relation))].sort();
  return {
    source,
    nodes,
    links,
    nodeIndex,
    relationTypes
  };
}
function normalizeMergedNode(node, dependencyMap, dependentMap) {
  return {
    id: ensureString(node.id, "merged.node.id"),
    name: ensureString(node.name, "merged.node.name"),
    type: ensureString(node.type, "merged.node.type"),
    description: ensureString(node.description, "merged.node.description"),
    riskScore: ensureNumber(node.risk_score, "merged.node.risk_score"),
    riskLevel: ensureString(node.risk_level, "merged.node.risk_level"),
    degree: ensureNumber(node.degree, "merged.node.degree"),
    betweenness: ensureNumber(node.betweenness, "merged.node.betweenness"),
    closeness: ensureNumber(node.closeness, "merged.node.closeness"),
    blastRadius: ensureNumber(node.blast_radius, "merged.node.blast_radius"),
    dependencySpan: ensureNumber(node.dependency_span, "merged.node.dependency_span"),
    riskExplanation: ensureString(node.risk_explanation, "merged.node.risk_explanation"),
    source: ensureString(node.source, "merged.node.source"),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round(node.risk_score / 100 * 22)
  };
}
function normalizeMergedEdge(edge, index) {
  return {
    id: `${ensureString(edge.source, "merged.edge.source")}-${ensureString(edge.target, "merged.edge.target")}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, "merged.edge.relation"),
    rationale: ensureString(edge.rationale, "merged.edge.rationale")
  };
}
function adaptMergedGraph(apiGraph, sourceLabel = "uploaded") {
  const apiNodes = ensureArray(apiGraph.nodes, "merged.graph.nodes");
  const apiEdges = ensureArray(apiGraph.edges, "merged.graph.edges");
  const dependencyMap = /* @__PURE__ */ new Map();
  const dependentMap = /* @__PURE__ */ new Map();
  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, "merged.edge.source");
    const targetId = ensureString(edge.target, "merged.edge.target");
    dependencyMap.set(sourceId, [...dependencyMap.get(sourceId) ?? [], targetId]);
    dependentMap.set(targetId, [...dependentMap.get(targetId) ?? [], sourceId]);
  }
  const nodes = apiNodes.map((node) => normalizeMergedNode(node, dependencyMap, dependentMap));
  const links = apiEdges.map((edge, index) => normalizeMergedEdge(edge, index));
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const relationTypes = [...new Set(links.map((edge) => edge.relation))].sort();
  return {
    source: nodes[0]?.source || sourceLabel,
    nodes,
    links,
    nodeIndex,
    relationTypes
  };
}
function toNodeReference(node) {
  if (!node) {
    return null;
  }
  return {
    id: node.id,
    name: node.name,
    type: node.type
  };
}
function formatMetric(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}
function adaptNodeDetails(graph, componentId, risk, impact) {
  const node = graph.nodeIndex[componentId];
  if (!node) {
    throw new Error(`Component '${componentId}' is missing from the active graph.`);
  }
  const dependencies = node.dependencies.map((dependencyId) => toNodeReference(graph.nodeIndex[dependencyId])).filter((candidate) => Boolean(candidate));
  const affectedSystems = impact.impacted_components.map((affectedId) => toNodeReference(graph.nodeIndex[affectedId]) ?? { id: affectedId, name: affectedId, type: "unknown" }).filter((candidate) => Boolean(candidate));
  const relatedRationales = graph.links.filter((link) => link.source === componentId || link.target === componentId).map((link) => link.rationale).filter((rationale) => rationale.trim().length > 0);
  const issues = [risk.explanation, ...relatedRationales].filter(
    (value, index, collection) => value.trim().length > 0 && collection.indexOf(value) === index
  );
  return {
    componentId: node.id,
    name: node.name,
    type: node.type,
    riskScore: risk.score,
    riskLevel: risk.level,
    description: node.description,
    dependencies,
    affectedSystems,
    issues,
    explanation: risk.explanation,
    impactCount: impact.impact_count,
    metadata: [
      { label: "Degree", value: formatMetric(node.degree) },
      { label: "Betweenness", value: formatMetric(node.betweenness) },
      { label: "Closeness", value: formatMetric(node.closeness) },
      { label: "Blast Radius", value: String(node.blastRadius) },
      { label: "Dependency Span", value: String(node.dependencySpan) },
      { label: "Source", value: node.source }
    ]
  };
}
function normalizeDocumentEvidence(evidence) {
  return {
    quote: ensureString(evidence.quote, "document.evidence.quote"),
    pageStart: evidence.page_start,
    pageEnd: evidence.page_end
  };
}
function normalizeDocumentSource(source) {
  return {
    documentName: ensureString(source.document_name, "document.source.document_name"),
    chunkFile: ensureString(source.chunk_file, "document.source.chunk_file"),
    chunkId: ensureString(source.chunk_id, "document.source.chunk_id"),
    pdfPageStart: source.pdf_page_start,
    pdfPageEnd: source.pdf_page_end
  };
}
function normalizeDocumentNode(node) {
  const degree = ensureNumber(node.degree, "document.node.degree");
  return {
    id: ensureString(node.id, "document.node.id"),
    label: ensureString(node.label, "document.node.label"),
    kind: ensureString(node.kind, "document.node.kind"),
    canonicalName: ensureString(node.canonical_name, "document.node.canonical_name"),
    aliases: ensureArray(node.aliases, "document.node.aliases"),
    summary: ensureString(node.summary, "document.node.summary"),
    evidence: ensureArray(node.evidence, "document.node.evidence").map(normalizeDocumentEvidence),
    sources: ensureArray(node.sources, "document.node.sources").map(normalizeDocumentSource),
    degree,
    source: ensureString(node.source, "document.node.source"),
    val: 16 + Math.min(18, Math.round(degree * 4))
  };
}
function normalizeDocumentEdge(edge) {
  return {
    id: ensureString(edge.id, "document.edge.id"),
    source: ensureString(edge.source, "document.edge.source"),
    target: ensureString(edge.target, "document.edge.target"),
    type: ensureString(edge.type, "document.edge.type"),
    summary: ensureString(edge.summary, "document.edge.summary"),
    evidence: ensureArray(edge.evidence, "document.edge.evidence").map(normalizeDocumentEvidence),
    sourceChunk: edge.source_chunk ? normalizeDocumentSource(edge.source_chunk) : null
  };
}
function adaptDocumentGraph(apiGraph) {
  const source = ensureString(apiGraph.source, "document.graph.source");
  const nodes = ensureArray(apiGraph.nodes, "document.graph.nodes").map(normalizeDocumentNode);
  const links = ensureArray(apiGraph.edges, "document.graph.edges").map(normalizeDocumentEdge);
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const kindTypes = [...new Set(nodes.map((node) => node.kind))].sort();
  const relationTypes = [...new Set(links.map((edge) => edge.type))].sort();
  return {
    source,
    ingestionId: apiGraph.ingestion_id ?? null,
    nodes,
    links,
    nodeIndex,
    kindTypes,
    relationTypes
  };
}
var init_adapters = __esm({
  "src/lib/adapters.ts"() {
    "use strict";
  }
});

// tests/adapters.test.ts
init_test_utils();
import assert from "node:assert/strict";
import test from "node:test";
installRuntimeWindowConfig();
var { adaptDocumentGraph: adaptDocumentGraph2, adaptMergedGraph: adaptMergedGraph2 } = await Promise.resolve().then(() => (init_adapters(), adapters_exports));
var { createSampleMergedGraphData: createSampleMergedGraphData2 } = await Promise.resolve().then(() => (init_test_utils(), test_utils_exports));
test("adaptDocumentGraph maps evidence sources kinds and relations", () => {
  const graph = adaptDocumentGraph2({
    source: "document",
    ingestion_id: "doc-123",
    nodes: [
      {
        id: "D1",
        label: "Retention Policy",
        kind: "requirement",
        canonical_name: "Retention Policy",
        aliases: ["records policy"],
        summary: "Defines retention.",
        evidence: [{ quote: "Records are retained for 7 years.", page_start: 1, page_end: 1 }],
        sources: [
          {
            document_name: "policy.pdf",
            chunk_file: "chunk_01.txt",
            chunk_id: "chunk_01",
            pdf_page_start: 1,
            pdf_page_end: 1
          }
        ],
        degree: 1,
        source: "document"
      }
    ],
    edges: [
      {
        id: "DE1",
        source: "D1",
        target: "D1",
        type: "references",
        summary: "Self reference in fixture only.",
        evidence: [{ quote: "Records", page_start: 1, page_end: 1 }],
        source_chunk: null
      }
    ]
  });
  assert.equal(graph.source, "document");
  assert.equal(graph.ingestionId, "doc-123");
  assert.equal(graph.nodes[0].canonicalName, "Retention Policy");
  assert.equal(graph.nodes[0].evidence[0].pageStart, 1);
  assert.deepEqual(graph.kindTypes, ["requirement"]);
  assert.deepEqual(graph.relationTypes, ["references"]);
});
test("adaptDocumentGraph handles empty document graphs", () => {
  const graph = adaptDocumentGraph2({ source: "document", ingestion_id: null, nodes: [], edges: [] });
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.links.length, 0);
  assert.deepEqual(graph.nodeIndex, {});
});
test("adaptMergedGraph converts finalized merged graph JSON into GraphData", () => {
  const graph = adaptMergedGraph2(createSampleMergedGraphData2(), "merged_graph.json");
  assert.equal(graph.source, "sample");
  assert.equal(graph.nodes[0].riskScore, 82);
  assert.deepEqual(graph.nodes[0].dependencies, ["db"]);
  assert.deepEqual(graph.nodes[1].dependents, ["api"]);
  assert.deepEqual(graph.relationTypes, ["depends_on"]);
});
test("adaptMergedGraph handles empty merged graphs", () => {
  const graph = adaptMergedGraph2({ nodes: [], edges: [] }, "empty.json");
  assert.equal(graph.source, "empty.json");
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.links.length, 0);
  assert.deepEqual(graph.nodeIndex, {});
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdGVzdHMvdGVzdC11dGlscy50c3giLCAiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi90ZXN0cy9hZGFwdGVycy50ZXN0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgZnVuY3Rpb24gaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcob3ZlcnJpZGVzOiBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlcj4+ID0ge30pIHtcbiAgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNhbGxiYWNrOiBGcmFtZVJlcXVlc3RDYWxsYmFjaykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSwgMCk7XG4gIGNvbnN0IGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGhhbmRsZTogbnVtYmVyKSA9PiBjbGVhclRpbWVvdXQoaGFuZGxlKTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3dpbmRvdycsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IHtcbiAgICAgIF9fVFdJTl9DT05GSUdfXzoge1xuICAgICAgICBNQVhfVVBMT0FEX01COiA1MCxcbiAgICAgICAgUFJPQ0VTU0lOR19USU1FT1VUX01TOiA5MDAwMCxcbiAgICAgICAgQVBQX0VOVjogJ3Rlc3QnLFxuICAgICAgICAuLi5vdmVycmlkZXMsXG4gICAgICB9LFxuICAgICAgc2V0VGltZW91dCxcbiAgICAgIGNsZWFyVGltZW91dCxcbiAgICAgIHNldEludGVydmFsLFxuICAgICAgY2xlYXJJbnRlcnZhbCxcbiAgICAgIGFkZEV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxuICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogKCkgPT4ge30sXG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSxcbiAgICAgIGRldmljZVBpeGVsUmF0aW86IDEsXG4gICAgfSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdkb2N1bWVudCcsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IHtcbiAgICAgIGNyZWF0ZUVsZW1lbnQ6ICgpID0+ICh7XG4gICAgICAgIGdldENvbnRleHQ6ICgpID0+ICh7fSksXG4gICAgICAgIHN0eWxlOiB7fSxcbiAgICAgICAgc2V0QXR0cmlidXRlOiAoKSA9PiB7fSxcbiAgICAgICAgYXBwZW5kQ2hpbGQ6ICgpID0+IHt9LFxuICAgICAgfSksXG4gICAgICBib2R5OiB7XG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICduYXZpZ2F0b3InLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICB1c2VyQWdlbnQ6ICdub2RlLmpzJyxcbiAgICB9LFxuICB9KTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3JlcXVlc3RBbmltYXRpb25GcmFtZScsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdjYW5jZWxBbmltYXRpb25GcmFtZScsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IGNhbmNlbEFuaW1hdGlvbkZyYW1lLFxuICB9KTtcblxuICBpZiAoISgnUmVzaXplT2JzZXJ2ZXInIGluIGdsb2JhbFRoaXMpKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdSZXNpemVPYnNlcnZlcicsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IGNsYXNzIFJlc2l6ZU9ic2VydmVyIHtcbiAgICAgICAgb2JzZXJ2ZSgpIHt9XG4gICAgICAgIHVub2JzZXJ2ZSgpIHt9XG4gICAgICAgIGRpc2Nvbm5lY3QoKSB7fVxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlR3JhcGhEYXRhKCkge1xuICBjb25zdCBub2RlcyA9IFtcbiAgICB7XG4gICAgICBpZDogJ2FwaScsXG4gICAgICBuYW1lOiAnQVBJIFNlcnZpY2UnLFxuICAgICAgdHlwZTogJ3NvZnR3YXJlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29yZSBBUEknLFxuICAgICAgcmlza1Njb3JlOiA4MixcbiAgICAgIHJpc2tMZXZlbDogJ2hpZ2gnLFxuICAgICAgZGVncmVlOiAyLFxuICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXG4gICAgICBjbG9zZW5lc3M6IDAuNjcsXG4gICAgICBibGFzdFJhZGl1czogMyxcbiAgICAgIGRlcGVuZGVuY3lTcGFuOiAyLFxuICAgICAgcmlza0V4cGxhbmF0aW9uOiAnSGFuZGxlcyBjb3JlIHJlcXVlc3RzLicsXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgZGVwZW5kZW5jaWVzOiBbJ2RiJ10sXG4gICAgICBkZXBlbmRlbnRzOiBbJ2Zyb250ZW5kJ10sXG4gICAgICB2YWw6IDM2LFxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6ICdkYicsXG4gICAgICBuYW1lOiAnRGF0YWJhc2UnLFxuICAgICAgdHlwZTogJ2RhdGEnLFxuICAgICAgZGVzY3JpcHRpb246ICdQZXJzaXN0ZW5jZSBsYXllcicsXG4gICAgICByaXNrU2NvcmU6IDQ0LFxuICAgICAgcmlza0xldmVsOiAnbWVkaXVtJyxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIGJldHdlZW5uZXNzOiAwLjIyLFxuICAgICAgY2xvc2VuZXNzOiAwLjQ0LFxuICAgICAgYmxhc3RSYWRpdXM6IDEsXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMSxcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ1N0b3JlcyByZWNvcmRzLicsXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgZGVwZW5kZW5jaWVzOiBbXSxcbiAgICAgIGRlcGVuZGVudHM6IFsnYXBpJ10sXG4gICAgICB2YWw6IDI4LFxuICAgIH0sXG4gIF07XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnYXBpLWRiLTAnLFxuICAgICAgICBzb3VyY2U6ICdhcGknLFxuICAgICAgICB0YXJnZXQ6ICdkYicsXG4gICAgICAgIHJlbGF0aW9uOiAnZGVwZW5kc19vbicsXG4gICAgICAgIHJhdGlvbmFsZTogJ1JlYWRzIGFuZCB3cml0ZXMgcmVjb3Jkcy4nLFxuICAgICAgfSxcbiAgICBdLFxuICAgIG5vZGVJbmRleDogT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSksXG4gICAgcmVsYXRpb25UeXBlczogWydkZXBlbmRzX29uJ10sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVNZXJnZWRHcmFwaERhdGEoKSB7XG4gIHJldHVybiB7XG4gICAgbm9kZXM6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdhcGknLFxuICAgICAgICBuYW1lOiAnQVBJIFNlcnZpY2UnLFxuICAgICAgICB0eXBlOiAnc29mdHdhcmUnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcbiAgICAgICAgcmlza19zY29yZTogODIsXG4gICAgICAgIHJpc2tfbGV2ZWw6ICdoaWdoJyxcbiAgICAgICAgZGVncmVlOiAyLFxuICAgICAgICBiZXR3ZWVubmVzczogMC41NSxcbiAgICAgICAgY2xvc2VuZXNzOiAwLjY3LFxuICAgICAgICBibGFzdF9yYWRpdXM6IDMsXG4gICAgICAgIGRlcGVuZGVuY3lfc3BhbjogMixcbiAgICAgICAgcmlza19leHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxuICAgICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdkYicsXG4gICAgICAgIG5hbWU6ICdEYXRhYmFzZScsXG4gICAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdQZXJzaXN0ZW5jZSBsYXllcicsXG4gICAgICAgIHJpc2tfc2NvcmU6IDQ0LFxuICAgICAgICByaXNrX2xldmVsOiAnbWVkaXVtJyxcbiAgICAgICAgZGVncmVlOiAxLFxuICAgICAgICBiZXR3ZWVubmVzczogMC4yMixcbiAgICAgICAgY2xvc2VuZXNzOiAwLjQ0LFxuICAgICAgICBibGFzdF9yYWRpdXM6IDEsXG4gICAgICAgIGRlcGVuZGVuY3lfc3BhbjogMSxcbiAgICAgICAgcmlza19leHBsYW5hdGlvbjogJ1N0b3JlcyByZWNvcmRzLicsXG4gICAgICAgIHNvdXJjZTogJ3NhbXBsZScsXG4gICAgICB9LFxuICAgIF0sXG4gICAgZWRnZXM6IFtcbiAgICAgIHtcbiAgICAgICAgc291cmNlOiAnYXBpJyxcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxuICAgICAgICByYXRpb25hbGU6ICdSZWFkcyBhbmQgd3JpdGVzIHJlY29yZHMuJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZURvY3VtZW50R3JhcGhEYXRhKCkge1xuICBjb25zdCBub2RlcyA9IFtcbiAgICB7XG4gICAgICBpZDogJ0QxJyxcbiAgICAgIGxhYmVsOiAnUmV0ZW50aW9uIFBvbGljeScsXG4gICAgICBraW5kOiAncmVxdWlyZW1lbnQnLFxuICAgICAgY2Fub25pY2FsTmFtZTogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAgYWxpYXNlczogWydyZWNvcmRzIHBvbGljeSddLFxuICAgICAgc3VtbWFyeTogJ0RlZmluZXMgcmVjb3JkIHJldGVudGlvbi4nLFxuICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAnUmVjb3JkcyBhcmUgcmV0YWluZWQgZm9yIDcgeWVhcnMuJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgc291cmNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgZG9jdW1lbnROYW1lOiAncG9saWN5LnBkZicsXG4gICAgICAgICAgY2h1bmtGaWxlOiAnY2h1bmtfMDEudHh0JyxcbiAgICAgICAgICBjaHVua0lkOiAnY2h1bmtfMDEnLFxuICAgICAgICAgIHBkZlBhZ2VTdGFydDogMSxcbiAgICAgICAgICBwZGZQYWdlRW5kOiAxLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICAgIHZhbDogMjAsXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogJ0QyJyxcbiAgICAgIGxhYmVsOiAnU2V2ZW4gWWVhcnMnLFxuICAgICAga2luZDogJ2RhdGUnLFxuICAgICAgY2Fub25pY2FsTmFtZTogJ1NldmVuIFllYXJzJyxcbiAgICAgIGFsaWFzZXM6IFtdLFxuICAgICAgc3VtbWFyeTogJ1JldGVudGlvbiBkdXJhdGlvbi4nLFxuICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAnNyB5ZWFycycsIHBhZ2VTdGFydDogMSwgcGFnZUVuZDogMSB9XSxcbiAgICAgIHNvdXJjZXM6IFtdLFxuICAgICAgZGVncmVlOiAxLFxuICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgdmFsOiAyMCxcbiAgICB9LFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgIGluZ2VzdGlvbklkOiAnZG9jLTEyMycsXG4gICAgbm9kZXMsXG4gICAgbGlua3M6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdERTEnLFxuICAgICAgICBzb3VyY2U6ICdEMScsXG4gICAgICAgIHRhcmdldDogJ0QyJyxcbiAgICAgICAgdHlwZTogJ3JlcXVpcmVzJyxcbiAgICAgICAgc3VtbWFyeTogJ1JldGVudGlvbiBwb2xpY3kgcmVxdWlyZXMgc2V2ZW4geWVhcnMuJyxcbiAgICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAncmV0YWluZWQgZm9yIDcgeWVhcnMnLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICAgIHNvdXJjZUNodW5rOiB7XG4gICAgICAgICAgZG9jdW1lbnROYW1lOiAncG9saWN5LnBkZicsXG4gICAgICAgICAgY2h1bmtGaWxlOiAnY2h1bmtfMDEudHh0JyxcbiAgICAgICAgICBjaHVua0lkOiAnY2h1bmtfMDEnLFxuICAgICAgICAgIHBkZlBhZ2VTdGFydDogMSxcbiAgICAgICAgICBwZGZQYWdlRW5kOiAxLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdLFxuICAgIG5vZGVJbmRleDogT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSksXG4gICAga2luZFR5cGVzOiBbJ2RhdGUnLCAncmVxdWlyZW1lbnQnXSxcbiAgICByZWxhdGlvblR5cGVzOiBbJ3JlcXVpcmVzJ10sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ29udGV4dChvdmVycmlkZXMgPSB7fSkge1xuICByZXR1cm4ge1xuICAgIHVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIC5tZCBvciAudHh0IGZpbGUgdG8gYnVpbGQgdGhlIGdyYXBoLicsXG4gICAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgfSxcbiAgICBncmFwaDoge1xuICAgICAgc3RhdHVzOiAnaWRsZScsXG4gICAgICBkYXRhOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgfSxcbiAgICBkb2N1bWVudFVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIC5wZGYsIC5tZCwgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIGEgZG9jdW1lbnQgZ3JhcGguJyxcbiAgICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgICAgaW5nZXN0aW9uOiBudWxsLFxuICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9LFxuICAgIGRvY3VtZW50R3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAgZGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgYXJ0aWZhY3RzOiBudWxsLFxuICAgICAgYXJ0aWZhY3RzRXJyb3I6IG51bGwsXG4gICAgfSxcbiAgICB1cGxvYWRlZEdyYXBoVXBsb2FkOiB7XG4gICAgICBwaGFzZTogJ2lkbGUnLFxuICAgICAgc2VsZWN0ZWRGaWxlOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgbWVyZ2VkX2dyYXBoLmpzb24gZmlsZSB0byBpbnNwZWN0IGEgZmluYWxpemVkIGtub3dsZWRnZSBncmFwaC4nLFxuICAgIH0sXG4gICAgdXBsb2FkZWRHcmFwaDoge1xuICAgICAgc3RhdHVzOiAnaWRsZScsXG4gICAgICBraW5kOiBudWxsLFxuICAgICAgb3BlcmF0aW9uYWxEYXRhOiBudWxsLFxuICAgICAgZG9jdW1lbnREYXRhOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgICBmaWxlbmFtZTogbnVsbCxcbiAgICAgIHJhd0RhdGE6IG51bGwsXG4gICAgfSxcbiAgICBzZXREcmFnQWN0aXZlOiAoKSA9PiB7fSxcbiAgICBzZWxlY3RGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWRGaWxlOiAoKSA9PiB7fSxcbiAgICBiZWdpblByb2Nlc3Npbmc6IGFzeW5jICgpID0+IHt9LFxuICAgIGxvYWRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlOiAoKSA9PiB7fSxcbiAgICBzZWxlY3REb2N1bWVudEZpbGU6ICgpID0+IHRydWUsXG4gICAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Eb2N1bWVudFByb2Nlc3Npbmc6IGFzeW5jICgpID0+IHt9LFxuICAgIGxvYWREb2N1bWVudEdyYXBoOiBhc3luYyAoKSA9PiB7fSxcbiAgICBzZXRVcGxvYWRlZEdyYXBoRHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0VXBsb2FkZWRHcmFwaEZpbGU6ICgpID0+IHRydWUsXG4gICAgY2xlYXJTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlOiAoKSA9PiB7fSxcbiAgICBsb2FkVXBsb2FkZWRHcmFwaEZyb21TZWxlY3RlZEZpbGU6IGFzeW5jICgpID0+IHt9LFxuICAgIHJlc2V0VXBsb2FkU3RhdGU6ICgpID0+IHt9LFxuICAgIC4uLm92ZXJyaWRlcyxcbiAgfTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7XG4gIEFwaURvY3VtZW50RWRnZSxcbiAgQXBpRG9jdW1lbnRFdmlkZW5jZSxcbiAgQXBpRG9jdW1lbnRHcmFwaERhdGEsXG4gIEFwaURvY3VtZW50Tm9kZSxcbiAgQXBpRG9jdW1lbnRTb3VyY2UsXG4gIEFwaUdyYXBoRGF0YSxcbiAgQXBpR3JhcGhFZGdlLFxuICBBcGlHcmFwaE5vZGUsXG4gIEFwaU1lcmdlZEdyYXBoRGF0YSxcbiAgQXBpTWVyZ2VkR3JhcGhFZGdlLFxuICBBcGlNZXJnZWRHcmFwaE5vZGUsXG4gIEltcGFjdFJlc3BvbnNlLFxuICBSaXNrUmVzcG9uc2UsXG59IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5pbXBvcnQgdHlwZSB7XG4gIERvY3VtZW50RWRnZSxcbiAgRG9jdW1lbnRFdmlkZW5jZSxcbiAgRG9jdW1lbnRHcmFwaERhdGEsXG4gIERvY3VtZW50Tm9kZSxcbiAgRG9jdW1lbnRTb3VyY2UsXG4gIEdyYXBoRGF0YSxcbiAgR3JhcGhFZGdlLFxuICBHcmFwaE5vZGUsXG4gIE5vZGVEZXRhaWxzLFxuICBOb2RlUmVmZXJlbmNlLFxufSBmcm9tICcuLi90eXBlcy9hcHAnO1xuXG5mdW5jdGlvbiBlbnN1cmVTdHJpbmcodmFsdWU6IHVua25vd24sIGxhYmVsOiBzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGEgc3RyaW5nLmApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlTnVtYmVyKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8IE51bWJlci5pc05hTih2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGEgbnVtYmVyLmApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlQXJyYXk8VD4odmFsdWU6IHVua25vd24sIGxhYmVsOiBzdHJpbmcpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYW4gYXJyYXkuYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlIGFzIFRbXTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTm9kZShub2RlOiBBcGlHcmFwaE5vZGUsIGRlcGVuZGVuY3lNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiwgZGVwZW5kZW50TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4pOiBHcmFwaE5vZGUge1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ25vZGUuaWQnKSxcbiAgICBuYW1lOiBlbnN1cmVTdHJpbmcobm9kZS5uYW1lLCAnbm9kZS5uYW1lJyksXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKG5vZGUudHlwZSwgJ25vZGUudHlwZScpLFxuICAgIGRlc2NyaXB0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5kZXNjcmlwdGlvbiwgJ25vZGUuZGVzY3JpcHRpb24nKSxcbiAgICByaXNrU2NvcmU6IGVuc3VyZU51bWJlcihub2RlLnJpc2tfc2NvcmUsICdub2RlLnJpc2tfc2NvcmUnKSxcbiAgICByaXNrTGV2ZWw6IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfbGV2ZWwsICdub2RlLnJpc2tfbGV2ZWwnKSxcbiAgICBkZWdyZWU6IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ25vZGUuZGVncmVlJyksXG4gICAgYmV0d2Vlbm5lc3M6IGVuc3VyZU51bWJlcihub2RlLmJldHdlZW5uZXNzLCAnbm9kZS5iZXR3ZWVubmVzcycpLFxuICAgIGNsb3NlbmVzczogZW5zdXJlTnVtYmVyKG5vZGUuY2xvc2VuZXNzLCAnbm9kZS5jbG9zZW5lc3MnKSxcbiAgICBibGFzdFJhZGl1czogZW5zdXJlTnVtYmVyKG5vZGUuYmxhc3RfcmFkaXVzLCAnbm9kZS5ibGFzdF9yYWRpdXMnKSxcbiAgICBkZXBlbmRlbmN5U3BhbjogZW5zdXJlTnVtYmVyKG5vZGUuZGVwZW5kZW5jeV9zcGFuLCAnbm9kZS5kZXBlbmRlbmN5X3NwYW4nKSxcbiAgICByaXNrRXhwbGFuYXRpb246IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfZXhwbGFuYXRpb24sICdub2RlLnJpc2tfZXhwbGFuYXRpb24nKSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ25vZGUuc291cmNlJyksXG4gICAgZGVwZW5kZW5jaWVzOiBkZXBlbmRlbmN5TWFwLmdldChub2RlLmlkKSA/PyBbXSxcbiAgICBkZXBlbmRlbnRzOiBkZXBlbmRlbnRNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxuICAgIHZhbDogMTggKyBNYXRoLnJvdW5kKChub2RlLnJpc2tfc2NvcmUgLyAxMDApICogMjIpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVFZGdlKGVkZ2U6IEFwaUdyYXBoRWRnZSwgaW5kZXg6IG51bWJlcik6IEdyYXBoRWRnZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGAke2Vuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyl9LSR7ZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnZWRnZS50YXJnZXQnKX0tJHtpbmRleH1gLFxuICAgIHNvdXJjZTogZWRnZS5zb3VyY2UsXG4gICAgdGFyZ2V0OiBlZGdlLnRhcmdldCxcbiAgICByZWxhdGlvbjogZW5zdXJlU3RyaW5nKGVkZ2UucmVsYXRpb24sICdlZGdlLnJlbGF0aW9uJyksXG4gICAgcmF0aW9uYWxlOiBlbnN1cmVTdHJpbmcoZWRnZS5yYXRpb25hbGUsICdlZGdlLnJhdGlvbmFsZScpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRHcmFwaChhcGlHcmFwaDogQXBpR3JhcGhEYXRhKTogR3JhcGhEYXRhIHtcbiAgY29uc3Qgc291cmNlID0gZW5zdXJlU3RyaW5nKGFwaUdyYXBoLnNvdXJjZSwgJ2dyYXBoLnNvdXJjZScpO1xuICBjb25zdCBhcGlOb2RlcyA9IGVuc3VyZUFycmF5PEFwaUdyYXBoTm9kZT4oYXBpR3JhcGgubm9kZXMsICdncmFwaC5ub2RlcycpO1xuICBjb25zdCBhcGlFZGdlcyA9IGVuc3VyZUFycmF5PEFwaUdyYXBoRWRnZT4oYXBpR3JhcGguZWRnZXMsICdncmFwaC5lZGdlcycpO1xuXG4gIGNvbnN0IGRlcGVuZGVuY3lNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gIGNvbnN0IGRlcGVuZGVudE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcblxuICBmb3IgKGNvbnN0IGVkZ2Ugb2YgYXBpRWRnZXMpIHtcbiAgICBjb25zdCBzb3VyY2VJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyk7XG4gICAgY29uc3QgdGFyZ2V0SWQgPSBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpO1xuICAgIGRlcGVuZGVuY3lNYXAuc2V0KHNvdXJjZUlkLCBbLi4uKGRlcGVuZGVuY3lNYXAuZ2V0KHNvdXJjZUlkKSA/PyBbXSksIHRhcmdldElkXSk7XG4gICAgZGVwZW5kZW50TWFwLnNldCh0YXJnZXRJZCwgWy4uLihkZXBlbmRlbnRNYXAuZ2V0KHRhcmdldElkKSA/PyBbXSksIHNvdXJjZUlkXSk7XG4gIH1cblxuICBjb25zdCBub2RlcyA9IGFwaU5vZGVzLm1hcCgobm9kZSkgPT4gbm9ybWFsaXplTm9kZShub2RlLCBkZXBlbmRlbmN5TWFwLCBkZXBlbmRlbnRNYXApKTtcbiAgY29uc3QgbGlua3MgPSBhcGlFZGdlcy5tYXAoKGVkZ2UsIGluZGV4KSA9PiBub3JtYWxpemVFZGdlKGVkZ2UsIGluZGV4KSk7XG4gIGNvbnN0IG5vZGVJbmRleCA9IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpO1xuICBjb25zdCByZWxhdGlvblR5cGVzID0gWy4uLm5ldyBTZXQobGlua3MubWFwKChlZGdlKSA9PiBlZGdlLnJlbGF0aW9uKSldLnNvcnQoKTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZSxcbiAgICBub2RlcyxcbiAgICBsaW5rcyxcbiAgICBub2RlSW5kZXgsXG4gICAgcmVsYXRpb25UeXBlcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWVyZ2VkTm9kZShub2RlOiBBcGlNZXJnZWRHcmFwaE5vZGUsIGRlcGVuZGVuY3lNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiwgZGVwZW5kZW50TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4pOiBHcmFwaE5vZGUge1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ21lcmdlZC5ub2RlLmlkJyksXG4gICAgbmFtZTogZW5zdXJlU3RyaW5nKG5vZGUubmFtZSwgJ21lcmdlZC5ub2RlLm5hbWUnKSxcbiAgICB0eXBlOiBlbnN1cmVTdHJpbmcobm9kZS50eXBlLCAnbWVyZ2VkLm5vZGUudHlwZScpLFxuICAgIGRlc2NyaXB0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5kZXNjcmlwdGlvbiwgJ21lcmdlZC5ub2RlLmRlc2NyaXB0aW9uJyksXG4gICAgcmlza1Njb3JlOiBlbnN1cmVOdW1iZXIobm9kZS5yaXNrX3Njb3JlLCAnbWVyZ2VkLm5vZGUucmlza19zY29yZScpLFxuICAgIHJpc2tMZXZlbDogZW5zdXJlU3RyaW5nKG5vZGUucmlza19sZXZlbCwgJ21lcmdlZC5ub2RlLnJpc2tfbGV2ZWwnKSxcbiAgICBkZWdyZWU6IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ21lcmdlZC5ub2RlLmRlZ3JlZScpLFxuICAgIGJldHdlZW5uZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5iZXR3ZWVubmVzcywgJ21lcmdlZC5ub2RlLmJldHdlZW5uZXNzJyksXG4gICAgY2xvc2VuZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5jbG9zZW5lc3MsICdtZXJnZWQubm9kZS5jbG9zZW5lc3MnKSxcbiAgICBibGFzdFJhZGl1czogZW5zdXJlTnVtYmVyKG5vZGUuYmxhc3RfcmFkaXVzLCAnbWVyZ2VkLm5vZGUuYmxhc3RfcmFkaXVzJyksXG4gICAgZGVwZW5kZW5jeVNwYW46IGVuc3VyZU51bWJlcihub2RlLmRlcGVuZGVuY3lfc3BhbiwgJ21lcmdlZC5ub2RlLmRlcGVuZGVuY3lfc3BhbicpLFxuICAgIHJpc2tFeHBsYW5hdGlvbjogZW5zdXJlU3RyaW5nKG5vZGUucmlza19leHBsYW5hdGlvbiwgJ21lcmdlZC5ub2RlLnJpc2tfZXhwbGFuYXRpb24nKSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ21lcmdlZC5ub2RlLnNvdXJjZScpLFxuICAgIGRlcGVuZGVuY2llczogZGVwZW5kZW5jeU1hcC5nZXQobm9kZS5pZCkgPz8gW10sXG4gICAgZGVwZW5kZW50czogZGVwZW5kZW50TWFwLmdldChub2RlLmlkKSA/PyBbXSxcbiAgICB2YWw6IDE4ICsgTWF0aC5yb3VuZCgobm9kZS5yaXNrX3Njb3JlIC8gMTAwKSAqIDIyKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWVyZ2VkRWRnZShlZGdlOiBBcGlNZXJnZWRHcmFwaEVkZ2UsIGluZGV4OiBudW1iZXIpOiBHcmFwaEVkZ2Uge1xuICByZXR1cm4ge1xuICAgIGlkOiBgJHtlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdtZXJnZWQuZWRnZS5zb3VyY2UnKX0tJHtlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdtZXJnZWQuZWRnZS50YXJnZXQnKX0tJHtpbmRleH1gLFxuICAgIHNvdXJjZTogZWRnZS5zb3VyY2UsXG4gICAgdGFyZ2V0OiBlZGdlLnRhcmdldCxcbiAgICByZWxhdGlvbjogZW5zdXJlU3RyaW5nKGVkZ2UucmVsYXRpb24sICdtZXJnZWQuZWRnZS5yZWxhdGlvbicpLFxuICAgIHJhdGlvbmFsZTogZW5zdXJlU3RyaW5nKGVkZ2UucmF0aW9uYWxlLCAnbWVyZ2VkLmVkZ2UucmF0aW9uYWxlJyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdE1lcmdlZEdyYXBoKGFwaUdyYXBoOiBBcGlNZXJnZWRHcmFwaERhdGEsIHNvdXJjZUxhYmVsID0gJ3VwbG9hZGVkJyk6IEdyYXBoRGF0YSB7XG4gIGNvbnN0IGFwaU5vZGVzID0gZW5zdXJlQXJyYXk8QXBpTWVyZ2VkR3JhcGhOb2RlPihhcGlHcmFwaC5ub2RlcywgJ21lcmdlZC5ncmFwaC5ub2RlcycpO1xuICBjb25zdCBhcGlFZGdlcyA9IGVuc3VyZUFycmF5PEFwaU1lcmdlZEdyYXBoRWRnZT4oYXBpR3JhcGguZWRnZXMsICdtZXJnZWQuZ3JhcGguZWRnZXMnKTtcblxuICBjb25zdCBkZXBlbmRlbmN5TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBjb25zdCBkZXBlbmRlbnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG5cbiAgZm9yIChjb25zdCBlZGdlIG9mIGFwaUVkZ2VzKSB7XG4gICAgY29uc3Qgc291cmNlSWQgPSBlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdtZXJnZWQuZWRnZS5zb3VyY2UnKTtcbiAgICBjb25zdCB0YXJnZXRJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ21lcmdlZC5lZGdlLnRhcmdldCcpO1xuICAgIGRlcGVuZGVuY3lNYXAuc2V0KHNvdXJjZUlkLCBbLi4uKGRlcGVuZGVuY3lNYXAuZ2V0KHNvdXJjZUlkKSA/PyBbXSksIHRhcmdldElkXSk7XG4gICAgZGVwZW5kZW50TWFwLnNldCh0YXJnZXRJZCwgWy4uLihkZXBlbmRlbnRNYXAuZ2V0KHRhcmdldElkKSA/PyBbXSksIHNvdXJjZUlkXSk7XG4gIH1cblxuICBjb25zdCBub2RlcyA9IGFwaU5vZGVzLm1hcCgobm9kZSkgPT4gbm9ybWFsaXplTWVyZ2VkTm9kZShub2RlLCBkZXBlbmRlbmN5TWFwLCBkZXBlbmRlbnRNYXApKTtcbiAgY29uc3QgbGlua3MgPSBhcGlFZGdlcy5tYXAoKGVkZ2UsIGluZGV4KSA9PiBub3JtYWxpemVNZXJnZWRFZGdlKGVkZ2UsIGluZGV4KSk7XG4gIGNvbnN0IG5vZGVJbmRleCA9IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpO1xuICBjb25zdCByZWxhdGlvblR5cGVzID0gWy4uLm5ldyBTZXQobGlua3MubWFwKChlZGdlKSA9PiBlZGdlLnJlbGF0aW9uKSldLnNvcnQoKTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZTogbm9kZXNbMF0/LnNvdXJjZSB8fCBzb3VyY2VMYWJlbCxcbiAgICBub2RlcyxcbiAgICBsaW5rcyxcbiAgICBub2RlSW5kZXgsXG4gICAgcmVsYXRpb25UeXBlcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdG9Ob2RlUmVmZXJlbmNlKG5vZGU/OiBHcmFwaE5vZGUgfCBudWxsKTogTm9kZVJlZmVyZW5jZSB8IG51bGwge1xuICBpZiAoIW5vZGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaWQ6IG5vZGUuaWQsXG4gICAgbmFtZTogbm9kZS5uYW1lLFxuICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWV0cmljKHZhbHVlOiBudW1iZXIpIHtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpID8gU3RyaW5nKHZhbHVlKSA6IHZhbHVlLnRvRml4ZWQoMyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdE5vZGVEZXRhaWxzKFxuICBncmFwaDogR3JhcGhEYXRhLFxuICBjb21wb25lbnRJZDogc3RyaW5nLFxuICByaXNrOiBSaXNrUmVzcG9uc2UsXG4gIGltcGFjdDogSW1wYWN0UmVzcG9uc2Vcbik6IE5vZGVEZXRhaWxzIHtcbiAgY29uc3Qgbm9kZSA9IGdyYXBoLm5vZGVJbmRleFtjb21wb25lbnRJZF07XG4gIGlmICghbm9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50ICcke2NvbXBvbmVudElkfScgaXMgbWlzc2luZyBmcm9tIHRoZSBhY3RpdmUgZ3JhcGguYCk7XG4gIH1cblxuICBjb25zdCBkZXBlbmRlbmNpZXMgPSBub2RlLmRlcGVuZGVuY2llc1xuICAgIC5tYXAoKGRlcGVuZGVuY3lJZCkgPT4gdG9Ob2RlUmVmZXJlbmNlKGdyYXBoLm5vZGVJbmRleFtkZXBlbmRlbmN5SWRdKSlcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xuXG4gIGNvbnN0IGFmZmVjdGVkU3lzdGVtcyA9IGltcGFjdC5pbXBhY3RlZF9jb21wb25lbnRzXG4gICAgLm1hcCgoYWZmZWN0ZWRJZCkgPT4gdG9Ob2RlUmVmZXJlbmNlKGdyYXBoLm5vZGVJbmRleFthZmZlY3RlZElkXSkgPz8geyBpZDogYWZmZWN0ZWRJZCwgbmFtZTogYWZmZWN0ZWRJZCwgdHlwZTogJ3Vua25vd24nIH0pXG4gICAgLmZpbHRlcigoY2FuZGlkYXRlKTogY2FuZGlkYXRlIGlzIE5vZGVSZWZlcmVuY2UgPT4gQm9vbGVhbihjYW5kaWRhdGUpKTtcblxuICBjb25zdCByZWxhdGVkUmF0aW9uYWxlcyA9IGdyYXBoLmxpbmtzXG4gICAgLmZpbHRlcigobGluaykgPT4gbGluay5zb3VyY2UgPT09IGNvbXBvbmVudElkIHx8IGxpbmsudGFyZ2V0ID09PSBjb21wb25lbnRJZClcbiAgICAubWFwKChsaW5rKSA9PiBsaW5rLnJhdGlvbmFsZSlcbiAgICAuZmlsdGVyKChyYXRpb25hbGUpID0+IHJhdGlvbmFsZS50cmltKCkubGVuZ3RoID4gMCk7XG5cbiAgY29uc3QgaXNzdWVzID0gW3Jpc2suZXhwbGFuYXRpb24sIC4uLnJlbGF0ZWRSYXRpb25hbGVzXS5maWx0ZXIoXG4gICAgKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik6IHZhbHVlIGlzIHN0cmluZyA9PiB2YWx1ZS50cmltKCkubGVuZ3RoID4gMCAmJiBjb2xsZWN0aW9uLmluZGV4T2YodmFsdWUpID09PSBpbmRleFxuICApO1xuXG4gIHJldHVybiB7XG4gICAgY29tcG9uZW50SWQ6IG5vZGUuaWQsXG4gICAgbmFtZTogbm9kZS5uYW1lLFxuICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICByaXNrU2NvcmU6IHJpc2suc2NvcmUsXG4gICAgcmlza0xldmVsOiByaXNrLmxldmVsLFxuICAgIGRlc2NyaXB0aW9uOiBub2RlLmRlc2NyaXB0aW9uLFxuICAgIGRlcGVuZGVuY2llcyxcbiAgICBhZmZlY3RlZFN5c3RlbXMsXG4gICAgaXNzdWVzLFxuICAgIGV4cGxhbmF0aW9uOiByaXNrLmV4cGxhbmF0aW9uLFxuICAgIGltcGFjdENvdW50OiBpbXBhY3QuaW1wYWN0X2NvdW50LFxuICAgIG1ldGFkYXRhOiBbXG4gICAgICB7IGxhYmVsOiAnRGVncmVlJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmRlZ3JlZSkgfSxcbiAgICAgIHsgbGFiZWw6ICdCZXR3ZWVubmVzcycsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5iZXR3ZWVubmVzcykgfSxcbiAgICAgIHsgbGFiZWw6ICdDbG9zZW5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuY2xvc2VuZXNzKSB9LFxuICAgICAgeyBsYWJlbDogJ0JsYXN0IFJhZGl1cycsIHZhbHVlOiBTdHJpbmcobm9kZS5ibGFzdFJhZGl1cykgfSxcbiAgICAgIHsgbGFiZWw6ICdEZXBlbmRlbmN5IFNwYW4nLCB2YWx1ZTogU3RyaW5nKG5vZGUuZGVwZW5kZW5jeVNwYW4pIH0sXG4gICAgICB7IGxhYmVsOiAnU291cmNlJywgdmFsdWU6IG5vZGUuc291cmNlIH0sXG4gICAgXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnRFdmlkZW5jZShldmlkZW5jZTogQXBpRG9jdW1lbnRFdmlkZW5jZSk6IERvY3VtZW50RXZpZGVuY2Uge1xuICByZXR1cm4ge1xuICAgIHF1b3RlOiBlbnN1cmVTdHJpbmcoZXZpZGVuY2UucXVvdGUsICdkb2N1bWVudC5ldmlkZW5jZS5xdW90ZScpLFxuICAgIHBhZ2VTdGFydDogZXZpZGVuY2UucGFnZV9zdGFydCxcbiAgICBwYWdlRW5kOiBldmlkZW5jZS5wYWdlX2VuZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnRTb3VyY2Uoc291cmNlOiBBcGlEb2N1bWVudFNvdXJjZSk6IERvY3VtZW50U291cmNlIHtcbiAgcmV0dXJuIHtcbiAgICBkb2N1bWVudE5hbWU6IGVuc3VyZVN0cmluZyhzb3VyY2UuZG9jdW1lbnRfbmFtZSwgJ2RvY3VtZW50LnNvdXJjZS5kb2N1bWVudF9uYW1lJyksXG4gICAgY2h1bmtGaWxlOiBlbnN1cmVTdHJpbmcoc291cmNlLmNodW5rX2ZpbGUsICdkb2N1bWVudC5zb3VyY2UuY2h1bmtfZmlsZScpLFxuICAgIGNodW5rSWQ6IGVuc3VyZVN0cmluZyhzb3VyY2UuY2h1bmtfaWQsICdkb2N1bWVudC5zb3VyY2UuY2h1bmtfaWQnKSxcbiAgICBwZGZQYWdlU3RhcnQ6IHNvdXJjZS5wZGZfcGFnZV9zdGFydCxcbiAgICBwZGZQYWdlRW5kOiBzb3VyY2UucGRmX3BhZ2VfZW5kLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudE5vZGUobm9kZTogQXBpRG9jdW1lbnROb2RlKTogRG9jdW1lbnROb2RlIHtcbiAgY29uc3QgZGVncmVlID0gZW5zdXJlTnVtYmVyKG5vZGUuZGVncmVlLCAnZG9jdW1lbnQubm9kZS5kZWdyZWUnKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogZW5zdXJlU3RyaW5nKG5vZGUuaWQsICdkb2N1bWVudC5ub2RlLmlkJyksXG4gICAgbGFiZWw6IGVuc3VyZVN0cmluZyhub2RlLmxhYmVsLCAnZG9jdW1lbnQubm9kZS5sYWJlbCcpLFxuICAgIGtpbmQ6IGVuc3VyZVN0cmluZyhub2RlLmtpbmQsICdkb2N1bWVudC5ub2RlLmtpbmQnKSxcbiAgICBjYW5vbmljYWxOYW1lOiBlbnN1cmVTdHJpbmcobm9kZS5jYW5vbmljYWxfbmFtZSwgJ2RvY3VtZW50Lm5vZGUuY2Fub25pY2FsX25hbWUnKSxcbiAgICBhbGlhc2VzOiBlbnN1cmVBcnJheTxzdHJpbmc+KG5vZGUuYWxpYXNlcywgJ2RvY3VtZW50Lm5vZGUuYWxpYXNlcycpLFxuICAgIHN1bW1hcnk6IGVuc3VyZVN0cmluZyhub2RlLnN1bW1hcnksICdkb2N1bWVudC5ub2RlLnN1bW1hcnknKSxcbiAgICBldmlkZW5jZTogZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRFdmlkZW5jZT4obm9kZS5ldmlkZW5jZSwgJ2RvY3VtZW50Lm5vZGUuZXZpZGVuY2UnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRFdmlkZW5jZSksXG4gICAgc291cmNlczogZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRTb3VyY2U+KG5vZGUuc291cmNlcywgJ2RvY3VtZW50Lm5vZGUuc291cmNlcycpLm1hcChub3JtYWxpemVEb2N1bWVudFNvdXJjZSksXG4gICAgZGVncmVlLFxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKG5vZGUuc291cmNlLCAnZG9jdW1lbnQubm9kZS5zb3VyY2UnKSxcbiAgICB2YWw6IDE2ICsgTWF0aC5taW4oMTgsIE1hdGgucm91bmQoZGVncmVlICogNCkpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudEVkZ2UoZWRnZTogQXBpRG9jdW1lbnRFZGdlKTogRG9jdW1lbnRFZGdlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZW5zdXJlU3RyaW5nKGVkZ2UuaWQsICdkb2N1bWVudC5lZGdlLmlkJyksXG4gICAgc291cmNlOiBlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdkb2N1bWVudC5lZGdlLnNvdXJjZScpLFxuICAgIHRhcmdldDogZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnZG9jdW1lbnQuZWRnZS50YXJnZXQnKSxcbiAgICB0eXBlOiBlbnN1cmVTdHJpbmcoZWRnZS50eXBlLCAnZG9jdW1lbnQuZWRnZS50eXBlJyksXG4gICAgc3VtbWFyeTogZW5zdXJlU3RyaW5nKGVkZ2Uuc3VtbWFyeSwgJ2RvY3VtZW50LmVkZ2Uuc3VtbWFyeScpLFxuICAgIGV2aWRlbmNlOiBlbnN1cmVBcnJheTxBcGlEb2N1bWVudEV2aWRlbmNlPihlZGdlLmV2aWRlbmNlLCAnZG9jdW1lbnQuZWRnZS5ldmlkZW5jZScpLm1hcChub3JtYWxpemVEb2N1bWVudEV2aWRlbmNlKSxcbiAgICBzb3VyY2VDaHVuazogZWRnZS5zb3VyY2VfY2h1bmsgPyBub3JtYWxpemVEb2N1bWVudFNvdXJjZShlZGdlLnNvdXJjZV9jaHVuaykgOiBudWxsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRhcHREb2N1bWVudEdyYXBoKGFwaUdyYXBoOiBBcGlEb2N1bWVudEdyYXBoRGF0YSk6IERvY3VtZW50R3JhcGhEYXRhIHtcbiAgY29uc3Qgc291cmNlID0gZW5zdXJlU3RyaW5nKGFwaUdyYXBoLnNvdXJjZSwgJ2RvY3VtZW50LmdyYXBoLnNvdXJjZScpO1xuICBjb25zdCBub2RlcyA9IGVuc3VyZUFycmF5PEFwaURvY3VtZW50Tm9kZT4oYXBpR3JhcGgubm9kZXMsICdkb2N1bWVudC5ncmFwaC5ub2RlcycpLm1hcChub3JtYWxpemVEb2N1bWVudE5vZGUpO1xuICBjb25zdCBsaW5rcyA9IGVuc3VyZUFycmF5PEFwaURvY3VtZW50RWRnZT4oYXBpR3JhcGguZWRnZXMsICdkb2N1bWVudC5ncmFwaC5lZGdlcycpLm1hcChub3JtYWxpemVEb2N1bWVudEVkZ2UpO1xuICBjb25zdCBub2RlSW5kZXggPSBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKTtcbiAgY29uc3Qga2luZFR5cGVzID0gWy4uLm5ldyBTZXQobm9kZXMubWFwKChub2RlKSA9PiBub2RlLmtpbmQpKV0uc29ydCgpO1xuICBjb25zdCByZWxhdGlvblR5cGVzID0gWy4uLm5ldyBTZXQobGlua3MubWFwKChlZGdlKSA9PiBlZGdlLnR5cGUpKV0uc29ydCgpO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlLFxuICAgIGluZ2VzdGlvbklkOiBhcGlHcmFwaC5pbmdlc3Rpb25faWQgPz8gbnVsbCxcbiAgICBub2RlcyxcbiAgICBsaW5rcyxcbiAgICBub2RlSW5kZXgsXG4gICAga2luZFR5cGVzLFxuICAgIHJlbGF0aW9uVHlwZXMsXG4gIH07XG59XG4iLCAiaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnO1xuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcbmltcG9ydCB7IGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnIH0gZnJvbSAnLi90ZXN0LXV0aWxzJztcblxuaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcoKTtcblxuY29uc3QgeyBhZGFwdERvY3VtZW50R3JhcGgsIGFkYXB0TWVyZ2VkR3JhcGggfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2xpYi9hZGFwdGVycycpO1xuY29uc3QgeyBjcmVhdGVTYW1wbGVNZXJnZWRHcmFwaERhdGEgfSA9IGF3YWl0IGltcG9ydCgnLi90ZXN0LXV0aWxzJyk7XG5cbnRlc3QoJ2FkYXB0RG9jdW1lbnRHcmFwaCBtYXBzIGV2aWRlbmNlIHNvdXJjZXMga2luZHMgYW5kIHJlbGF0aW9ucycsICgpID0+IHtcbiAgY29uc3QgZ3JhcGggPSBhZGFwdERvY3VtZW50R3JhcGgoe1xuICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICBpbmdlc3Rpb25faWQ6ICdkb2MtMTIzJyxcbiAgICBub2RlczogW1xuICAgICAge1xuICAgICAgICBpZDogJ0QxJyxcbiAgICAgICAgbGFiZWw6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgICAga2luZDogJ3JlcXVpcmVtZW50JyxcbiAgICAgICAgY2Fub25pY2FsX25hbWU6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgICAgYWxpYXNlczogWydyZWNvcmRzIHBvbGljeSddLFxuICAgICAgICBzdW1tYXJ5OiAnRGVmaW5lcyByZXRlbnRpb24uJyxcbiAgICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAnUmVjb3JkcyBhcmUgcmV0YWluZWQgZm9yIDcgeWVhcnMuJywgcGFnZV9zdGFydDogMSwgcGFnZV9lbmQ6IDEgfV0sXG4gICAgICAgIHNvdXJjZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBkb2N1bWVudF9uYW1lOiAncG9saWN5LnBkZicsXG4gICAgICAgICAgICBjaHVua19maWxlOiAnY2h1bmtfMDEudHh0JyxcbiAgICAgICAgICAgIGNodW5rX2lkOiAnY2h1bmtfMDEnLFxuICAgICAgICAgICAgcGRmX3BhZ2Vfc3RhcnQ6IDEsXG4gICAgICAgICAgICBwZGZfcGFnZV9lbmQ6IDEsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgZGVncmVlOiAxLFxuICAgICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICB9LFxuICAgIF0sXG4gICAgZWRnZXM6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdERTEnLFxuICAgICAgICBzb3VyY2U6ICdEMScsXG4gICAgICAgIHRhcmdldDogJ0QxJyxcbiAgICAgICAgdHlwZTogJ3JlZmVyZW5jZXMnLFxuICAgICAgICBzdW1tYXJ5OiAnU2VsZiByZWZlcmVuY2UgaW4gZml4dHVyZSBvbmx5LicsXG4gICAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ1JlY29yZHMnLCBwYWdlX3N0YXJ0OiAxLCBwYWdlX2VuZDogMSB9XSxcbiAgICAgICAgc291cmNlX2NodW5rOiBudWxsLFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcblxuICBhc3NlcnQuZXF1YWwoZ3JhcGguc291cmNlLCAnZG9jdW1lbnQnKTtcbiAgYXNzZXJ0LmVxdWFsKGdyYXBoLmluZ2VzdGlvbklkLCAnZG9jLTEyMycpO1xuICBhc3NlcnQuZXF1YWwoZ3JhcGgubm9kZXNbMF0uY2Fub25pY2FsTmFtZSwgJ1JldGVudGlvbiBQb2xpY3knKTtcbiAgYXNzZXJ0LmVxdWFsKGdyYXBoLm5vZGVzWzBdLmV2aWRlbmNlWzBdLnBhZ2VTdGFydCwgMSk7XG4gIGFzc2VydC5kZWVwRXF1YWwoZ3JhcGgua2luZFR5cGVzLCBbJ3JlcXVpcmVtZW50J10pO1xuICBhc3NlcnQuZGVlcEVxdWFsKGdyYXBoLnJlbGF0aW9uVHlwZXMsIFsncmVmZXJlbmNlcyddKTtcbn0pO1xuXG50ZXN0KCdhZGFwdERvY3VtZW50R3JhcGggaGFuZGxlcyBlbXB0eSBkb2N1bWVudCBncmFwaHMnLCAoKSA9PiB7XG4gIGNvbnN0IGdyYXBoID0gYWRhcHREb2N1bWVudEdyYXBoKHsgc291cmNlOiAnZG9jdW1lbnQnLCBpbmdlc3Rpb25faWQ6IG51bGwsIG5vZGVzOiBbXSwgZWRnZXM6IFtdIH0pO1xuXG4gIGFzc2VydC5lcXVhbChncmFwaC5ub2Rlcy5sZW5ndGgsIDApO1xuICBhc3NlcnQuZXF1YWwoZ3JhcGgubGlua3MubGVuZ3RoLCAwKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChncmFwaC5ub2RlSW5kZXgsIHt9KTtcbn0pO1xuXG50ZXN0KCdhZGFwdE1lcmdlZEdyYXBoIGNvbnZlcnRzIGZpbmFsaXplZCBtZXJnZWQgZ3JhcGggSlNPTiBpbnRvIEdyYXBoRGF0YScsICgpID0+IHtcbiAgY29uc3QgZ3JhcGggPSBhZGFwdE1lcmdlZEdyYXBoKGNyZWF0ZVNhbXBsZU1lcmdlZEdyYXBoRGF0YSgpLCAnbWVyZ2VkX2dyYXBoLmpzb24nKTtcblxuICBhc3NlcnQuZXF1YWwoZ3JhcGguc291cmNlLCAnc2FtcGxlJyk7XG4gIGFzc2VydC5lcXVhbChncmFwaC5ub2Rlc1swXS5yaXNrU2NvcmUsIDgyKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChncmFwaC5ub2Rlc1swXS5kZXBlbmRlbmNpZXMsIFsnZGInXSk7XG4gIGFzc2VydC5kZWVwRXF1YWwoZ3JhcGgubm9kZXNbMV0uZGVwZW5kZW50cywgWydhcGknXSk7XG4gIGFzc2VydC5kZWVwRXF1YWwoZ3JhcGgucmVsYXRpb25UeXBlcywgWydkZXBlbmRzX29uJ10pO1xufSk7XG5cbnRlc3QoJ2FkYXB0TWVyZ2VkR3JhcGggaGFuZGxlcyBlbXB0eSBtZXJnZWQgZ3JhcGhzJywgKCkgPT4ge1xuICBjb25zdCBncmFwaCA9IGFkYXB0TWVyZ2VkR3JhcGgoeyBub2RlczogW10sIGVkZ2VzOiBbXSB9LCAnZW1wdHkuanNvbicpO1xuXG4gIGFzc2VydC5lcXVhbChncmFwaC5zb3VyY2UsICdlbXB0eS5qc29uJyk7XG4gIGFzc2VydC5lcXVhbChncmFwaC5ub2Rlcy5sZW5ndGgsIDApO1xuICBhc3NlcnQuZXF1YWwoZ3JhcGgubGlua3MubGVuZ3RoLCAwKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChncmFwaC5ub2RlSW5kZXgsIHt9KTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQU8sU0FBUywyQkFBMkIsWUFBc0QsQ0FBQyxHQUFHO0FBQ25HLFFBQU0sd0JBQXdCLENBQUMsYUFBbUMsV0FBVyxNQUFNLFNBQVMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQzFHLFFBQU0sdUJBQXVCLENBQUMsV0FBbUIsYUFBYSxNQUFNO0FBRXBFLFNBQU8sZUFBZSxZQUFZLFVBQVU7QUFBQSxJQUMxQyxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsTUFDTCxpQkFBaUI7QUFBQSxRQUNmLGVBQWU7QUFBQSxRQUNmLHVCQUF1QjtBQUFBLFFBQ3ZCLFNBQVM7QUFBQSxRQUNULEdBQUc7QUFBQSxNQUNMO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0Esa0JBQWtCLE1BQU07QUFBQSxNQUFDO0FBQUEsTUFDekIscUJBQXFCLE1BQU07QUFBQSxNQUFDO0FBQUEsTUFDNUI7QUFBQSxNQUNBO0FBQUEsTUFDQSxrQkFBa0I7QUFB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QUFPO0FBQUEsTUFDTDtBQUFBLFFBQ0UsSUFBSTtBQUFBLFFBQ0osUUFBUTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sU0FBUztBQUFBLFFBQ1QsVUFBVSxDQUFDLEVBQUUsT0FBTyxXQUFXLFlBQVksR0FBRyxVQUFVLEVBQUUsQ0FBQztBQUFBLFFBQzNELGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFFRCxTQUFPLE1BQU0sTUFBTSxRQUFRLFVBQVU7QUFDckMsU0FBTyxNQUFNLE1BQU0sYUFBYSxTQUFTO0FBQ3pDLFNBQU8sTUFBTSxNQUFNLE1BQU0sQ0FBQyxFQUFFLGVBQWUsa0JBQWtCO0FBQzdELFNBQU8sTUFBTSxNQUFNLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztBQUNwRCxTQUFPLFVBQVUsTUFBTSxXQUFXLENBQUMsYUFBYSxDQUFDO0FBQ2pELFNBQU8sVUFBVSxNQUFNLGVBQWUsQ0FBQyxZQUFZLENBQUM7QUFDdEQsQ0FBQztBQUVELEtBQUssb0RBQW9ELE1BQU07QUFDN0QsUUFBTSxRQUFRQSxvQkFBbUIsRUFBRSxRQUFRLFlBQVksY0FBYyxNQUFNLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFFakcsU0FBTyxNQUFNLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDbEMsU0FBTyxNQUFNLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDbEMsU0FBTyxVQUFVLE1BQU0sV0FBVyxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUVELEtBQUssd0VBQXdFLE1BQU07QUFDakYsUUFBTSxRQUFRQyxrQkFBaUJDLDZCQUE0QixHQUFHLG1CQUFtQjtBQUVqRixTQUFPLE1BQU0sTUFBTSxRQUFRLFFBQVE7QUFDbkMsU0FBTyxNQUFNLE1BQU0sTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFO0FBQ3pDLFNBQU8sVUFBVSxNQUFNLE1BQU0sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUM7QUFDcEQsU0FBTyxVQUFVLE1BQU0sTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQztBQUNuRCxTQUFPLFVBQVUsTUFBTSxlQUFlLENBQUMsWUFBWSxDQUFDO0FBQ3RELENBQUM7QUFFRCxLQUFLLGdEQUFnRCxNQUFNO0FBQ3pELFFBQU0sUUFBUUQsa0JBQWlCLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsR0FBRyxZQUFZO0FBRXJFLFNBQU8sTUFBTSxNQUFNLFFBQVEsWUFBWTtBQUN2QyxTQUFPLE1BQU0sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNsQyxTQUFPLE1BQU0sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNsQyxTQUFPLFVBQVUsTUFBTSxXQUFXLENBQUMsQ0FBQztBQUN0QyxDQUFDOyIsCiAgIm5hbWVzIjogWyJhZGFwdERvY3VtZW50R3JhcGgiLCAiYWRhcHRNZXJnZWRHcmFwaCIsICJjcmVhdGVTYW1wbGVNZXJnZWRHcmFwaERhdGEiXQp9Cg==
