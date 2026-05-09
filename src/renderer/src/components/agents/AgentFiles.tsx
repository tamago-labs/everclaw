import { useState, useEffect } from 'react';
import { File, Folder, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import GlassButton from '../common/GlassButton';

interface AgentFilesProps {
  agentSlug: string;
}
 

export default function AgentFiles({ agentSlug }: AgentFilesProps) {
  const { isDark } = useTheme();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load files list
  useEffect(() => {
    loadFiles();
  }, [agentSlug]);

  // Load file content when selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  async function loadFiles() {
    try {
      const fileList = await (window as any).everclawAPI.agents.workspace.files(agentSlug);
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  async function loadFileContent(filename: string) {
    setIsLoading(true);
    try {
      const result = await (window as any).everclawAPI.agents.workspace.read(agentSlug, filename);
      setFileContent(result.content);
      setOriginalContent(result.content);
    } catch (error) {
      console.error('Failed to load file:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveFile() {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await (window as any).everclawAPI.agents.workspace.write(agentSlug, selectedFile, fileContent);
      setOriginalContent(fileContent);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = fileContent !== originalContent;

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
        </div>

        <div className="flex gap-4 h-[400px]">
          {/* File list sidebar */}
          <div className={`w-48 border-r ${isDark ? 'border-white/10' : 'border-gray-200'} pr-4`}>
            {files.length === 0 ? (
              <div className="text-center py-4">
                <Folder className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No files</p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedFile === file
                        ? isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'
                        : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <File size={16} className={selectedFile === file ? 'text-accent-primary' : ''} />
                    <span className="text-sm truncate">{file}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col">
            {selectedFile ? (
              <>
                {/* Editor header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedFile}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <span className="text-xs text-amber-500">Unsaved changes</span>
                    )}
                    {hasChanges && !isSaving && (
                      <GlassButton
                        icon={<Save size={14} />}
                        title="Save"
                        onClick={saveFile}
                      />
                    )}
                  </div>
                </div>

                {/* Editor textarea */}
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  disabled={isLoading}
                  className={`flex-1 w-full p-4 rounded-xl resize-none font-mono text-sm ${
                    isDark
                      ? 'bg-black/20 text-gray-200 border border-white/10'
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  } ${isLoading ? 'opacity-50' : ''}`}
                  placeholder="File content..."
                />
              </>
            ) : (
              <div className={`h-full flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-center">
                  <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a file to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}