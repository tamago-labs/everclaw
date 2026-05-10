import { Play, Pause, Trash2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import GlassButton from '../common/GlassButton';
import ConfirmModal from '../common/ConfirmModal';

export interface CronJob {
  id: string;
  name: string;
  agentSlug: string;
  sessionSlug: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

interface CronsTableProps {
  crons: CronJob[];
  onRefresh?: () => void;
  onToggle?: (cronSlug: string, enabled: boolean) => void;
  onDelete?: (agentSlug: string, cronSlug: string) => void;
  onCronClick?: (cron: CronJob) => void;
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatSchedule(schedule: string): string {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;
  
  const [min, hour, , , day] = parts;
  
  if (day === '*' && parts[2] === '*') {
    return `Daily at ${hour}:${min.padStart(2, '0')}`;
  }
  if (day === '0') return `Weekly at ${hour}:${min.padStart(2, '0')}`;
  
  return schedule;
}

export default function CronsTable({ crons, onRefresh, onToggle, onDelete, onCronClick }: CronsTableProps) {
  const { isDark } = useTheme();
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = (cron: CronJob) => {
    setDeleteTarget(cron);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    
    try {
      await onDelete(deleteTarget.agentSlug, deleteTarget.sessionSlug);
      setDeleteTarget(null);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const columns = [
    { key: 'session', label: 'Session' },
    // { key: 'name', label: 'Name' },
    { key: 'prompt', label: 'Prompt' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'lastRun', label: 'Last Run' },
    // { key: 'nextRun', label: 'Next Run' },
    { key: 'status', label: 'Status' },
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
              Cron Jobs ({crons.length})
            </h3>
            <GlassButton icon={<RefreshCw size={16} />} title="Refresh" onClick={onRefresh} />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {crons.length === 0 ? (
              <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No cron jobs found. Click "New Cron Job" to create one.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className={`border-b border-white/10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-5 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          col.key === 'session' ? 'text-accent-primary' : ''
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crons.map((cron) => (
                    <tr
                      key={cron.id}
                      onClick={() => onCronClick?.(cron)}
                      className={`border-b border-white/5 hover:${
                        isDark ? 'bg-white/5' : 'bg-gray-50'
                      } transition-colors cursor-pointer`}
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-accent-primary hover:text-accent-primary/80">
                          {cron.sessionSlug}
                        </span>
                      </td>
                      {/* <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {cron.name}
                      </td> */}
                      <td className="px-5 py-4 max-w-xs">
                        <div 
                          className={`text-sm truncate cursor-help ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                          title={cron.prompt}
                        >
                          {cron.prompt}
                        </div>
                      </td>
                      {/* <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {cron.agentSlug}
                      </td> */}
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatSchedule(cron.schedule)}
                      </td>
                      <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDateTime(cron.lastRun)}
                      </td>
                      {/* <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDateTime(cron.nextRun)}
                      </td> */}
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          cron.enabled 
                            ? 'bg-green-500/10 text-green-500' 
                            : isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {cron.enabled ? 'Running' : 'Stopped'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onToggle?.(cron.sessionSlug, !cron.enabled)}
                            className={`p-2 rounded-lg transition-colors ${
                              cron.enabled
                                ? isDark ? 'hover:bg-white/10 text-gray-500 hover:text-yellow-400' : 'hover:bg-gray-100 text-gray-400 hover:text-yellow-600'
                                : isDark ? 'hover:bg-white/10 text-gray-500 hover:text-green-400' : 'hover:bg-gray-100 text-gray-400 hover:text-green-600'
                            }`}
                            title={cron.enabled ? 'Stop' : 'Start'}
                          >
                            {cron.enabled ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(cron)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? 'hover:bg-white/10 text-gray-500 hover:text-red-400'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
        title="Delete Cron Job"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ''}
        error={deleteError}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}