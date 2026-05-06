import { Clock } from 'lucide-react';
import ComingSoonPage from "../components/common/ComingSoonPage"

export default function CronJobsPage() {
  return (
    <ComingSoonPage
      icon={Clock}
      title="Cron Jobs"
      description="Schedule and manage automated tasks for your AI agents."
    />
  );
}
