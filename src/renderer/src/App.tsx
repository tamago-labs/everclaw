import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AIProvider, useAI } from './context/AIContext';
import SelectModelModal from './components/common/SelectModelModal';

function AppModalTrigger() {
  const { models, selectModel, isLoading } = useAI();
  const [showModal, setShowModal] = useState(false);

  // Auto-show modal when AI is not ready
  useEffect(() => {
    setShowModal(true);
  }, []);

  const defaultModels = {
    '1.7B': { name: 'Qwen3-1.7B', specs: '8GB+ RAM • ~1.5GB disk', recommended: 'Low-spec' },
    '4B': { name: 'Qwen3-4B', specs: '16GB+ RAM • ~3-4GB disk', recommended: 'High-spec' },
  };

  const availableModels = models || defaultModels;

  const handleSelect = async (modelType: '4B' | '1.7B') => {
    setShowModal(false);
    await selectModel(modelType);
  };

  return (
    <SelectModelModal
      isOpen={showModal}
      models={availableModels}
      onSelect={handleSelect}
      isLoading={isLoading}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WalletProvider>
          <AIProvider>
            <AppModalTrigger />
            <RouterProvider router={router} />
          </AIProvider>
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}