import { LayoutDashboard } from 'lucide-react';
import ComingSoonPage from "../components/common/ComingSoonPage"

export default function OverviewPage() {
  return (
    <ComingSoonPage
      icon={LayoutDashboard}
      title="Overview"
      description="Get a bird's eye view of your AI agents, usage metrics, and recent activity."
    />
  );
}
