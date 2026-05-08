import { Shield } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import AccountCard from '../components/common/AccountCard';
import WelcomeCard from '../components/common/WelcomeCard';
import PageWrapper from '../components/common/PageWrapper';
import AIOverviewCard from '../components/overview/AIOverviewCard';
import TokenBalancesSection from '../components/overview/TokenBalancesSection';
import { useWallet } from '../context/WalletContext';

export default function OverviewPage() {
  const { hasWallet, accounts } = useWallet();

  const walletAddresses = accounts.map(account => ({
    chain: account.chain.charAt(0).toUpperCase() + account.chain.slice(1) as 'Solana' | 'Ethereum' | 'Bitcoin',
    address: account.address,
  }));

  return (
    <PageWrapper title="Overview">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <WelcomeCard />
        <StatCard
          title="Powered by"
          value="Tether QVAC"
          subtitle="with WDK-secured wallets"
          icon={Shield}
          accentColor="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountCard
          addresses={walletAddresses.length > 0 ? walletAddresses : []}
          isPlaceholder={!hasWallet}
        />
        <AIOverviewCard />
      </div>

      <TokenBalancesSection />

    </PageWrapper>
  );
}