import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import PageWrapper from '../components/common/PageWrapper';
import SessionsTable from '../components/sessions/SessionsTable';

interface Session {
  key: string;
  lastActive: string;
  tokens: number;
  compaction: string;
  created: string;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const allSessions: any[] = await (window as any).everclawAPI.sessions.getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchSessions();
  };

  const handleDelete = async (key: string) => {
    // key format: agent:{agent}:{session}
    const parts = key.split(':');
    if (parts.length >= 3) {
      const agentSlug = parts[1];
      const sessionSlug = parts[2];
      
      try {
        await (window as any).everclawAPI.sessions.delete(agentSlug, sessionSlug);
        fetchSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
      }
    }
  };

  const handleSessionClick = (key: string) => {
    // key format: agent:{agent}:{session}
    const parts = key.split(':');
    if (parts.length >= 3) {
      const agentSlug = parts[1];
      const sessionSlug = parts[2];
      
      // Navigate to chat page with agent and session params
      navigate(`/chat?agent=${agentSlug}&session=${sessionSlug}`);
    }
  };

  return (
    <PageWrapper title="Sessions">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading sessions...</div>
      ) : (
        <SessionsTable 
          sessions={sessions} 
          onRefresh={handleRefresh} 
          onDelete={handleDelete}
          onSessionClick={handleSessionClick}
        />
      )}
    </PageWrapper>
  );
}