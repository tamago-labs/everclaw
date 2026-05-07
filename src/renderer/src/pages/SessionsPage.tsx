import PageWrapper from '../components/common/PageWrapper';
import SessionsTable from '../components/sessions/SessionsTable';

const mockSessions = [
  { key: 'agent:main:main', lastActive: '2 min ago', tokens: 15420, compaction: 'auto', created: 'May 7, 2026' },
  { key: 'agent:coding:coding-v1', lastActive: '1 hour ago', tokens: 8932, compaction: 'auto', created: 'May 6, 2026' },
  { key: 'agent:research:deep-dive', lastActive: '3 hours ago', tokens: 24150, compaction: 'manual', created: 'May 5, 2026' },
];

export default function SessionsPage() {
  return (
    <PageWrapper title="Sessions">
      <SessionsTable sessions={mockSessions} />
    </PageWrapper>
  );
}