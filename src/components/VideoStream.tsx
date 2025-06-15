import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Play, Pause, AlertCircle, Zap, Activity } from 'lucide-react';

interface VideoStreamProps {
  streamUrl: string;
  faceDatabase: Array<{id: string, name: string, descriptor: Float32Array, image: string}>;
  blurIntensity: number;
  detectionConfidence: number;
  onProcessingChange: (processing: boolean) => void;
  autoStart?: boolean;
}

export const VideoStream: React.FC<VideoStreamProps> = ({
  streamUrl,
  faceDatabase,
  blurIntensity,
  detectionConfidence,
  onProcessingChange,
  autoStart = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const lastDetectionsRef = React.useRef<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>[]>([]);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [detectionStats, setDetectionStats] = useState({
    fps: 0,
    facesDetected: 0,
    facesBlurred: 0
  });
  const [mjpegStreamUrl, setMjpegStreamUrl] = useState<string | null>(null);
  const [isBackendStream, setIsBackendStream] = useState(false);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models/tiny_face_detector_model'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models/face_landmark_68_model'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models/face_recognition_model'),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Model loading error:', err);
        setError('Failed to load face detection models. Please ensure model files are in /public/models/');
      }
    };
    loadModels();
  }, []);

  React.useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;
    let stopped = false;
    const detectLoop = async () => {
      while (!stopped) {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: detectionConfidence }))
            .withFaceLandmarks()
            .withFaceDescriptors();
          lastDetectionsRef.current = detections;
        }
        await new Promise(res => setTimeout(res, 200));
      }
    };
    detectLoop();
    return () => { stopped = true; };
  }, [modelsLoaded, detectionConfidence]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw rectangles for cached detections
    let blurredCount = 0;
    const detections = lastDetectionsRef.current;
    for (const detection of detections) {
      const { box } = detection.detection;
      let shouldBlur = false;
      if (faceDatabase.length > 0) {
        const faceDescriptor = detection.descriptor;
        for (const knownFace of faceDatabase) {
          const distance = faceapi.euclideanDistance(faceDescriptor, knownFace.descriptor);
          if (distance < 0.6) {
            shouldBlur = true;
            break;
          }
        }
      }
      if (shouldBlur) {
        ctx.save();
          ctx.filter = 'blur(12px)';
          ctx.drawImage(
            canvas,
            box.x, box.y, box.width, box.height,
            box.x, box.y, box.width, box.height
          );
          ctx.restore();
        blurredCount++; 
      }
      ctx.strokeStyle = shouldBlur ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
    setDetectionStats(ds => ({ ...ds, facesBlurred: blurredCount, facesDetected: detections.length }));
  }, [modelsLoaded, faceDatabase, detectionConfidence]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && modelsLoaded) {
      const animate = () => {
        processFrame();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
      onProcessingChange(true);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      onProcessingChange(false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, modelsLoaded, processFrame, onProcessingChange]);

  const isYouTubeOrTwitch = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be') || url.includes('twitch.tv');

  // Helper to convert descriptors for backend
  const getDescriptorArrays = () => faceDatabase.map(face => Array.from(face.descriptor));

  const validateStreamUrl = (url: string): { valid: boolean; message?: string } => {
    if (url === 'webcam') return { valid: true };
    // Remove block for YouTube/Twitch, allow all URLs
    // Check for supported formats
    const supportedExtensions = ['.mp4', '.webm', '.ogg', '.m3u8'];
    const hasValidExtension = supportedExtensions.some(ext => url.toLowerCase().includes(ext));
    if (url.startsWith('http') && !hasValidExtension && !isYouTubeOrTwitch(url)) {
      return {
        valid: false,
        message: 'URL should point to a direct video file (.mp4, .webm, .ogg) or HLS stream (.m3u8)'
      };
    }
    return { valid: true };
  };

  const startStream = async () => {
    if (!streamUrl) {
      setError('Please enter a stream URL or select webcam');
      return;
    }
    const validation = validateStreamUrl(streamUrl);
    if (!validation.valid) {
      setError(validation.message || 'Invalid stream URL');
      return;
    }
    try {
      setError('');
      if (isYouTubeOrTwitch(streamUrl)) {
        // Use backend for YouTube/Twitch
        setIsBackendStream(true);
        setIsPlaying(true);
        // POST descriptors and URL to backend
        const descriptors = getDescriptorArrays();
        const payload = { url: streamUrl, descriptors };
        // For demo, use a unique session id (timestamp)
        const sessionId = Date.now().toString();
        // Option 1: Use GET with base64 descriptors (not recommended for large data)
        // Option 2: Use POST, then display <img src="/video_feed?session=..."> if backend supports session
        // For now, just POST and use a static endpoint
        await fetch('http://localhost:5001/video_feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setMjpegStreamUrl(`http://localhost:5001/video_feed`); // If backend supports session, append ?session=...
      } else if (streamUrl === 'webcam') {
        setIsBackendStream(false);
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'user'
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          streamRef.current = stream;
          setIsPlaying(true);
        }
      } else {
        setIsBackendStream(false);
        // For direct video URLs
        if (videoRef.current) {
          videoRef.current.src = streamUrl;
          videoRef.current.crossOrigin = 'anonymous';
          await videoRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start stream: ${errorMessage}`);
    }
  };

  const stopStream = () => {
    if (isBackendStream) {
      setMjpegStreamUrl(null);
      setIsBackendStream(false);
      setIsPlaying(false);
      return;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsPlaying(false);
  };

  // Update canvas size when video loads
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    }
  };

  // Auto-start logic
  React.useEffect(() => {
    if (autoStart && !isPlaying && modelsLoaded && streamUrl) {
      startStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, modelsLoaded]);

  return (
    <div className="h-full flex flex-col">
      {/* Compact Video Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 gradient-bg-dark rounded-lg shadow-lg">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stream Processing
          </h2>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {modelsLoaded ? (
            <div className="flex items-center text-green-400 text-xs sm:text-sm glass-dark px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <Zap className="h-2 w-2 sm:h-3 sm:w-3 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">AI Ready</span>
              <span className="sm:hidden">Ready</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-400 text-xs sm:text-sm glass-dark px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="animate-spin h-2 w-2 sm:h-3 sm:w-3 border-2 border-amber-400 border-t-transparent rounded-full mr-1 sm:mr-2"></div>
              <span className="hidden sm:inline">Loading...</span>
              <span className="sm:hidden">...</span>
            </div>
          )}
          
          <button
            onClick={isPlaying ? stopStream : startStream}
            disabled={!modelsLoaded}
            className="btn-primary flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isPlaying ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Video Container - Responsive Height */}
      <div className="relative z-0 flex-1 bg-gradient-to-br from-black to-gray-900 min-h-[250px] sm:min-h-[350px]">
        {isBackendStream && isPlaying && mjpegStreamUrl ? (
          <img
            src={mjpegStreamUrl}
            alt="Live Stream"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: 1 }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain opacity-0"
              onLoadedMetadata={handleVideoLoadedMetadata}
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ zIndex: 1 }}
            />
          </>
        )}
        
        {/* Compact Real-time Stats Overlay */}
        {isPlaying && (
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 glass-premium rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">FPS</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-gray-300">{detectionStats.fps}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Found</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-green-400">{detectionStats.facesDetected}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Blur</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-red-400">{detectionStats.facesBlurred}</div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Processing Status */}
        {isPlaying && (
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 glass-premium rounded-lg p-1.5 sm:p-2 backdrop-blur-xl">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse status-dot active"></div>
              <span className="text-green-400 font-medium text-xs">Live</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="glass-premium rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-start space-x-3 max-w-sm sm:max-w-md backdrop-blur-xl border border-red-400/30">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-400 mb-2 text-sm sm:text-base">Stream Error</div>
                <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder */}
        {!isPlaying && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="glass-premium rounded-xl sm:rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
                <Play className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400 opacity-50" />
                <h3 className="text-lg sm:text-xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Process
                </h3>
                <p className="text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">Configure your stream source and click Start</p>
                {!modelsLoaded && (
                  <div className="flex items-center justify-center space-x-2 text-amber-400">
                    <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                    <span className="text-xs sm:text-sm">Loading AI models...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};