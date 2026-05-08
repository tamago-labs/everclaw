import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useTheme } from '../../context/ThemeContext';

function formatUptime(startTime: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  const minutes = Math.floor(diff / 60) % 60;
  const hours = Math.floor(diff / 3600) % 24;
  const days = Math.floor(diff / 86400);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  if (parts.length === 0) {
    parts.push('<1m');
  }

  return parts.join(' ');
}

export default function AIOverviewCard() {
  const navigate = useNavigate();
  const { isReady, startTime } = useAI();
  const { isDark } = useTheme();
  const [uptime, setUptime] = useState('--');
  const [sessionsCount, setSessionsCount] = useState('--');

  useEffect(() => {
    if (startTime) {
      setUptime(formatUptime(startTime));
    } else {
      setUptime('--');
    }
  }, [startTime]);

  // Fetch session count
  useEffect(() => {
    async function fetchSessionsCount() {
      try {
        const agents: any[] = await (window as any).everclawAPI.agents.list();
        let totalSessions = 0;
        
        for (const agent of agents) {
          const sessions: string[] = await (window as any).everclawAPI.sessions.list(agent.slug);
          totalSessions += sessions.length;
        }
        
        setSessionsCount(totalSessions.toString());
      } catch (error) {
        console.error('Failed to fetch sessions count:', error);
        setSessionsCount('0');
      }
    }

    fetchSessionsCount();
  }, []);

  const handleShowLogs = () => {
    navigate('/settings');
  };

  const items = [
    { label: 'Status', value: isReady ? 'Ready' : 'Loading...' },
    { label: 'Model', value: isReady ? 'Llama-3.2-1B-Instruct' : '--' },
    { label: 'Uptime', value: uptime },
    { label: 'Sessions / Running Jobs', value: `${sessionsCount} / 0` }
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
        }`}
      style={{
        background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className={`absolute inset-0 rounded-2xl ${isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
      <div className={`absolute top-0 left-0 w-full h-px ${isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

      <div className="relative z-10">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          AI Overview
        </h3>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.label}
              className={`flex justify-between py-2 ${index < items.length - 1 ? 'border-b border-white/10' : ''
                }`}
            >
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {item.label}
              </span>
              <span className={`text-sm font-medium flex items-center gap-2 ${item.label === 'Status'
                  ? (isReady ? 'text-green-500' : 'text-gray-400')
                  : (isDark ? 'text-white' : 'text-gray-900')
                }`}>
                {item.label === 'Status' && !isReady ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Show logs button */}
        <button
          onClick={handleShowLogs}
          className="mt-10 text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
        >
          Show logs
        </button>
      </div>
    </div>
  );
}