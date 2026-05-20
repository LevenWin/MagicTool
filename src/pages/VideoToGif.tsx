import React, { useState, useRef } from 'react';
import { UploadCloud, Video, Trash2, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { encode } from 'modern-gif';
import workerUrl from 'modern-gif/worker?url';

export default function VideoToGif() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  const [numFrames, setNumFrames] = useState(20);
  const [interval, setIntervalTime] = useState(0.1);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifHeight, setGifHeight] = useState(0);
  
  const [currentTime, setCurrentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoUpload = (file: File) => {
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
      setGifUrl(null);
    } else {
      alert("Please select a valid video file.");
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleVideoUpload(e.target.files[0]);
    }
  };

  const handleCreateGif = async () => {
    if (!videoUrl || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    setProgressMsg('Extracting frames...');

    let width = gifWidth;
    let height = gifHeight;
    const video = videoRef.current;

    if (height === 0) {
      if (video.videoWidth && video.videoHeight) {
        height = Math.round((width / video.videoWidth) * video.videoHeight);
      } else {
        height = width;
      }
    }

    try {
      const frames: { data: string, delay: number }[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not supported');

      // extract frames
      const originalTime = video.currentTime;
      for (let i = 0; i < numFrames; i++) {
        setProgress(Math.round((i / numFrames) * 50));
        
        video.currentTime = currentTime + (i * interval);
        await new Promise(r => {
          const handler = () => { video.removeEventListener('seeked', handler); r(null); };
          video.addEventListener('seeked', handler);
        });

        ctx.drawImage(video, 0, 0, width, height);
        frames.push({ data: canvas.toDataURL('image/png'), delay: interval * 1000 });
      }
      
      // restore original time
      video.currentTime = originalTime;

      setProgressMsg('Encoding GIF...');
      setProgress(50);
      
      const output = await encode({
        workerUrl,
        width,
        height,
        frames,
        maxColors: 256,
      });

      setProgress(100);
      const gifBlob = new Blob([output], { type: 'image/gif' });
      setGifUrl(URL.createObjectURL(gifBlob));
    } catch (err) {
      console.error(err);
      alert('Error generating GIF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!gifUrl) return;
    const a = document.createElement('a');
    a.href = gifUrl;
    a.download = `converted_${Date.now()}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-pink-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Tools</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center text-white">
              <Video className="w-5 h-5" />
            </div>
            Video to GIF
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Video to GIF Converter
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Convert a section of a video into a lightweight, animated GIF perfectly sized for the web.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!videoUrl ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleVideoUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 ease-in-out bg-white",
                  isDragging ? "border-pink-500 bg-pink-50/50 scale-[1.02]" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileSelect}
                  accept="video/*"
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-2xl flex items-center justify-center mb-6 text-neutral-600">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Select a video file</h3>
                <p className="text-neutral-500 mb-6">Supports MP4, MOV, WebM.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setVideoUrl(null); setGifUrl(null); }}
                      className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-600"
                      title="Start over"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-neutral-700">GIF Creator</span>
                  </div>
                  
                  {gifUrl && (
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-6 py-2 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download GIF
                    </button>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-neutral-100/50">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900">1. Select Start Time</h3>
                    
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-sm group">
                      <video
                        ref={videoRef}
                        src={videoUrl || undefined}
                        className="w-full h-full object-contain"
                        controls
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        playsInline
                        muted
                      />
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-700">Start Offset (seconds)</span>
                        <span className="bg-neutral-100 px-2 py-1 rounded text-neutral-600">{currentTime.toFixed(2)}s</span>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-medium text-neutral-500 mb-1 block">Number of Frames ({numFrames})</label>
                          <input 
                            type="range" min="5" max="50" step="1" 
                            value={numFrames} onChange={(e) => setNumFrames(Number(e.target.value))}
                            className="w-full h-2 bg-neutral-200 rounded-full appearance-none accent-pink-600" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500 mb-1 block">Frame Interval ({interval}s)</label>
                          <input 
                            type="range" min="0.05" max="0.5" step="0.01" 
                            value={interval} onChange={(e) => setIntervalTime(Number(e.target.value))}
                            className="w-full h-2 bg-neutral-200 rounded-full appearance-none accent-pink-600" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500 mb-1 block">GIF Width ({gifWidth}px)</label>
                          <input 
                            type="range" min="100" max="800" step="10" 
                            value={gifWidth} onChange={(e) => setGifWidth(Number(e.target.value))}
                            className="w-full h-2 bg-neutral-200 rounded-full appearance-none accent-pink-600" 
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCreateGif}
                        disabled={isProcessing}
                        className="w-full py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-4"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {progressMsg || `Processing (${progress}%)`}
                          </>
                        ) : (
                          'Generate GIF'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900">2. Preview GIF</h3>
                    
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm h-[calc(100%-40px)] min-h-[300px]">
                      {gifUrl ? (
                        <div className="relative rounded-xl overflow-hidden shadow-xl ring-4 ring-neutral-100">
                          <img src={gifUrl} alt="Generated GIF" className="max-w-full max-h-[400px] object-contain" />
                        </div>
                      ) : (
                        <p className="text-neutral-400 text-sm font-medium">
                          {isProcessing ? `Creating GIF... ${progress}%` : 'Adjust settings and click Generate'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
