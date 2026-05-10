import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import PageWrapper from '../components/common/PageWrapper';
import GlassButton from '../components/common/GlassButton';
import CronsTable, { CronJob } from '../components/crons/CronsTable';
import CreateCronModal from '../components/crons/CreateCronModal';

interface Agent {
  slug: string;
  name: string;
}

export default function CronJobsPage() {
  const navigate = useNavigate();
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCrons = async () => {
    try {
      const allCrons: CronJob[] = await (window as any).everclawAPI.crons.listAll();
      setCrons(allCrons);
    } catch (error) {
      console.error('Failed to fetch crons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const agentList: Agent[] = await (window as any).everclawAPI.agents.list();
      setAgents(agentList.map((a: any) => ({ slug: a.slug, name: a.name })));
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  useEffect(() => {
    fetchCrons();
    fetchAgents();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchCrons();
  };

  const handleToggle = async (cronSlug: string, enabled: boolean) => {
    // Find the cron to get agentSlug
    const cron = crons.find(c => c.sessionSlug === cronSlug);
    if (!cron) return;

    try {
      await (window as any).everclawAPI.crons.toggle(cron.agentSlug, cronSlug, enabled);
      fetchCrons();
    } catch (error) {
      console.error('Failed to toggle cron:', error);
    }
  };

  const handleDelete = async (agentSlug: string, cronSlug: string) => {
    try {
      await (window as any).everclawAPI.crons.delete(agentSlug, cronSlug);
      fetchCrons();
    } catch (error) {
      console.error('Failed to delete cron:', error);
      throw error;
    }
  };

  const handleCronClick = (cron: CronJob) => {
    navigate(`/chat?agent=${cron.agentSlug}&session=${cron.sessionSlug}`);
  };

  const handleCreate = async (data: {
    name: string;
    agentSlug: string;
    prompt: string;
    schedule: string;
  }) => {
    await (window as any).everclawAPI.crons.create(data.agentSlug, {
      name: data.name,
      prompt: data.prompt,
      schedule: data.schedule,
      enabled: false,  // Always start disabled
    });
    fetchCrons();
  };

  return (
    <PageWrapper 
      title="Cron Jobs"
      action={
        <GlassButton 
          icon={<Plus size={16} />} 
          title="New Cron Job" 
          onClick={() => setShowCreateModal(true)} 
        />
      }
    >
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading cron jobs...</div>
      ) : (
        <CronsTable 
          crons={crons} 
          onRefresh={handleRefresh} 
          onToggle={handleToggle}
          onDelete={handleDelete}
          onCronClick={handleCronClick}
        />
      )}

      <CreateCronModal
        isOpen={showCreateModal}
        agents={agents}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </PageWrapper>
  );
}