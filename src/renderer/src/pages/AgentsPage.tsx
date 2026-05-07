import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import PageWrapper from '../components/common/PageWrapper';
import GlassDropdown from '../components/common/GlassDropdown';
import GlassButton from '../components/common/GlassButton';
import AgentTabs from '../components/agents/AgentTabs';
import AgentOverview from '../components/agents/AgentOverview';
import AgentFiles from '../components/agents/AgentFiles';
import AgentTools from '../components/agents/AgentTools';
import AgentCronJobs from '../components/agents/AgentCronJobs'; 
import CreateAgentModal from '../components/agents/CreateAgentModal';

type Tab = 'overview' | 'files' | 'tools' | 'cron-jobs';

interface Agent {
  slug: string;
  sessionsCount: number;
  workspacesCount: number;
}

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedAgent, setSelectedAgent] = useState('main');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch agents on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadAgents() {
      try {
        const agentList = await (window as any).everclawAPI.agents.list();
        if (mounted) {
          setAgents(agentList);
          
          // Set default if current selection doesn't exist
          if (agentList.length > 0 && !agentList.find((a: Agent) => a.slug === selectedAgent)) {
            setSelectedAgent(agentList[0].slug);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadAgents();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefreshAgents = async () => {
    try {
      const agentList = await (window as any).everclawAPI.agents.list();
      setAgents(agentList);
      
      if (agentList.length > 0 && !agentList.find((a: Agent) => a.slug === selectedAgent)) {
        setSelectedAgent(agentList[0].slug);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const handleCreateAgent = async (name: string) => {
    try {
      await (window as any).everclawAPI.agents.create(name);
      await handleRefreshAgents();
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  };

  const agentOptions = agents.map(agent => ({
    value: agent.slug,
    label: agent.slug === 'main' ? 'main (default)' : agent.slug,
  }));

  const getAgentName = () => {
    return agentOptions.find(a => a.value === selectedAgent)?.label.replace(' (default)', '') || 'main';
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
      default:
        return null;
    }
  };

  return (
    <PageWrapper title="Agents">
      {/* Agent Selector */}
      <div className="mb-6 flex items-center gap-4">
        {isLoading ? (
          <span className="text-gray-400">Loading...</span>
        ) : (
          <>
            <GlassDropdown
              label="Agent"
              value={selectedAgent}
              options={agentOptions}
              onChange={setSelectedAgent}
            />
            <GlassButton icon={<Plus size={16} />} title="Create new agent" onClick={() => setIsModalOpen(true)} />
          </>
        )}
      </div>

      {/* Tabs */}
      <AgentTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}

      {/* Create Agent Modal */}
      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateAgent}
      />
    </PageWrapper>
  );
}