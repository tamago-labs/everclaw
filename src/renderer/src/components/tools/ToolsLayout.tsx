import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Power } from 'lucide-react';
import GlassButton from '../common/GlassButton';
import GlassDropdown from '../common/GlassDropdown';

interface ToolParameter {
  type: string;
  description?: string;
  required: boolean;
}

interface ToolInfo {
  name: string;
  description: string;
  uiDescription: string;
  tags: string[];
  requiredTools: string[];
  packages: string[];
  parameters: Record<string, ToolParameter>;
}

interface ToolStatus {
  name: string;
  enabled: boolean;
}

interface ToolsLayoutProps {
  toolsInfo: ToolInfo[];
  toolsStatus: ToolStatus[];
  onToggle: (toolName: string, enabled: boolean) => void;
}

export default function ToolsLayout({ toolsInfo, toolsStatus, onToggle }: ToolsLayoutProps) {
  const { isDark } = useTheme();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Get enabled status map
  const statusMap = toolsStatus.reduce((acc, t) => {
    acc[t.name] = t.enabled;
    return acc;
  }, {} as Record<string, boolean>);
  
  // Extract all unique tags with counts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    toolsInfo.forEach(tool => {
      tool.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [toolsInfo]);
  
  // Tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTags.forEach(tag => {
      counts[tag] = toolsInfo.filter(tool => tool.tags.includes(tag)).length;
    });
    return counts;
  }, [allTags, toolsInfo]);
  
  // Filter tools by tag
  const filteredTools = useMemo(() => {
    if (selectedTag === 'all') return toolsInfo;
    return toolsInfo.filter(tool => tool.tags.includes(selectedTag));
  }, [toolsInfo, selectedTag]);
  
  // Select first tool by default
  useEffect(() => {
    if (!selectedTool && filteredTools.length > 0) {
      setSelectedTool(filteredTools[0].name);
    }
  }, [filteredTools, selectedTool]);
  
  const selectedToolInfo = toolsInfo.find(t => t.name === selectedTool);
  const isEnabled = selectedTool ? statusMap[selectedTool] ?? false : false;

  const handleToggle = async () => {
    if (selectedTool) {
      onToggle(selectedTool, !isEnabled);
    }
  };

  return (
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

      <div className="relative z-10 flex min-h-[500px]">
        {/* Sidebar - Tool List */}
        <div className={`w-64 border-r ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <div className="p-4">
            {/* Tag filter dropdown - full width */}
            <GlassDropdown
              label=""
              value={selectedTag}
              options={[
                { value: 'all', label: `All Tools (${toolsInfo.length})` },
                ...allTags.map(tag => ({ value: tag, label: `${tag} (${tagCounts[tag]})` })),
              ]}
              onChange={(tag) => {
                setSelectedTag(tag);
                setSelectedTool(null); // Reset selection when filter changes
              }}
            />
          </div>
          <div className="px-2 pb-4 space-y-1">
            {filteredTools.map((tool) => {
              const enabled = statusMap[tool.name] ?? false;
              const isSelected = tool.name === selectedTool;
              
              return (
                <button
                  key={tool.name}
                  onClick={() => setSelectedTool(tool.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-gray-100 text-gray-900'
                      : isDark
                        ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium`}>{tool.name}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                      {tool.uiDescription.slice(0, 35)}...
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content - Tool Details */}
        <div className="flex-1 p-6">
          {selectedToolInfo ? (
            <> 
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedToolInfo.name}
                  </h2>
                  {/* Tags */}
                  <div className="mt-3">
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tags</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedToolInfo.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-1 rounded-full cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          onClick={() => {
                            setSelectedTag(tag);
                            setSelectedTool(null);
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <GlassButton
                  icon={<Power size={16} />}
                  title={isEnabled ? 'Disable' : 'Enable'}
                  onClick={handleToggle}
                  variant={isEnabled ? 'default' : 'success'}
                />
              </div>

              {/* Long Description */}
              <div className="mb-6">
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Description</span>
                <div className={`rounded-xl p-4 mt-1 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedToolInfo.uiDescription}
                  </p>
                </div>
              </div>

              {/* Required Tools */}
              {selectedToolInfo.requiredTools.length > 0 && (
                <div className="mb-6">
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Required Tools</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedToolInfo.requiredTools.map((toolName) => (
                      <span
                        key={toolName}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          isDark
                            ? 'border-white/10 text-gray-400'
                            : 'border-black/5 text-gray-500'
                        }`}
                      >
                        {toolName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameters */}
              <div className="mb-6">
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Parameters
                </h3>
                <div className={`rounded-xl p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  {Object.entries(selectedToolInfo.parameters).map(([key, param]) => (
                    <div key={key} className="flex items-start gap-4 py-2 border-b border-white/5 last:border-0">
                      <code className={`text-sm font-mono px-2 py-1 rounded ${
                        isDark ? 'bg-white/10 text-accent-primary' : 'bg-gray-200 text-accent-primary'
                      }`}>
                        {key}
                      </code>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {param.type}
                          </span>
                          {param.required && (
                            <span className="text-xs text-red-500">required</span>
                          )}
                        </div>
                        {param.description && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {param.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dependencies */}
              {selectedToolInfo.packages.length > 0 && (
                <div>
                  <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dependencies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedToolInfo.packages.map((pkg) => (
                      <span
                        key={pkg}
                        className={`text-xs px-2 py-1 rounded-full font-mono ${
                          isDark
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : 'bg-accent-primary/10 text-accent-primary'
                        }`}
                      >
                        {pkg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`h-full flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Select a tool to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}