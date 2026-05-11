import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface AgentOverviewProps {
  agentName: string;
}

interface AgentStats {
  sessionsCount: number;
  messagesCount: number;
  toolsEnabled: number;
}

export default function AgentOverview({ agentName }: AgentOverviewProps) {
  const { isDark } = useTheme();
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [stats, setStats] = useState<AgentStats>({ sessionsCount: 0, messagesCount: 0, toolsEnabled: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch system prompt
        const slug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const prompt = await (window as any).everclawAPI.agents.getSystemPrompt(slug);
        setSystemPrompt(prompt);

        // Fetch sessions and filter by agent
        const allSessions = await (window as any).everclawAPI.sessions.getAllSessions();
        const agentSessions = allSessions.filter((s: any) => s.agent === slug);
        
        const sessionsCount = agentSessions.length;
        const messagesCount = agentSessions.reduce((sum: number, s: any) => sum + (s.messagesCount || 0), 0);
        
        // Fetch tools count
        const tools = await (window as any).everclawAPI.tools.list();
        const enabledCount = tools.filter((t: any) => t.enabled).length;

        setStats({
          sessionsCount,
          messagesCount,
          toolsEnabled: enabledCount,
        });
      } catch (error) {
        console.error('Failed to fetch agent data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [agentName]);

  // Truncate prompt for preview (first 200 chars)
  const promptPreview = systemPrompt.length > 200 
    ? systemPrompt.substring(0, 200) + '...'
    : systemPrompt;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Agent Info Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className={`absolute inset-0 rounded-2xl ${
          isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />
        <div className="relative z-10">
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Agent Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Name</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{agentName}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Status</span>
              <span className="text-green-500">Active</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Sessions</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{stats.sessionsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className={`absolute inset-0 rounded-2xl ${
          isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />
        <div className="relative z-10">
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            System Prompt
          </h3>
          {isLoading ? (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading...
            </p>
          ) : promptPreview ? (
            <pre className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {promptPreview}
            </pre>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No system prompt configured
            </p>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:col-span-2 ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className={`absolute inset-0 rounded-2xl ${
          isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />
        <div className="relative z-10">
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isLoading ? '-' : stats.sessionsCount}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sessions</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isLoading ? '-' : stats.messagesCount}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Messages</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isLoading ? '-' : stats.toolsEnabled}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tools Enabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
