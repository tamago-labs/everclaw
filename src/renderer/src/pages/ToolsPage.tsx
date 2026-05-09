import { useState, useEffect } from 'react';
import ToolsLayout from '../components/tools/ToolsLayout';
import PageWrapper from '../components/common/PageWrapper';

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
  parameters: Record<string, ToolParameter>;
}

interface ToolStatus {
  name: string;
  enabled: boolean;
}

export default function ToolsPage() {
  const [toolsInfo, setToolsInfo] = useState<ToolInfo[]>([]);
  const [toolsStatus, setToolsStatus] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const [info, status] = await Promise.all([
        (window as any).everclawAPI.tools.getInfo(),
        (window as any).everclawAPI.tools.list(),
      ]);
      setToolsInfo(info);
      setToolsStatus(status);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (toolName: string, enabled: boolean) => {
    try {
      await (window as any).everclawAPI.tools.toggle(toolName, enabled);
      // Update local state
      setToolsStatus(prev => 
        prev.map(t => t.name === toolName ? { ...t, enabled } : t)
      );
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Tools">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading tools...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Tools">
      <ToolsLayout
        toolsInfo={toolsInfo}
        toolsStatus={toolsStatus}
        onToggle={handleToggle}
      />
    </PageWrapper>
  );
}