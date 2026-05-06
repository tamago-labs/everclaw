import { RouterProvider } from 'react-router';
import { router } from './router';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AIProvider } from './context/AIContext';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WalletProvider>
          <AIProvider>
            <RouterProvider router={router} />
          </AIProvider>
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}