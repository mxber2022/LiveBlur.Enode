import React, { useState } from 'react';
import { Activity, Users, Wallet, Wifi, WifiOff, X } from 'lucide-react';
import { useConnectModal } from '@tomo-inc/tomo-evm-kit';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from 'thirdweb/react';
import { client } from '../client';
import { PortalModal } from './PortalModal';

interface StatusBarProps {
  isProcessing: boolean;
  faceCount: number;
  streamConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isProcessing,
  faceCount,
  streamConnected
}) => {
  
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showThirdweb, setShowThirdweb] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowWalletDropdown(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  return (
    <>
      <div className="flex items-center space-x-4">
        {/* Processing Status */}
        <div className="flex items-center space-x-2 glass-dark px-3 py-2 rounded-xl">
          <div className={`w-2 h-2 rounded-full status-dot ${
            isProcessing ? 'bg-green-400 active' : 'bg-gray-500'
          }`}></div>
          <span className="text-xs font-medium text-gray-200">
            {isProcessing ? 'Processing' : 'Idle'}
          </span>
        </div>

        {/* Face Database Count */}
        <div className="flex items-center space-x-2 glass-dark px-3 py-2 rounded-xl">
          <Users className="h-3 w-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-200">
            {faceCount}
          </span>
        </div>

        {/* Stream Connection */}
        <div className="flex items-center space-x-2 glass-dark px-3 py-2 rounded-xl">
          {streamConnected ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-gray-500" />
          )}
          <span className="text-xs font-medium text-gray-200">
            {streamConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* connect wallet button */}
        <div className="flex items-center space-x-2 glass-dark px-3 py-2 rounded-xl relative">
          <Wallet className="h-3 w-3 text-gray-400" />
          {isConnected ? (
            <>
              <button
                className="text-xs font-medium text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 hover:bg-gray-700/40 transition"
                onClick={() => setShowWalletDropdown((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showWalletDropdown}
              >
                {formatAddress(address!)}
              </button>
              {showWalletDropdown && (
                <div
                  className="absolute right-0 top-8 wallet-dropdown min-w-[160px] bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-2 animate-fade-in z-[2147483647]"
                  tabIndex={-1}
                  onBlur={() => setShowWalletDropdown(false)}
                >
                  <button
                    className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 transition flex items-center"
                    onClick={() => {
                      handleCopyAddress();
                      setShowWalletDropdown(false);
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-gray-800 transition flex items-center"
                    onClick={() => {
                      handleDisconnect();
                      setShowWalletDropdown(false);
                    }}
                  >
                    Disconnect <X className="h-3 w-3 ml-2 text-red-400" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              className="text-xs font-medium text-gray-200"
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Wallet Modal - Properly centered */}
      {showWalletModal && (
        <PortalModal>
          <div 
            className="fixed inset-0 wallet-modal-overlay isolate flex items-center justify-center min-h-screen bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowWalletModal(false);
                setShowThirdweb(false);
              }
            }}
          >
            <div className="relative glass-premium rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 flex flex-col items-center animate-fade-in wallet-modal">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 z-10"
                onClick={() => {
                  setShowWalletModal(false);
                  setShowThirdweb(false);
                }}
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="text-center mb-8">
                <div className="p-3 gradient-bg-dark rounded-xl inline-block mb-4">
                  <Wallet className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Connect Wallet</h3>
                <p className="text-gray-400 text-sm">Choose your preferred wallet to connect</p>
              </div>
              <div className="space-y-4 w-full">
                <button
                  className="btn-primary w-full py-4 rounded-xl font-medium text-base flex items-center justify-center space-x-3 hover:transform hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    setShowWalletModal(false);
                    openConnectModal?.();
                  }}
                >
                  <Wallet className="h-5 w-5" />
                  <span>Connect with Tomo Wallet</span>
                </button>
                <button
                  className="btn-secondary w-full py-4 rounded-xl font-medium text-base flex items-center justify-center space-x-3 hover:transform hover:scale-105 transition-all duration-200"
                  onClick={() => setShowThirdweb(true)}
                >
                  <Wallet className="h-5 w-5" />
                  <span>Connect with Thirdweb Wallet</span>
                </button>
              </div>
              {showThirdweb && (
                <div className="mt-6 pt-6 border-t border-white/10 w-full flex flex-col items-center">
                  <ConnectButton client={client} />
                </div>
              )}
            </div>
          </div>
        </PortalModal>
      )}
    </>
  );
};