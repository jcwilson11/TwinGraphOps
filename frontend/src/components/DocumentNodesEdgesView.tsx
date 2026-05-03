import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ExternalLink, Filter, Search } from 'lucide-react';
import type { DocumentGraphData } from '../types/app';
import { formatLabel, getDocumentKindColor, getLinkEndpointId } from '../lib/selectors';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Input from './ui/Input';

interface DocumentNodesEdgesViewProps {
  graphData: DocumentGraphData;
  onNodeSelect: (nodeId: string) => void;
}

type ActiveTable = 'nodes' | 'edges';
type NodeSortField = 'canonicalName' | 'kind' | 'degree' | 'evidence';
type EdgeSortField = 'source' | 'target' | 'type';

const pageSize = 10;

export default function DocumentNodesEdgesView({ graphData, onNodeSelect }: DocumentNodesEdgesViewProps) {
  const [activeTable, setActiveTable] = useState<ActiveTable>('nodes');
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [relationFilter, setRelationFilter] = useState('all');
  const [nodeSortField, setNodeSortField] = useState<NodeSortField>('degree');
  const [nodeSortOrder, setNodeSortOrder] = useState<'asc' | 'desc'>('desc');
  const [edgeSortField, setEdgeSortField] = useState<EdgeSortField>('source');
  const [edgeSortOrder, setEdgeSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  const filteredNodes = useMemo(() => {
    const nodes = graphData.nodes.filter((node) => {
      const matchesSearch =
        deferredSearch.length === 0 ||
        node.label.toLowerCase().includes(deferredSearch) ||
        node.canonicalName.toLowerCase().includes(deferredSearch) ||
        node.summary.toLowerCase().includes(deferredSearch);
      const matchesKind = kindFilter === 'all' || node.kind === kindFilter;
      return matchesSearch && matchesKind;
    });

    return nodes.sort((left, right) => {
      let comparison = 0;
      switch (nodeSortField) {
        case 'canonicalName':
          comparison = left.canonicalName.localeCompare(right.canonicalName);
          break;
        case 'kind':
          comparison = left.kind.localeCompare(right.kind);
          break;
        case 'evidence':
          comparison = left.evidence.length - right.evidence.length;
          break;
        case 'degree':
        default:
          comparison = left.degree - right.degree;
      }
      return nodeSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [deferredSearch, graphData.nodes, kindFilter, nodeSortField, nodeSortOrder]);

  const filteredEdges = useMemo(() => {
    const edges = graphData.links.filter((edge) => {
      const sourceName = graphData.nodeIndex[getLinkEndpointId(edge.source)]?.canonicalName ?? getLinkEndpointId(edge.source);
      const targetName = graphData.nodeIndex[getLinkEndpointId(edge.target)]?.canonicalName ?? getLinkEndpointId(edge.target);
      const matchesSearch =
        deferredSearch.length === 0 ||
        sourceName.toLowerCase().includes(deferredSearch) ||
        targetName.toLowerCase().includes(deferredSearch) ||
        edge.type.toLowerCase().includes(deferredSearch) ||
        edge.summary.toLowerCase().includes(deferredSearch);
      const matchesRelation = relationFilter === 'all' || edge.type === relationFilter;
      return matchesSearch && matchesRelation;
    });

    return edges.sort((left, right) => {
      let comparison = 0;
      switch (edgeSortField) {
        case 'target':
          comparison = getLinkEndpointId(left.target).localeCompare(getLinkEndpointId(right.target));
          break;
        case 'type':
          comparison = left.type.localeCompare(right.type);
          break;
        case 'source':
        default:
          comparison = getLinkEndpointId(left.source).localeCompare(getLinkEndpointId(right.source));
      }
      return edgeSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [deferredSearch, edgeSortField, edgeSortOrder, graphData.links, graphData.nodeIndex, relationFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeTable, deferredSearch, edgeSortField, edgeSortOrder, kindFilter, nodeSortField, nodeSortOrder, relationFilter]);

  const pagedNodes = filteredNodes.slice((page - 1) * pageSize, page * pageSize);
  const pagedEdges = filteredEdges.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil((activeTable === 'nodes' ? filteredNodes.length : filteredEdges.length) / pageSize));

  const toggleNodeSort = (field: NodeSortField) => {
    if (nodeSortField === field) {
      setNodeSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setNodeSortField(field);
    setNodeSortOrder(field === 'canonicalName' || field === 'kind' ? 'asc' : 'desc');
  };

  const toggleEdgeSort = (field: EdgeSortField) => {
    if (edgeSortField === field) {
      setEdgeSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setEdgeSortField(field);
    setEdgeSortOrder('asc');
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Nodes & Edges</h1>
          <p className="mt-2 text-sm text-slate-300">Search, filter, sort, and inspect extracted document knowledge.</p>
        </div>

        <div className="glass-panel rounded-3xl p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={activeTable === 'nodes' ? 'Search nodes by name, kind, or summary' : 'Search edges by source, target, or relation'}
                className="pl-10"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3">
              <Filter className="h-4 w-4 text-slate-500" />
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none" disabled={activeTable !== 'nodes'}>
                <option value="all">All kinds</option>
                {graphData.kindTypes.map((kind) => (
                  <option key={kind} value={kind}>
                    {formatLabel(kind)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3">
              <Filter className="h-4 w-4 text-slate-500" />
              <select value={relationFilter} onChange={(event) => setRelationFilter(event.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none" disabled={activeTable !== 'edges'}>
                <option value="all">All relations</option>
                {graphData.relationTypes.map((relation) => (
                  <option key={relation} value={relation}>
                    {formatLabel(relation)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <Button variant={activeTable === 'nodes' ? 'primary' : 'secondary'} onClick={() => setActiveTable('nodes')}>Nodes</Button>
              <Button variant={activeTable === 'edges' ? 'primary' : 'secondary'} onClick={() => setActiveTable('edges')}>Edges</Button>
            </div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden rounded-3xl">
          {activeTable === 'nodes' ? (
            <>
              <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1fr_0.7fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {[
                  ['canonicalName', 'Node'],
                  ['kind', 'Kind'],
                  ['degree', 'Degree'],
                  ['evidence', 'Evidence'],
                ].map(([field, label]) => (
                  <button key={field} className="flex items-center gap-1 text-left" onClick={() => toggleNodeSort(field as NodeSortField)}>
                    {label}
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                ))}
                <div>Summary</div>
                <div>Action</div>
              </div>

              <div className="divide-y divide-slate-800">
                {pagedNodes.map((node) => (
                  <div key={node.id} className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1fr_0.7fr] gap-4 px-4 py-4 text-sm">
                    <div>
                      <div className="font-medium text-white">{node.canonicalName}</div>
                      <div className="mt-1 text-xs text-slate-400">{node.id}</div>
                    </div>
                    <div>
                      <Badge className="border-transparent text-white" style={{ backgroundColor: getDocumentKindColor(node.kind) }}>
                        {formatLabel(node.kind)}
                      </Badge>
                    </div>
                    <div className="text-slate-300">{node.degree}</div>
                    <div className="text-slate-300">{node.evidence.length}</div>
                    <div className="text-slate-400">{node.summary || 'No summary provided.'}</div>
                    <div>
                      <button onClick={() => onNodeSelect(node.id)} className="inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200">
                        View
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_1fr_1fr_1.4fr_0.7fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {[
                  ['source', 'Source'],
                  ['target', 'Target'],
                  ['type', 'Relation'],
                ].map(([field, label]) => (
                  <button key={field} className="flex items-center gap-1 text-left" onClick={() => toggleEdgeSort(field as EdgeSortField)}>
                    {label}
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                ))}
                <div>Summary</div>
                <div>Action</div>
              </div>

              <div className="divide-y divide-slate-800">
                {pagedEdges.map((edge) => (
                  <div key={edge.id} className="grid grid-cols-[1fr_1fr_1fr_1.4fr_0.7fr] gap-4 px-4 py-4 text-sm">
                    <div className="text-slate-200">{graphData.nodeIndex[getLinkEndpointId(edge.source)]?.canonicalName ?? getLinkEndpointId(edge.source)}</div>
                    <div className="text-slate-200">{graphData.nodeIndex[getLinkEndpointId(edge.target)]?.canonicalName ?? getLinkEndpointId(edge.target)}</div>
                    <div className="text-slate-300">{formatLabel(edge.type)}</div>
                    <div className="text-slate-400">{edge.summary || 'No summary provided.'}</div>
                    <div>
                      <button onClick={() => onNodeSelect(getLinkEndpointId(edge.source))} className="inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200">
                        Inspect
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            Showing {activeTable === 'nodes' ? pagedNodes.length : pagedEdges.length} of {activeTable === 'nodes' ? filteredNodes.length : filteredEdges.length} {activeTable}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Badge>Page {page} of {pageCount}</Badge>
            <Button variant="secondary" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
