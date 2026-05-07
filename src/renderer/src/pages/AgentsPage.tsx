import { useState } from 'react';
import PageWrapper from '../components/common/PageWrapper';
import GlassDropdown from '../components/common/GlassDropdown';
import AgentTabs from '../components/agents/AgentTabs';
import AgentOverview from '../components/agents/AgentOverview';
import AgentFiles from '../components/agents/AgentFiles';
import AgentTools from '../components/agents/AgentTools';
import AgentCronJobs from '../components/agents/AgentCronJobs';
import AgentPermissions from '../components/agents/AgentPermissions';

type Tab = 'overview' | 'files' | 'tools' | 'cron-jobs' | 'permissions';

const agentOptions = [
  { value: 'main', label: 'Main Agent' },
  { value: 'coding', label: 'Coding Agent' },
  { value: 'research', label: 'Research Agent' },
];

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedAgent, setSelectedAgent] = useState('main');

  const getAgentName = () => {
    return agentOptions.find(a => a.value === selectedAgent)?.label || 'Agent';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AgentOverview agentName={getAgentName()} />;
      case 'files':
        return <AgentFiles />;
      case 'tools':
        return <AgentTools />;
      case 'cron-jobs':
        return <AgentCronJobs />;
      case 'permissions':
        return <AgentPermissions />;
      default:
        return null;
    }
  };

  return (
    <PageWrapper title="Agents">
      {/* Agent Selector */}
      <div className="mb-6">
        <GlassDropdown
          label="Agent"
          value={selectedAgent}
          options={agentOptions}
          onChange={setSelectedAgent}
        />
      </div>

      {/* Tabs */}
      <AgentTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </PageWrapper>
  );
}