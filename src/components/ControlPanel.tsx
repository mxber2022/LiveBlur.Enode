import React, { useState } from 'react';
import { Settings, Sliders, Target, Globe, Camera, Video, AlertTriangle, Zap, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface ControlPanelProps {
  streamUrl: string;
  onStreamUrlChange: (url: string) => void;
  blurIntensity: number;
  onBlurIntensityChange: (intensity: number) => void;
  detectionConfidence: number;
  onDetectionConfidenceChange: (confidence: number) => void;
  isProcessing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  streamUrl,
  onStreamUrlChange,
  blurIntensity,
  onBlurIntensityChange,
  detectionConfidence,
  onDetectionConfidenceChange,
  isProcessing
}) => {
  const [expandedSections, setExpandedSections] = useState({
    privacyControls: false,
    systemStatus: false,
    quickActions: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleStreamUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      onStreamUrlChange('webcam');
    } catch (err) {
      console.error('Webcam access denied:', err);
      alert('Camera access denied. Please allow camera permissions in your browser settings.');
    }
  };

  const handleSampleVideo = () => {
    onStreamUrlChange('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  };

  const isUnsupportedUrl = (url: string) => {
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('twitch.tv') || 
           url.includes('facebook.com') || 
           url.includes('instagram.com');
  };

  return (
    <div className="space-y-6">
      {/* Stream Configuration */}
      <div className="glass-premium rounded-2xl p-6 card-hover">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 gradient-bg-dark rounded-lg shadow-lg">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stream Source
          </h3>
        </div>
        
        <form onSubmit={handleStreamUrlSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-200">
              Video Source URL
            </label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => onStreamUrlChange(e.target.value)}
              placeholder="Enter direct video URL or use buttons below"
              className={`w-full glass-input rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
                isUnsupportedUrl(streamUrl) 
                  ? 'border-red-400/50 focus:border-red-400 focus:shadow-red-400/20' 
                  : 'focus:border-gray-400/50 focus:shadow-gray-400/20'
              }`}
            />
            {isUnsupportedUrl(streamUrl) && (
              <div className="mt-3 flex items-start space-x-2 text-red-400 text-sm glass-dark rounded-lg p-3">
                {/* <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> */}
                {/* <span>This platform is not supported due to CORS restrictions</span> */}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleWebcamAccess}
              className="btn-primary flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium"
            >
              <Camera className="h-4 w-4" />
              <span>Webcam</span>
            </button>
            <button
              type="button"
              onClick={handleSampleVideo}
              className="btn-secondary flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium text-white"
            >
              <Video className="h-4 w-4" />
              <span>Sample</span>
            </button>
          </div>
        </form>
        
        <div className="mt-6 glass-dark rounded-xl p-4">
          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-medium text-green-400 flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Supported Sources:</span>
            </p>
            <div className="ml-4 space-y-1 text-xs">
              <p>• Webcam (recommended)</p>
              <p>• Direct video files (.mp4, .webm, .ogg)</p>
              <p>• HLS streams (.m3u8)</p>
            </div>
            {/* <p className="font-medium text-red-400 flex items-center space-x-2 mt-3">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              <span>Not Supported:</span>
            </p> */}
            <div className="ml-4 text-xs">
              <p>• YouTube, Twitch, social media platforms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Controls - Expandable */}
      <div className="glass-premium rounded-2xl overflow-hidden card-hover">
        <button
          onClick={() => toggleSection('privacyControls')}
          className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 gradient-bg-charcoal rounded-lg shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Privacy Controls
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="glass-dark px-2 py-1 rounded-lg">
              <span className="text-xs text-gray-400 font-medium">
                {blurIntensity}px • {Math.round(detectionConfidence * 100)}%
              </span>
            </div>
            {expandedSections.privacyControls ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>
        
        <div className={`expandable-content ${expandedSections.privacyControls ? 'expanded' : 'collapsed'}`}>
          <div className="px-5 pb-5 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-200">
                  Blur Intensity
                </label>
                <span className="text-sm font-mono text-gray-400 glass-dark px-2 py-1 rounded-lg">
                  {blurIntensity}px
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={blurIntensity}
                onChange={(e) => onBlurIntensityChange(Number(e.target.value))}
                className="w-full slider"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Light Blur</span>
                <span>Heavy Blur</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-200">
                  Detection Sensitivity
                </label>
                <span className="text-sm font-mono text-gray-400 glass-dark px-2 py-1 rounded-lg">
                  {Math.round(detectionConfidence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={detectionConfidence}
                onChange={(e) => onDetectionConfidenceChange(Number(e.target.value))}
                className="w-full slider"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>More Faces</span>
                <span>Fewer False Positives</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status - Expandable */}
      <div className="glass-premium rounded-2xl overflow-hidden card-hover">
        <button
          onClick={() => toggleSection('systemStatus')}
          className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 gradient-bg rounded-lg shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              System Status
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isProcessing ? 'bg-green-400' : 'bg-gray-500'
              }`}></div>
              <span className="text-xs text-gray-400 font-medium">
                {isProcessing ? 'Active' : 'Standby'}
              </span>
            </div>
            {expandedSections.systemStatus ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>
        
        <div className={`expandable-content ${expandedSections.systemStatus ? 'expanded' : 'collapsed'}`}>
          <div className="px-5 pb-5 space-y-3">
            <div className="flex justify-between items-center glass-dark rounded-lg p-3">
              <span className="text-sm font-medium text-gray-300">Processing</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full status-dot ${
                  isProcessing ? 'bg-green-400 active' : 'bg-gray-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  isProcessing ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {isProcessing ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center glass-dark rounded-lg p-3">
              <span className="text-sm font-medium text-gray-300">AI Acceleration</span>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">
                  WebGL + GPU
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center glass-dark rounded-lg p-3">
              <span className="text-sm font-medium text-gray-300">Privacy Mode</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full status-dot active"></div>
                <span className="text-sm font-medium text-green-400">
                  100% Local
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center glass-dark rounded-lg p-3">
              <span className="text-sm font-medium text-gray-300">Data Storage</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full status-dot active"></div>
                <span className="text-sm font-medium text-green-400">
                  Browser Only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Expandable */}
      <div className="glass-premium rounded-2xl overflow-hidden card-hover">
        <button
          onClick={() => toggleSection('quickActions')}
          className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors duration-300"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 gradient-bg rounded-lg shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Quick Actions
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="glass-dark px-2 py-1 rounded-lg">
              <span className="text-xs text-gray-400 font-medium">
                3 presets
              </span>
            </div>
            {expandedSections.quickActions ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>
        
        <div className={`expandable-content ${expandedSections.quickActions ? 'expanded' : 'collapsed'}`}>
          <div className="px-5 pb-5 space-y-3">
            <button 
              onClick={() => {
                onBlurIntensityChange(15);
                onDetectionConfidenceChange(0.7);
              }}
              className="w-full btn-secondary px-4 py-3 rounded-xl text-sm font-medium text-left text-white hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex items-center justify-between">
                <span>Reset to Defaults</span>
                <span className="text-xs text-gray-400">15px • 70%</span>
              </div>
            </button>
            <button 
              onClick={() => onDetectionConfidenceChange(0.5)}
              className="w-full btn-secondary px-4 py-3 rounded-xl text-sm font-medium text-left text-white hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex items-center justify-between">
                <span>High Sensitivity Mode</span>
                <span className="text-xs text-gray-400">50% confidence</span>
              </div>
            </button>
            <button 
              onClick={() => onBlurIntensityChange(30)}
              className="w-full btn-secondary px-4 py-3 rounded-xl text-sm font-medium text-left text-white hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex items-center justify-between">
                <span>Maximum Privacy Mode</span>
                <span className="text-xs text-gray-400">30px blur</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};