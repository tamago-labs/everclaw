import { Shield, DollarSign, Wallet, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AgentPermissions() {
  const { isDark } = useTheme();

  const permissions = [
    { name: 'Read Wallet Balance', enabled: true, description: 'View account balances across chains' },
    { name: 'Read Wallet Addresses', enabled: true, description: 'View wallet addresses' },
    { name: 'Write Transactions', enabled: false, description: 'Sign and broadcast transactions' },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ${
        isDark ? 'border border-white/10' : 'border border-black/5 shadow-md'
      }`}
      style={{
        background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className={`absolute inset-0 rounded-2xl ${
        isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
      }`} />
      <div className={`absolute top-0 left-0 w-full h-px ${
        isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
      }`} />
      
      <div className="relative z-10">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Wallet Permissions
        </h3>

        <div className="space-y-3">
          {permissions.map((perm, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                perm.enabled 
                  ? 'bg-accent-primary/10' 
                  : isDark ? 'bg-white/5' : 'bg-gray-200'
              }`}>
                {perm.name.includes('Write') ? (
                  <Wallet 
                    size={16} 
                    className={perm.enabled ? 'text-accent-primary' : isDark ? 'text-gray-500' : 'text-gray-400'} 
                  />
                ) : (
                  <Shield 
                    size={16} 
                    className={perm.enabled ? 'text-accent-primary' : isDark ? 'text-gray-500' : 'text-gray-400'} 
                  />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {perm.name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {perm.description}
                </p>
              </div>
              {perm.enabled && <Check size={16} className="text-accent-primary" />}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Spending Limit
          </h4>
          <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <DollarSign size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No limit set
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}