import { useState, useEffect } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function LogsTab() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const logLines = await (window as any).everclawAPI.logs.get(200);
      setLogs(logLines);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  const handleClear = async () => {
    try {
      await (window as any).everclawAPI.logs.clear();
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Logs
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Application logs from today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/10 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
            } ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh logs"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleClear}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/10 text-gray-400 hover:text-red-400'
                : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
            }`}
            title="Clear logs"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Logs container */}
      <div
        className={`rounded-xl p-4 h-[500px] overflow-auto font-mono text-sm ${
          isDark ? 'bg-black/30' : 'bg-gray-50'
        }`}
      >
        {isLoading ? (
          <div className={`flex items-center justify-center h-full ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className={`flex items-center justify-center h-full ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            No logs yet
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}