import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Download, Zap, Activity, AlertCircle, Check, X, Save, Image as ImageIcon } from 'lucide-react';

interface LiveCameraProps {
  faceDatabase: Array<{id: string, name: string, descriptor: Float32Array, image: string}>;
  onFaceDatabaseChange: (database: Array<{id: string, name: string, descriptor: Float32Array, image: string}>) => void;
  gallery: Array<{id: string, image: string, timestamp: Date, facesDetected: number}>;
  onGalleryChange: (gallery: Array<{id: string, image: string, timestamp: Date, facesDetected: number}>) => void;
  blurIntensity: number;
  detectionConfidence: number;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  faceDatabase,
  onFaceDatabaseChange,
  gallery,
  onGalleryChange,
  blurIntensity,
  detectionConfidence
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const lastDetectionsRef = useRef<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>[]>([]);
  
  const [isActive, setIsActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturing, setCapturing] = useState(false);
  const [showCaptureSuccess, setShowCaptureSuccess] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    facesDetected: 0,
    facesMatched: 0
  });

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
        setError('Failed to load face detection models');
      }
    };
    loadModels();
  }, []);

  // Face detection loop
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;
    let stopped = false;
    
    const detectLoop = async () => {
      while (!stopped) {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          try {
            const detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ 
                inputSize: 416, 
                scoreThreshold: detectionConfidence 
              }))
              .withFaceLandmarks()
              .withFaceDescriptors();
            lastDetectionsRef.current = detections;
          } catch (err) {
            console.error('Detection error:', err);
          }
        }
        await new Promise(res => setTimeout(res, 200));
      }
    };
    
    if (isActive) {
      detectLoop();
    }
    
    return () => { stopped = true; };
  }, [modelsLoaded, detectionConfidence, isActive]);

  // Process frame with face detection and blurring
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process cached detections
    let matchedCount = 0;
    const detections = lastDetectionsRef.current;
    
    for (const detection of detections) {
      const { box } = detection.detection;
      let isMatched = false;
      let matchedName = '';
      
      // Check if face matches any in database
      if (faceDatabase.length > 0) {
        const faceDescriptor = detection.descriptor;
        for (const knownFace of faceDatabase) {
          const distance = faceapi.euclideanDistance(faceDescriptor, knownFace.descriptor);
          if (distance < 0.6) {
            isMatched = true;
            matchedName = knownFace.name;
            matchedCount++;
            break;
          }
        }
      }

      if (isMatched) {
        // Apply blur effect for matched faces
        ctx.save();
        ctx.filter = `blur(${blurIntensity}px)`;
        ctx.drawImage(
          video,
          box.x, box.y, box.width, box.height,
          box.x, box.y, box.width, box.height
        );
        ctx.restore();

        // Draw red border for blurred faces
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw name label
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(box.x, box.y - 30, Math.max(80, matchedName.length * 8), 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(matchedName, box.x + 5, box.y - 10);
      } else {
        // Draw green border for unmatched faces
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw confidence score
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.fillRect(box.x, box.y - 25, 60, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Inter';
        ctx.fillText(
          `${Math.round(detection.detection.score * 100)}%`,
          box.x + 5,
          box.y - 10
        );
      }
    }
    
    setDetectionStats({ 
      facesDetected: detections.length,
      facesMatched: matchedCount
    });
  }, [modelsLoaded, faceDatabase, blurIntensity]);

  // Animation loop
  useEffect(() => {
    if (isActive && modelsLoaded) {
      const animate = () => {
        processFrame();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, modelsLoaded, processFrame]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Permission denied')) {
        setError('Camera access denied. Please allow camera permissions.');
      } else {
        setError(`Failed to start camera: ${errorMessage}`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsActive(false);
    setShowCaptureSuccess(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !captureCanvasRef.current) return;

    setCapturing(true);
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const photoData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Process faces in the captured photo to count them
    let facesDetected = 0;
    try {
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      facesDetected = detections.length;
    } catch (err) {
      console.error('Face detection error:', err);
    }
    
    // Add to gallery instead of face database
    const newGalleryItem = {
      id: Date.now().toString(),
      image: photoData,
      timestamp: new Date(),
      facesDetected
    };
    
    onGalleryChange([...gallery, newGalleryItem]);
    
    setShowCaptureSuccess(true);
    setTimeout(() => setShowCaptureSuccess(false), 3000);
    setCapturing(false);
  };

  const downloadLastPhoto = () => {
    if (gallery.length === 0) return;
    
    const lastPhoto = gallery[gallery.length - 1];
    const link = document.createElement('a');
    link.href = lastPhoto.image;
    link.download = `live-capture-${Date.now()}.jpg`;
    link.click();
  };

  const addLastPhotoToDatabase = async () => {
    if (gallery.length === 0) return;
    
    const lastPhoto = gallery[gallery.length - 1];
    
    // Create a temporary image element to process
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = lastPhoto.image;
    });

    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        const newFaces = detections.map((detection, index) => ({
          id: `${lastPhoto.id}_face_${index}`,
          name: `Gallery_${lastPhoto.timestamp.toLocaleDateString()}_${index + 1}`,
          descriptor: detection.descriptor,
          image: lastPhoto.image
        }));
        
        onFaceDatabaseChange([...faceDatabase, ...newFaces]);
      }
    } catch (err) {
      console.error('Face processing error:', err);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2 gradient-bg-dark rounded-lg shadow-lg">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Live Camera
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          {modelsLoaded ? (
            <div className="flex items-center text-green-400 text-sm glass-dark px-3 py-2 rounded-lg">
              <Zap className="h-3 w-3 mr-2" />
              AI Ready
            </div>
          ) : (
            <div className="flex items-center text-amber-400 text-sm glass-dark px-3 py-2 rounded-lg">
              <div className="animate-spin h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full mr-2"></div>
              Loading...
            </div>
          )}
          
          <button
            onClick={isActive ? stopCamera : startCamera}
            disabled={!modelsLoaded}
            className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isActive ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            <span>{isActive ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-gradient-to-br from-black to-gray-900 min-h-[300px]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          onLoadedMetadata={handleVideoLoadedMetadata}
          muted
          playsInline
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 10 }}
        />

        {/* Hidden capture canvas */}
        <canvas
          ref={captureCanvasRef}
          className="hidden"
        />

        {/* Stats Overlay */}
        {isActive && (
          <div className="absolute top-4 left-4 glass-premium rounded-lg p-3 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Detected</div>
                <div className="font-mono text-sm font-bold text-green-400">{detectionStats.facesDetected}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Blurred</div>
                <div className="font-mono text-sm font-bold text-red-400">{detectionStats.facesMatched}</div>
              </div>
            </div>
          </div>
        )}

        {/* Live Status */}
        {isActive && (
          <div className="absolute top-4 right-4 glass-premium rounded-lg p-2 backdrop-blur-xl">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium text-xs">LIVE</span>
            </div>
          </div>
        )}

        {/* Modern Capture Button */}
        {isActive && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex flex-col items-center space-y-2">
              {/* Main capture button */}
              <button
                onClick={capturePhoto}
                disabled={capturing}
                className="relative group"
              >
                {/* Outer ring */}
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-white/30 group-hover:border-white/50 transition-all duration-300 group-hover:scale-110"></div>
                
                {/* Inner button */}
                <div className="w-14 h-14 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-active:scale-95">
                  {capturing ? (
                    <div className="animate-spin h-6 w-6 border-2 border-gray-800 border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera className="h-6 w-6 text-gray-800" />
                  )}
                </div>
                
                {/* Pulse effect when not capturing */}
                {!capturing && (
                  <div className="absolute inset-0 w-16 h-16 rounded-full border border-white/20 animate-ping"></div>
                )}
              </button>
              
              {/* Label */}
              <div className="glass-dark px-3 py-1 rounded-full">
                <span className="text-white text-xs font-medium">
                  {capturing ? 'Capturing...' : 'Capture'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showCaptureSuccess && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-premium rounded-xl p-6 backdrop-blur-xl border border-green-400/30 z-50">
            <div className="flex items-center space-x-3">
              <Check className="h-8 w-8 text-green-400" />
              <div>
                <div className="font-bold text-green-400 text-lg">Photo Captured!</div>
                <div className="text-sm text-gray-300">Saved to Gallery</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="glass-premium rounded-xl p-6 flex items-start space-x-3 max-w-md backdrop-blur-xl border border-red-400/30">
              <AlertCircle className="h-5 w-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-400 mb-2">Camera Error</div>
                <div className="text-sm text-gray-300 leading-relaxed">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder */}
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="glass-premium rounded-2xl p-8 backdrop-blur-xl">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Live Camera Ready
                </h3>
                <p className="text-gray-400 mb-4">Capture photos and save them to your gallery</p>
                {!modelsLoaded && (
                  <div className="flex items-center justify-center space-x-2 text-amber-400">
                    <div className="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Loading AI models...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Capture Quick Preview */}
      {gallery.length > 0 && (
        <div className="border-t border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 gradient-bg-dark rounded-lg">
                  <ImageIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Last Capture</h4>
                  <p className="text-gray-400 text-xs">
                    {gallery[gallery.length - 1].facesDetected} face{gallery[gallery.length - 1].facesDetected !== 1 ? 's' : ''} detected
                  </p>
                </div>
              </div>
              
              <div className="glass-dark px-3 py-1 rounded-lg">
                <span className="text-green-400 font-medium text-xs">
                  {gallery.length} photo{gallery.length !== 1 ? 's' : ''} in gallery
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 glass-dark">
                <img
                  src={gallery[gallery.length - 1].image}
                  alt="Last capture"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Actions */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  onClick={downloadLastPhoto}
                  className="btn-secondary flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium text-xs"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </button>
                
                <button
                  onClick={addLastPhotoToDatabase}
                  className="btn-primary flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium text-xs"
                >
                  <Save className="h-3 w-3" />
                  <span>Add Faces</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};