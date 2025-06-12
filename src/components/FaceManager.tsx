import React, { useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { Upload, Trash2, User, Database, AlertCircle, Check, Download, FileUp, Sparkles } from 'lucide-react';

interface FaceManagerProps {
  faceDatabase: Array<{id: string, name: string, descriptor: Float32Array, image: string}>;
  onFaceDatabaseChange: (database: Array<{id: string, name: string, descriptor: Float32Array, image: string}>) => void;
}

export const FaceManager: React.FC<FaceManagerProps> = ({
  faceDatabase,
  onFaceDatabaseChange
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File, name: string): Promise<{descriptor: Float32Array, image: string} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = async () => {
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            // Convert image to base64 for storage
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            resolve({
              descriptor: detection.descriptor,
              image: imageData
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Face processing error:', err);
          resolve(null);
        }
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (files: FileList) => {
    setProcessing(true);
    setError('');

    const newFaces: Array<{id: string, name: string, descriptor: Float32Array, image: string}> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const name = file.name.split('.')[0];
      const result = await processImage(file, name);
      
      if (result) {
        newFaces.push({
          id: Date.now() + i + '',
          name,
          descriptor: result.descriptor,
          image: result.image
        });
      }
    }

    if (newFaces.length === 0) {
      setError('No faces detected in the uploaded images');
    } else {
      onFaceDatabaseChange([...faceDatabase, ...newFaces]);
    }

    setProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFace = (id: string) => {
    onFaceDatabaseChange(faceDatabase.filter(face => face.id !== id));
  };

  const exportDatabase = () => {
    const dataStr = JSON.stringify(faceDatabase, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'face-database.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Convert descriptors to Float32Array
          const fixed = data.map(face => ({
            ...face,
            descriptor: new Float32Array(face.descriptor)
          }));
          onFaceDatabaseChange(fixed);
        }
      } catch (err) {
        setError('Invalid database file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 gradient-bg-dark rounded-lg shadow-lg">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Face Database
            </h2>
            <p className="text-gray-400 mt-1 text-sm">Manage faces to be protected in the livestream</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportDatabase}
            disabled={faceDatabase.length === 0}
            className="btn-secondary flex items-center space-x-2 px-4 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <input
            type="file"
            accept=".json"
            onChange={importDatabase}
            className="hidden"
            id="import-db"
          />
          <label
            htmlFor="import-db"
            className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-xl font-medium cursor-pointer text-sm"
          >
            <FileUp className="h-4 w-4" />
            <span>Import</span>
          </label>
        </div>
      </div>

      {/* Compact Upload Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
          dragOver
            ? 'border-gray-400 glass-premium scale-105'
            : 'border-gray-600 glass-dark hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {processing ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="animate-spin h-10 w-10 border-4 border-gray-500 border-t-transparent rounded-full mx-auto"></div>
              <Sparkles className="h-5 w-5 text-gray-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-gray-400 font-medium">Processing images with AI...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-5 w-5 text-gray-400 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Upload Face Images
              </p>
              <p className="text-gray-400 mb-3 text-sm">Drag & drop or click to select images</p>
              <div className="glass-dark rounded-lg p-3 inline-block">
                <p className="text-xs text-gray-300">
                  Supported: JPG, PNG, WebP • AI will automatically detect faces
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-premium border border-red-400/30 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Face Database */}
      <div className="glass-premium rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 gradient-bg rounded-lg shadow-lg">
              <User className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Stored Faces ({faceDatabase.length})
            </h3>
          </div>
          {faceDatabase.length > 0 && (
            <div className="glass-dark px-3 py-1 rounded-lg">
              <span className="text-xs text-green-400 font-medium">
                {faceDatabase.length} face{faceDatabase.length !== 1 ? 's' : ''} ready
              </span>
            </div>
          )}
        </div>
        
        {faceDatabase.length === 0 ? (
          <div className="p-8 text-center">
            <div className="glass-dark rounded-2xl p-6 inline-block">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-500 opacity-50" />
              <p className="text-gray-400 text-base font-medium mb-2">No faces in database yet</p>
              <p className="text-xs text-gray-500">Upload images to get started with face protection</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {faceDatabase.map((face) => (
              <div key={face.id} className="glass-dark rounded-xl overflow-hidden group card-hover">
                <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 relative">
                  <img
                    src={face.image}
                    alt={face.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFace(face.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-3">
                  <p className="font-medium truncate text-white mb-2 text-sm">{face.name}</p>
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">AI Processed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};