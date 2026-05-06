export default function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-2xl bg-accent-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-bold text-[#0F1117]">E</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Everclaw</h2>
        <p className="text-gray-400 text-sm mb-6">Version 1.0.0</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2">What is Everclaw?</h3>
          <p className="text-gray-400 text-sm">
            Everclaw is a local-first AI agent system with secure multi-chain wallet support. 
            Your assets and data are stored securely on your device using WDK encryption.
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2">Features</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Secure multi-chain wallet (Ethereum, Solana, Bitcoin)</li>
            <li>• Local-first AI agents with QVAC technology</li>
            <li>• Encrypted seed phrase storage</li>
            <li>• No subscription required</li>
          </ul>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2">Security</h3>
          <p className="text-gray-400 text-sm">
            Your seed phrase is encrypted using your operating system's secure storage 
            (Keychain on macOS, DPAPI on Windows, libsecret on Linux). 
            The encrypted data never leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
}