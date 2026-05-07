import { Wrench, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AgentTools() {
  const { isDark } = useTheme();

  const tools = [
    { name: 'Web Search', enabled: true, description: 'Search the web for information' },
    { name: 'Calculator', enabled: true, description: 'Mathematical calculations' },
    { name: 'Code Interpreter', enabled: false, description: 'Execute and test code' },
    { name: 'File Reader', enabled: true, description: 'Read files from disk' },
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
          Enabled Tools
        </h3>

        <div className="space-y-3">
          {tools.map((tool, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                tool.enabled 
                  ? 'bg-accent-primary/10' 
                  : isDark ? 'bg-white/5' : 'bg-gray-200'
              }`}>
                <Wrench 
                  size={16} 
                  className={tool.enabled ? 'text-accent-primary' : isDark ? 'text-gray-500' : 'text-gray-400'} 
                />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {tool.name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {tool.description}
                </p>
              </div>
              {tool.enabled && <Check size={16} className="text-accent-primary" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}