import React, { useState } from 'react';
import { VideoStream } from './components/VideoStream';
import { FaceManager } from './components/FaceManager';
import { ControlPanel } from './components/ControlPanel';
import { StatusBar } from './components/StatusBar';
import { LiveCamera } from './components/LiveCamera';
import { Gallery } from './components/Gallery';
import { Settings, Users, Monitor, Camera, Image } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'camera' | 'faces' | 'gallery' | 'settings'>('stream');
  const [streamUrl, setStreamUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(15);
  const [detectionConfidence, setDetectionConfidence] = useState(0.7);
  const [faceDatabase, setFaceDatabase] = useState<Array<{id: string, name: string, descriptor: Float32Array, image: string}>>([]);
  const [gallery, setGallery] = useState<Array<{id: string, image: string, timestamp: Date, facesDetected: number}>>([]);

  const tabs = [
    { id: 'stream', label: 'Live Stream', icon: Monitor },
    { id: 'camera', label: 'Live Camera', icon: Camera },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'faces', label: 'Face Database', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="layout-container text-white font-['Inter'] relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900/50 to-gray-800/30"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(64,64,64,0.15),transparent_50%)]"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(128,128,128,0.1),transparent_50%)]"></div>
      
      {/* Optimized Header */}
      <header className="relative z-10 header-glass px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <h1 className="brand-text text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-white">live</span>
                <span className="text-gray-400">.</span>
                <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">blur</span>
              </h1>
            </div>
          </div>
          <div className="hidden sm:block">
            <StatusBar 
              isProcessing={isProcessing}
              faceCount={faceDatabase.length}
              streamConnected={!!streamUrl}
            />
          </div>
        </div>
      </header>

      {/* Optimized Navigation Tabs */}
      <nav className="relative z-10 nav-glass px-4 sm:px-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`nav-tab flex items-center space-x-2 sm:space-x-3 px-3 sm:px-6 py-3 sm:py-4 rounded-t-xl transition-all duration-300 relative group ${
                    isActive
                      ? 'active glass-premium text-white'
                      : 'text-gray-400 hover:text-white hover:bg-black/20'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors duration-300 ${
                    isActive ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-300'
                  }`} />
                  <span className="font-medium tracking-wide text-sm sm:text-base">{tab.label}</span>
                  
                  {/* Gallery badge */}
                  {tab.id === 'gallery' && gallery.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {gallery.length}
                    </div>
                  )}
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-t-xl bg-gradient-to-r from-gray-600/10 to-gray-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              );
            })}
          </div>
          
          {/* Navigation bottom border effect */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/50 to-transparent"></div>
        </div>
      </nav>

      {/* Mobile Status Bar */}
      <div className="sm:hidden relative z-10 px-4 py-2 flex-shrink-0">
        <StatusBar 
          isProcessing={isProcessing}
          faceCount={faceDatabase.length}
          streamConnected={!!streamUrl}
        />
      </div>

      {/* Optimized Main Content with consistent height */}
      <main className="content-area relative z-10 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto h-full">
          <div className="main-content-container">
            {activeTab === 'stream' && (
              <div className="tab-content">
                <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-full">
                  {/* Video Stream - Full width on mobile, 3/4 on desktop */}
                  <div className="lg:col-span-3 order-1 lg:order-1">
                    <div className="glass-premium rounded-2xl overflow-hidden card-hover h-full min-h-[300px] sm:min-h-[400px]">
                      <VideoStream
                        streamUrl={streamUrl}
                        faceDatabase={faceDatabase}
                        blurIntensity={blurIntensity}
                        detectionConfidence={detectionConfidence}
                        onProcessingChange={setIsProcessing}
                        autoStart={streamUrl === 'webcam'}
                      />
                    </div>
                  </div>
                  
                  {/* Control Panel - Below video on mobile, sidebar on desktop */}
                  <div className="lg:col-span-1 order-2 lg:order-2">
                    <ControlPanel
                      streamUrl={streamUrl}
                      onStreamUrlChange={setStreamUrl}
                      blurIntensity={blurIntensity}
                      onBlurIntensityChange={setBlurIntensity}
                      detectionConfidence={detectionConfidence}
                      onDetectionConfidenceChange={setDetectionConfidence}
                      isProcessing={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="tab-content">
                <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-full">
                  {/* Live Camera - Full width on mobile, 3/4 on desktop */}
                  <div className="lg:col-span-3 order-1 lg:order-1">
                    <div className="glass-premium rounded-2xl overflow-hidden card-hover h-full min-h-[300px] sm:min-h-[400px]">
                      <LiveCamera
                        faceDatabase={faceDatabase}
                        onFaceDatabaseChange={setFaceDatabase}
                        gallery={gallery}
                        onGalleryChange={setGallery}
                        blurIntensity={blurIntensity}
                        detectionConfidence={detectionConfidence}
                      />
                    </div>
                  </div>
                  
                  {/* Control Panel - Below camera on mobile, sidebar on desktop */}
                  <div className="lg:col-span-1 order-2 lg:order-2">
                    <ControlPanel
                      streamUrl={streamUrl}
                      onStreamUrlChange={setStreamUrl}
                      blurIntensity={blurIntensity}
                      onBlurIntensityChange={setBlurIntensity}
                      detectionConfidence={detectionConfidence}
                      onDetectionConfidenceChange={setDetectionConfidence}
                      isProcessing={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="tab-content">
                <div className="glass-premium rounded-2xl p-4 sm:p-6 card-hover h-full overflow-auto">
                  <Gallery
                    gallery={gallery}
                    onGalleryChange={setGallery}
                    faceDatabase={faceDatabase}
                    onFaceDatabaseChange={setFaceDatabase}
                  />
                </div>
              </div>
            )}

            {activeTab === 'faces' && (
              <div className="tab-content">
                <div className="glass-premium rounded-2xl p-4 sm:p-6 card-hover h-full overflow-auto">
                  <FaceManager
                    faceDatabase={faceDatabase}
                    onFaceDatabaseChange={setFaceDatabase}
                  />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-content">
                <div className="glass-premium rounded-2xl p-4 sm:p-6 card-hover h-full overflow-auto">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 gradient-bg-charcoal rounded-lg shadow-lg">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                        Application Settings
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="glass-dark rounded-xl p-4 sm:p-5">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">Processing Quality</label>
                        <select className="w-full glass-input rounded-lg px-4 py-3 text-white focus:outline-none transition-all duration-300">
                          <option className="bg-gray-900">High Quality (Slower)</option>
                          <option className="bg-gray-900">Balanced</option>
                          <option className="bg-gray-900">Performance (Faster)</option>
                        </select>
                      </div>
                      
                      <div className="glass-dark rounded-xl p-4 sm:p-5">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">Privacy Mode</label>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded glass-input w-4 h-4" defaultChecked />
                          <span className="text-sm text-gray-300">Enable local processing only</span>
                        </div>
                      </div>
                      
                      <div className="glass-dark rounded-xl p-4 sm:p-5">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">Export Face Database</label>
                        <button className="btn-secondary px-6 py-3 rounded-lg font-medium">
                          Download Database
                        </button>
                      </div>

                      <div className="glass-dark rounded-xl p-4 sm:p-5">
                        <h3 className="font-semibold mb-4 text-gray-200">Performance Status</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 font-medium">GPU Acceleration</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full status-dot active"></div>
                              <span className="text-xs font-semibold text-green-400">Enabled</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 font-medium">WebGL Support</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full status-dot active"></div>
                              <span className="text-xs font-semibold text-green-400">Available</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 font-medium">Memory Usage</span>
                            <span className="text-xs font-semibold text-gray-400">Optimized</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 glass-dark rounded-xl p-4 sm:p-5">
                        <h3 className="font-semibold mb-4 text-gray-200">Advanced Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">Detection Frequency</label>
                            <select className="w-full glass-input rounded-lg px-3 py-2 text-white text-sm">
                              <option className="bg-gray-900">Every 200ms (Default)</option>
                              <option className="bg-gray-900">Every 100ms (High)</option>
                              <option className="bg-gray-900">Every 500ms (Low)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">Model Size</label>
                            <select className="w-full glass-input rounded-lg px-3 py-2 text-white text-sm">
                              <option className="bg-gray-900">Tiny (Fast)</option>
                              <option className="bg-gray-900">Small (Balanced)</option>
                              <option className="bg-gray-900">Medium (Accurate)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Optimized Footer */}
      <footer className="relative z-10 footer-glass px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-sm text-gray-400 text-center sm:text-left">
              <span className="font-medium text-gray-300">live.blur</span> • Real-time privacy protection
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full status-dot active"></div>
              <span className="text-xs text-green-400 font-medium">100% Local Processing</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6 text-xs text-gray-500">
            <span>Built with AI • Privacy First</span>
            <span>© 2025</span>
          </div>
        </div>
      </footer>

      {/* Enhanced floating particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/10 rounded-full float-animation" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-white/10 rounded-full float-animation" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-2/3 left-2/3 w-1 h-1 bg-white/10 rounded-full float-animation" style={{animationDelay: '5s'}}></div>
      </div>
    </div>
  );
}

export default App;