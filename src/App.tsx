import { RouterProvider } from 'react-router';
import { router } from './router';
import { WalletProvider } from './context/WalletContext';

export default function App() {
  return (
    <WalletProvider>
      <RouterProvider router={router} />
    </WalletProvider>
  );
}