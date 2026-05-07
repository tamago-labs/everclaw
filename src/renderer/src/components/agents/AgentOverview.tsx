import { useTheme } from '../../context/ThemeContext';

interface AgentOverviewProps {
  agentName: string;
}

export default function AgentOverview({ agentName }: AgentOverviewProps) {
  const { isDark } = useTheme();

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
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Created</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>May 7, 2026</span>
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
            Instructions
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            You are a helpful AI assistant that can help users with various tasks...
          </p>
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
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>24</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sessions</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>156</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Messages</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>3</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tools Enabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}