import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [/@tetherto\/wdk/, /@tetherto\/wdk-wallet/, /@tetherto\/wdk-wallet-evm/, /@tetherto\/wdk-wallet-solana/, /bare-/],
    },
  },
});

