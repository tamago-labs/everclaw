import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ConfirmModal from '../common/ConfirmModal';

interface Agent {
  slug: string;
  name: string;
}

interface CreateCronModalProps {
  isOpen: boolean;
  agents: Agent[];
  onClose: () => void;
  onCreate: (data: {
    name: string;
    agentSlug: string;
    prompt: string;
    schedule: string;
  }) => Promise<void>;
}

const SCHEDULE_PRESETS = [
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily midnight', value: '0 0 * * *' },
  { label: 'Daily 9am', value: '0 9 * * *' },
];


export default function CreateCronModal({ isOpen, agents, onClose, onCreate }: CreateCronModalProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState('');
  const [agentSlug, setAgentSlug] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schedule, setSchedule] = useState('0 9 * * *');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAgentSlug(agents[0]?.slug || '');
      setPrompt('');
      setSchedule('0 9 * * *');
      setError(null);
    }
  }, [isOpen, agents]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!agentSlug) { setError('Please select an agent'); return; }
    if (!prompt.trim()) { setError('Prompt is required'); return; }
    if (!schedule.trim()) { setError('Schedule is required'); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), agentSlug, prompt: prompt.trim(), schedule });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cron job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      title="New Cron Job"
      error={error}
      confirmText={isSubmitting ? 'Creating...' : 'Create'}
      cancelText="Cancel"
      onConfirm={handleSubmit}
      onCancel={onClose}
      customContent={
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
          {/* Row 1: Name + Agent */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily market update"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-black/10 text-gray-900 placeholder-gray-400'} outline-none focus:border-accent-primary`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Agent</label>
            <select
              value={agentSlug}
              onChange={(e) => setAgentSlug(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'} outline-none focus:border-accent-primary`}
              style={isDark ? { colorScheme: 'dark' } : {}}
            >
              {agents.map((agent) => (
                <option key={agent.slug} value={agent.slug} style={{ background: isDark ? '#1a1d2e' : '#fff', color: isDark ? '#fff' : '#000' }}>
                  {agent.name} ({agent.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Schedule presets (full width) */}
          <div className="col-span-2">
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Schedule</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSchedule(preset.value)}
                  className={`px-2 py-1 text-xs rounded border ${
                    schedule === preset.value
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : isDark ? 'border-white/10 text-gray-400 hover:border-white/20' : 'border-black/10 text-gray-500 hover:border-black/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Schedule input (full width) */}
          <div className="col-span-2">
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 9 * * *"
              className={`w-full px-3 py-2 rounded-lg border font-mono ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-black/10 text-gray-900 placeholder-gray-400'} outline-none focus:border-accent-primary`}
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Format: minute hour day month weekday</p>
          </div>
 
          <div className="col-span-2">
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sell my SOL to USDT on Jupiter when price above $110"
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border resize-none ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-black/10 text-gray-900 placeholder-gray-400'} outline-none focus:border-accent-primary`}
            />
          </div>
        </div>
      }
    />
  );
}