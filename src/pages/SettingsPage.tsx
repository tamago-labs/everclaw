import { Settings } from 'lucide-react';
import ComingSoonPage from "../components/common/ComingSoonPage"

export default function SettingsPage() {
  return (
    <ComingSoonPage
      icon={Settings}
      title="Settings"
      description="Configure your account, preferences, API keys, and notification settings."
    />
  );
}
