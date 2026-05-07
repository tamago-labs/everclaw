import { RotateCw, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import GlassButton from '../common/GlassButton';
import ConfirmModal from '../common/ConfirmModal';

interface Session {
  key: string;
  lastActive: string;
  tokens: number;
  compaction: string;
  created: string;
}

interface SessionsTableProps {
  sessions: Session[];
  onRefresh?: () => void;
  onDelete?: (key: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionsTable({ sessions, onRefresh, onDelete }: SessionsTableProps) {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const filteredSessions = sessions.filter(session => 
    session.key.toLowerCase().includes(filter.toLowerCase())
  );

  const handleDeleteClick = (key: string) => {
    setDeleteTarget(key);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete session');
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const columns = [
    { key: 'key', label: 'Key' },
    { key: 'lastActive', label: 'Last Active' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'compaction', label: 'Compaction' },
    { key: 'created', label: 'Created' },
    { key: 'actions', label: '' },
  ];

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Glass effects */}
        <div className={`absolute inset-0 rounded-2xl ${
          isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Sessions ({sessions.length})
            </h3>
            <div className="flex items-center gap-3">
              {/* Filter input */}
              <div className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/5'
              }`}>
                <Search size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter sessions..."
                  className={`bg-transparent text-sm outline-none w-40 ${
                    isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <GlassButton icon={<RotateCw size={16} />} title="Refresh" onClick={onRefresh} />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredSessions.length === 0 ? (
              <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No sessions found
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className={`border-b border-white/10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-5 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          col.key === 'key' ? 'text-accent-primary' : ''
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <tr
                      key={session.key}
                      className={`border-b border-white/5 hover:${
                        isDark ? 'bg-white/5' : 'bg-gray-50'
                      } transition-colors cursor-pointer`}
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-accent-primary hover:text-accent-primary/80">
                          {session.key}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatRelativeTime(session.lastActive)}
                      </td>
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {session.tokens.toLocaleString()}
                      </td>
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {session.compaction}
                      </td>
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(session.created)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(session.key);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? 'hover:bg-white/10 text-gray-500 hover:text-red-400'
                              : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Session"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.` : ''}
        error={deleteError}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}