import { BarChart3, FileText, List, Network, Shield, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from './ui/Badge';
import { formatLabel } from '../lib/selectors';

export type ViewType = 'graph' | 'risk' | 'nodes' | 'overview';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  graphSource?: string;
  nodeCount: number;
  edgeCount: number;
}

const navItems: Array<{ id: ViewType; label: string; icon: typeof Network }> = [
  { id: 'graph', label: 'Graph View', icon: Network },
  { id: 'risk', label: 'Risk Analysis', icon: Shield },
  { id: 'nodes', label: 'Nodes & Edges', icon: List },
  { id: 'overview', label: 'System Overview', icon: BarChart3 },
];

export default function Sidebar({ currentView, onViewChange, graphSource, nodeCount, edgeCount }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="hidden h-full w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col">
      <div className="border-b border-slate-800 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
            <Network className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TwinGraphOps</h1>
            <p className="text-sm text-slate-400">Operational knowledge graph workspace</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Nodes</p>
            <p className="mt-2 text-2xl font-semibold text-white">{nodeCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Edges</p>
            <p className="mt-2 text-2xl font-semibold text-white">{edgeCount}</p>
          </div>
        </div>

        <div className="mt-4">
          <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-100">
            Active Graph: {graphSource ? formatLabel(graphSource) : 'Unknown'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
            Risk
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Documents
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <Upload className="h-5 w-5" />
          <span>Upload New Document</span>
        </button>
        <button
          onClick={() => navigate('/documents')}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <FileText className="h-5 w-5" />
          <span>Document Workspace</span>
        </button>
      </div>
    </aside>
  );
}
