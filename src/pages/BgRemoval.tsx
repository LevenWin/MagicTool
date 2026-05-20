import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Download, Trash2, Loader2, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function BgRemoval() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (source: File | Blob | string) => {
    setIsProcessing(true);
    setError(null);
    setProcessedUrl(null);

    try {
      let blobToProcess: Blob;
      let displayUrl: string;

      if (typeof source === 'string') {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(source)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('Failed to fetch image from URL');
        blobToProcess = await res.blob();
        displayUrl = URL.createObjectURL(blobToProcess);
      } else {
        blobToProcess = source;
        displayUrl = URL.createObjectURL(source);
      }

      setOriginalUrl(displayUrl);

      const resultBlob = await removeBackground(blobToProcess);
      const resultUrl = URL.createObjectURL(resultBlob);
      setProcessedUrl(resultUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while processing the image.');
      setOriginalUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcess(e.target.files[0]);
    }
  };

  const onUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      handleProcess(urlInput.trim());
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleProcess(file);
      } else {
        setError('Please drop a valid image file.');
      }
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleProcess(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing]);

  const reset = () => {
    setOriginalUrl(null);
    setProcessedUrl(null);
    setError(null);
    setUrlInput('');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Tools</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            Background Remover
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Remove AI Background
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Upload an image, paste from your clipboard, or provide a URL to instantly make backgrounds transparent.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!originalUrl && !isProcessing ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 ease-in-out bg-white",
                  isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-2xl flex items-center justify-center mb-6 text-neutral-600">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Click or drag an image here</h3>
                <p className="text-neutral-500 mb-6">Supports JPG, PNG, WebP. You can also paste (Ctrl+V).</p>
                
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-neutral-400">
                  <span className="w-12 h-px bg-neutral-200"></span>
                  OR
                  <span className="w-12 h-px bg-neutral-200"></span>
                </div>
              </div>

              <form onSubmit={onUrlSubmit} className="mt-6 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste an image URL..."
                    className="w-full pl-11 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="px-8 py-4 bg-neutral-900 text-white font-medium rounded-2xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Process
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium text-center border border-red-100">
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={reset}
                      className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-600"
                      title="Start over"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-neutral-700">
                      {isProcessing ? 'Processing Image...' : 'Result'}
                    </span>
                  </div>
                  {processedUrl && (
                    <a
                      href={processedUrl}
                      download="magiccut-result.png"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download HD
                    </a>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-100/50">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Original</div>
                    <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                      {originalUrl ? (
                        <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-neutral-400 flex flex-col items-center gap-2">
                          <ImageIcon className="w-8 h-8" />
                          <span>Loading original...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Removed Background</div>
                    <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm flex items-center justify-center checkerboard">
                      {isProcessing ? (
                        <div className="flex flex-col items-center gap-4 text-neutral-500">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <div className="text-sm font-medium animate-pulse">AI is working its magic...</div>
                        </div>
                      ) : processedUrl ? (
                        <img src={processedUrl} alt="Processed" className="w-full h-full object-contain" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <style>{`
        .checkerboard {
          background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}
