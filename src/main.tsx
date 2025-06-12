import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getDefaultConfig, TomoEVMKitProvider } from '@tomo-inc/tomo-evm-kit';
import { aeneid } from "@story-protocol/core-sdk";
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from '@tomo-inc/tomo-evm-kit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const config = getDefaultConfig({
  clientId: 'JCcsQrrgXacmVNMQIGU3ppR9Eb7vC1Bex7hIpF79zW7smtkejNK2o96xZxvvc7mXtnK9DMkLEPQeqSPK59jRp7nH', // Replace with your clientId
  appName: 'StoryEncode',
  projectId: '210025460ad550f8aa621ee6a7f5e2d7', // Note: Every dApp that relies on WalletConnect now needs to obtain a projectId from WalletConnect Cloud.
  chains: [aeneid],
  ssr: true, // If your dApp uses server-side rendering (SSR),
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet, 
        rainbowWallet, 
        walletConnectWallet, // Add other wallets if needed
      ],
    },
  ],
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <TomoEVMKitProvider>
            <App />
          </TomoEVMKitProvider>
        </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
