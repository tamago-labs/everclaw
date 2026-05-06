import { useState } from 'react';
import PageWrapper from '../components/common/PageWrapper';
import SettingsTabs from '../components/settings/SettingsTabs';
import SettingsContent from '../components/settings/SettingsContent';
import AboutTab from '../components/settings/AboutTab';
import WalletTab from '../components/settings/WalletTab';

type Tab = 'about' | 'wallet';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('about');

  return (
    <PageWrapper title="Settings">
      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <SettingsContent>
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'wallet' && <WalletTab />}
      </SettingsContent>
    </PageWrapper>
  );
}