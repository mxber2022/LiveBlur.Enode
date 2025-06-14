import React, { useState } from 'react';
import * as faceapi from 'face-api.js';
import { Image as ImageIcon, Download, Trash2, UserPlus, Calendar, Eye, Grid, List, Search, Filter, Check, X } from 'lucide-react';
import { custom, useAccount, useWalletClient } from 'wagmi';
import { uploadJSONToIPFS } from '../utils/uploadJSONToIPFS';
import { createHash } from 'crypto';
import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';

interface GalleryItem {
  id: string;
  image: string;
  timestamp: Date;
  facesDetected: number;
}

interface GalleryProps {
  gallery: GalleryItem[];
  onGalleryChange: (gallery: GalleryItem[]) => void;
  faceDatabase: Array<{id: string, name: string, descriptor: Float32Array, image: string}>;
  onFaceDatabaseChange: (database: Array<{id: string, name: string, descriptor: Float32Array, image: string}>) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  gallery,
  onGalleryChange,
  faceDatabase,
  onFaceDatabaseChange
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'faces'>('newest');
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [showNftModal, setShowNftModal] = useState(false);
  const [nftMeta, setNftMeta] = useState({ name: '', description: '' });
  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftAttributes, setNftAttributes] = useState<Array<{trait_type: string, value: string}>>([]);
  const { address } = useAccount();
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<{ txHash: string; ipId: string } | null>(null);

  const filteredGallery = gallery
    .filter(item => {
      if (!searchTerm) return true;
      const date = item.timestamp.toLocaleDateString();
      const time = item.timestamp.toLocaleTimeString();
      return date.includes(searchTerm) || time.includes(searchTerm);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp.getTime() - a.timestamp.getTime();
        case 'oldest':
          return a.timestamp.getTime() - b.timestamp.getTime();
        case 'faces':
          return b.facesDetected - a.facesDetected;
        default:
          return 0;
      }
    });

  const addtoStory = (item: GalleryItem) => {
    setNftImage(item.image);
    setShowNftModal(true);
    setNftAttributes([]);
  };
  const { data: wallet } = useWalletClient();

  async function setupStoryClient(): Promise<StoryClient> {
    const config: StoryConfig = {
      wallet: wallet,
      transport: custom(wallet!.transport),
      chainId: "aeneid",
    };
    const client = StoryClient.newClient(config);
    return client;
  }
  const handleAttributeChange = (idx: number, field: 'trait_type' | 'value', value: string) => {
    setNftAttributes(attrs => attrs.map((attr, i) => i === idx ? { ...attr, [field]: value } : attr));
  };

  const addAttribute = () => {
    setNftAttributes(attrs => [...attrs, { trait_type: '', value: '' }]);
  };

  const removeAttribute = (idx: number) => {
    setNftAttributes(attrs => attrs.filter((_, i) => i !== idx));
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (selectedItems.size === filteredGallery.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredGallery.map(item => item.id)));
    }
  };

  const deleteSelected = () => {
    const newGallery = gallery.filter(item => !selectedItems.has(item.id));
    onGalleryChange(newGallery);
    setSelectedItems(new Set());
  };

  const downloadSelected = () => {
    selectedItems.forEach(id => {
      const item = gallery.find(g => g.id === id);
      if (item) {
        const link = document.createElement('a');
        link.href = item.image;
        link.download = `capture-${item.timestamp.toISOString().split('T')[0]}-${id}.jpg`;
        link.click();
      }
    });
  };

  const addToFaceDatabase = async (item: GalleryItem) => {
    setProcessing(prev => new Set([...prev, item.id]));
    
    try {
      // Create a temporary image element to process
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.image;
      });

      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        const newFaces = detections.map((detection, index) => ({
          id: `${item.id}_face_${index}`,
          name: `Gallery_${item.timestamp.toLocaleDateString()}_${index + 1}`,
          descriptor: detection.descriptor,
          image: item.image
        }));
        
        onFaceDatabaseChange([...faceDatabase, ...newFaces]);
      }
    } catch (err) {
      console.error('Face processing error:', err);
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 gradient-bg-dark rounded-lg shadow-lg">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Photo Gallery
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              {gallery.length} photo{gallery.length !== 1 ? 's' : ''} captured
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-3">
          <div className="glass-dark rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="glass-dark rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="newest" className="bg-gray-900">Newest First</option>
              <option value="oldest" className="bg-gray-900">Oldest First</option>
              <option value="faces" className="bg-gray-900">Most Faces</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="mt-4 flex items-center justify-between glass-premium rounded-lg p-3">
            <span className="text-sm text-gray-300">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadSelected}
                className="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Download</span>
              </button>
              <button
                onClick={deleteSelected}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-3 py-1.5 rounded-lg text-sm text-red-400 flex items-center space-x-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Content */}
      {filteredGallery.length === 0 ? (
        <div className="glass-dark rounded-2xl p-12 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-bold mb-2 text-gray-400">No Photos Yet</h3>
          <p className="text-gray-500 mb-4">
            {gallery.length === 0 
              ? "Capture photos using the Live Camera to see them here"
              : "No photos match your search criteria"
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="btn-secondary px-4 py-2 rounded-lg text-sm"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center justify-between">
            <button
              onClick={selectAll}
              className="text-sm text-gray-400 hover:text-white flex items-center space-x-2"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selectedItems.size === filteredGallery.length 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'border-gray-400'
              }`}>
                {selectedItems.size === filteredGallery.length && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <span>
                {selectedItems.size === filteredGallery.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            <span className="text-sm text-gray-400">
              {filteredGallery.length} photo{filteredGallery.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Gallery Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className={`glass-dark rounded-xl overflow-hidden group card-hover relative ${
                    selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleSelection(item.id)}
                    className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedItems.has(item.id) 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-white/50'
                    }`}>
                      {selectedItems.has(item.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </button>

                  {/* Image */}
                  <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 relative">
                    <img
                      src={item.image}
                      alt={`Capture ${item.id}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                      <button
                        onClick={() => addToFaceDatabase(item)}
                        disabled={processing.has(item.id)}
                        className="btn-primary p-2 rounded-lg"
                        title="Add faces to database"
                      >
                        {processing.has(item.id) ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <UserPlus className="h-4 w-4" onClick={() => addtoStory(item)} />
                        )}
                      </button>
                      
                      <a
                        href={item.image}
                        download={`capture-${item.timestamp.toISOString().split('T')[0]}-${item.id}.jpg`}
                        className="btn-secondary p-2 rounded-lg"
                        title="Download photo"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        {item.timestamp.toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-3 w-3 text-green-400" />
                      <span className="text-xs text-green-400 font-medium">
                        {item.facesDetected} face{item.facesDetected !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className={`glass-dark rounded-xl p-4 flex items-center space-x-4 card-hover ${
                    selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleSelection(item.id)}
                    className="flex-shrink-0"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedItems.has(item.id) 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-400'
                    }`}>
                      {selectedItems.has(item.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </button>

                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={`Capture ${item.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white font-medium">
                        {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">
                        {item.facesDetected} face{item.facesDetected !== 1 ? 's' : ''} detected
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => addToFaceDatabase(item)}
                      disabled={processing.has(item.id)}
                      className="btn-primary p-2 rounded-lg"
                      title="Add faces to database"
                    >
                      {processing.has(item.id) ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </button>
                    
                    <a
                      href={item.image}
                      download={`capture-${item.timestamp.toISOString().split('T')[0]}-${item.id}.jpg`}
                      className="btn-secondary p-2 rounded-lg"
                      title="Download photo"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* NFT Metadata Modal */}
      {showNftModal && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-premium relative w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl animate-fade-in">
            {/* Close Button */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setShowNftModal(false);
                setNftMeta({ name: '', description: '' });
                setNftImage(null);
                setNftAttributes([]);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <h2 className="text-2xl font-bold text-center text-white mb-6">NFT Metadata</h2>

            {/* NFT Image Preview */}
            {/* {nftImage && (
              <img
                src={nftImage}
                alt="NFT Preview"
                className="mx-auto mb-6 w-32 h-32 object-cover rounded-lg border border-white/10 shadow"
              />
            )} */}

            {/* Form */}
            <form
              onSubmit={async e => {
                e.preventDefault();
                setMinting(true);
                setMintError(null);
                setMintSuccess(null);
                if (!address || !address.startsWith('0x')) {
                  setMintError('Wallet not connected. Please connect your wallet.');
                  setMinting(false);
                  return;
                }
                const safeAddress = address as `0x${string}`;
                try {
                  // 1. Gather metadata
                  const dataWithAttributes = {
                    title: nftMeta.name,
                    description: nftMeta.description,
                    image: nftImage,
                    attributes: nftAttributes,
                  };

                  // 2. Upload NFT metadata to IPFS
                  const ipfsmetadataRaw = await uploadJSONToIPFS(dataWithAttributes);
                  const ipfsmetadata = ipfsmetadataRaw ? String(ipfsmetadataRaw) : '';
                  const nftHash = `0x${createHash('sha256').update(JSON.stringify(dataWithAttributes)).digest('hex')}` as `0x${string}`;

                  // 3. Setup Story Protocol client
                  const client = await setupStoryClient();

                  // 4. Generate IP metadata
                  const ipMetadata = client.ipAsset.generateIpMetadata({
                    title: nftMeta.name,
                    description: nftMeta.description,
                    createdAt: new Date().getTime().toString(),
                    creators: [
                      {
                        name: safeAddress,
                        address: safeAddress,
                        contributionPercent: 100,
                      },
                    ],
                    image: nftImage as string,
                    imageHash: nftHash,
                    mediaUrl: nftImage as string,
                    mediaHash: nftHash,
                    mediaType: 'image/jpeg',
                  });

                  // 5. Upload IP metadata to IPFS
                  const ipIpfsHashRaw = await uploadJSONToIPFS(ipMetadata);
                  const ipIpfsHash = ipIpfsHashRaw ? String(ipIpfsHashRaw) : '';
                  const ipHash = `0x${createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex')}` as `0x${string}`;

                  // 6. Mint and register IP
                  const response = await client.ipAsset.mintAndRegisterIp({
                    spgNftContract: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc',
                    ipMetadata: {
                      ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                      ipMetadataHash: ipHash,
                      nftMetadataURI: `https://ipfs.io/ipfs/${ipfsmetadata}`,
                      nftMetadataHash: nftHash,
                    }
                  });

                  setMintSuccess({ txHash: String(response.txHash), ipId: String(response.ipId) });
                  // Optionally reset form fields
                  setNftMeta({ name: '', description: '' });
                  setNftImage(null);
                  setNftAttributes([]);
                } catch (err: any) {
                  setMintError(err?.message || 'Minting failed');
                  console.error(err);
                }
                setMinting(false);
              }}
              className="space-y-5"
            >
              {/* Name (Horizontal) */}
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-gray-200">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={nftMeta.name}
                  onChange={e => setNftMeta(meta => ({ ...meta, name: e.target.value }))}
                  className="flex-1 rounded-lg bg-black/30 text-white px-4 py-2 placeholder-gray-400 border border-white/20"
                  required
                />
              </div>

              {/* Description (Horizontal) */}
              <div className="flex items-start gap-4">
                <label className="w-24 pt-2 text-sm font-medium text-gray-200">Description</label>
                <textarea
                  rows={3}
                  placeholder="Description"
                  value={nftMeta.description}
                  onChange={e => setNftMeta(meta => ({ ...meta, description: e.target.value }))}
                  className="flex-1 rounded-lg bg-black/30 text-white px-4 py-2 placeholder-gray-400 border border-white/20 "
                  required
                />
              </div>

              {/* Attributes */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Attributes</label>
                <div className="space-y-3">
                  {nftAttributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Trait Type"
                        value={attr.trait_type}
                        onChange={e => handleAttributeChange(idx, 'trait_type', e.target.value)}
                        className="flex-1 rounded-lg bg-black/30 text-white px-3 py-2 placeholder-gray-400 border border-white/20"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={attr.value}
                        onChange={e => handleAttributeChange(idx, 'value', e.target.value)}
                        className="flex-1 rounded-lg bg-black/30 text-white px-3 py-2 placeholder-gray-400 border border-white/20 "
                      />
                      <button
                        type="button"
                        onClick={() => removeAttribute(idx)}
                        className="text-red-400 hover:text-red-600 text-xl font-bold px-2"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="text-sm font-medium text-blue-400 hover:text-blue-200"
                  >
                    + Add Attribute
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-4 pt-4">
                {minting && <div className="text-blue-400 text-sm text-center">Minting IP, please wait...</div>}
                {mintError && <div className="text-red-400 text-sm text-center">{mintError}</div>}
                {mintSuccess && (
                  <div className="text-green-400 text-sm text-center space-y-2">
                    <div>IP Minted!</div>
                    <div>
                       <a
                        href={`https://aeneid.explorer.story.foundation/ipa/${encodeURIComponent(mintSuccess.ipId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-300 hover:text-blue-400"
                      >
                        Link
                      </a>
                    </div>
                    {/* <div className="text-xs text-gray-400 break-all">Tx Hash: {mintSuccess.txHash}</div> */}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary px-6 py-2 rounded-lg font-medium text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={minting}
                >
                  MintIP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNftModal(false);
                    setNftMeta({ name: '', description: '' });
                    setNftImage(null);
                    setNftAttributes([]);
                  }}
                  className="btn-secondary px-6 py-2 rounded-lg font-medium text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};