import React from 'react';
import { Activity, Users, Wifi, WifiOff } from 'lucide-react';

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
  return (
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
    </div>
  );
};