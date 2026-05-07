import { Shield } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import AccountCard from '../components/common/AccountCard';
import WelcomeCard from '../components/common/WelcomeCard';
import PageWrapper from '../components/common/PageWrapper';
import { useWallet } from '../context/WalletContext';

export default function OverviewPage() {
  const { hasWallet, accounts } = useWallet();

  // Format accounts for AccountCard
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
      {/* {hasWallet ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Total Value Locked"
            value="34,366,907 FIL"
            subtitle="$33,988,871"
            icon={DollarSign}
            accentColor="green"
          />
          <StatCard
            title="iFIL Redemption Value"
            value="1.30832 FIL"
            subtitle="$1.29"
            icon={TrendingUp}
            accentColor="blue"
          />
          <StatCard
            title="Powered By"
            value="Tether QVAC"
            subtitle="with WDK-secured wallet"
            icon={Shield}
            accentColor="purple"
          />
        </div>
      ) : (
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
      )} */}

      {/* Account & Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountCard
          addresses={walletAddresses.length > 0 ? walletAddresses : []}
          isPlaceholder={!hasWallet}
        />
        {/* Summary card placeholder */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">AI Overview</h3>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </div>
    </PageWrapper>
  );
}