import { File, Folder, Upload } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import GlassButton from '../common/GlassButton';

export default function AgentFiles() {
  const { isDark } = useTheme();

  const files = [
    { name: 'instructions.txt', type: 'file', size: '2.4 KB' },
    { name: 'context.pdf', type: 'file', size: '156 KB' },
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
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Files
          </h3>
          <GlassButton icon={<Upload size={16} />} title="Upload file" />
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8">
            <Folder className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                <File size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                <div className="flex-1">
                  <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{file.size}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}