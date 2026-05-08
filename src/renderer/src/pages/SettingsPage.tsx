import { useState } from 'react';
import PageWrapper from '../components/common/PageWrapper';
import SettingsTabs from '../components/settings/SettingsTabs';
import SettingsContent from '../components/settings/SettingsContent';
import AboutTab from '../components/settings/AboutTab';
import WalletTab from '../components/settings/WalletTab';
import LogsTab from '../components/settings/LogsTab';
import TokensTab from '../components/settings/TokensTab';

type Tab = 'logs' | 'tokens' | 'wallet' | 'about';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('logs');

  return (
    <PageWrapper title="Settings">
      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <SettingsContent>
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'tokens' && <TokensTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'about' && <AboutTab />}
      </SettingsContent>
    </PageWrapper>
  );
}
