import { Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AgentCronJobs() {
  const { isDark } = useTheme();

  const jobs = [
    { name: 'Daily Report', schedule: '0 9 * * *', enabled: true, lastRun: '2 hours ago' },
    { name: 'Weekly Summary', schedule: '0 10 * * 0', enabled: false, lastRun: '3 days ago' },
  ];

  return (
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
          Scheduled Tasks
        </h3>

        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No scheduled tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  job.enabled 
                    ? 'bg-accent-primary/10' 
                    : isDark ? 'bg-white/5' : 'bg-gray-200'
                }`}>
                  <Clock 
                    size={16} 
                    className={job.enabled ? 'text-accent-primary' : isDark ? 'text-gray-500' : 'text-gray-400'} 
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {job.name}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {job.schedule} • Last run: {job.lastRun}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  job.enabled 
                    ? 'bg-green-500/10 text-green-500' 
                    : isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {job.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}