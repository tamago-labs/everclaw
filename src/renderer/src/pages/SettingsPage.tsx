import { useState } from 'react';
import PageWrapper from '../components/common/PageWrapper';
import SettingsTabs from '../components/settings/SettingsTabs';
import SettingsContent from '../components/settings/SettingsContent';
import AboutTab from '../components/settings/AboutTab';
import WalletTab from '../components/settings/WalletTab';
import LogsTab from '../components/settings/LogsTab';

type Tab = 'logs' | 'about' | 'wallet';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('logs');

  return (
    <PageWrapper title="Settings">
      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <SettingsContent>
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'wallet' && <WalletTab />}
      </SettingsContent>
    </PageWrapper>
  );
}