import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Video, Trash2, ArrowLeft, Download, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function LivePhoto() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);

  const handleVideoUpload = (file: File) => {
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
      setCoverImageUrl(null);
    } else {
      alert("Please select a valid video file.");
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleVideoUpload(e.target.files[0]);
    }
  };

  const extractFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setCoverImageUrl(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  // Live photo playback handlers
  const startLivePhoto = () => {
    setIsPressing(true);
    if (resultVideoRef.current) {
      resultVideoRef.current.currentTime = 0;
      resultVideoRef.current.play();
    }
  };

  const stopLivePhoto = () => {
    setIsPressing(false);
    if (resultVideoRef.current) {
      resultVideoRef.current.pause();
      resultVideoRef.current.currentTime = 0;
    }
  };

  const handleDownload = async () => {
    if (!coverImageUrl || !videoFile) {
      alert("Please ensure the video is loaded and a cover frame is generated.");
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // To construct a traditional iOS Live Photo, specialized metadata injection is typically required using EXIF libraries.
      // For pure web, we offer them packed as an archive. 
      const zip = new JSZip();
      
      // Convert data url to blob manually to avoid fetch issues on some browsers
      let coverBlob: Blob;
      if (coverImageUrl.startsWith('data:')) {
        const arr = coverImageUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        coverBlob = new Blob([u8arr], { type: mime });
      } else {
        const res = await fetch(coverImageUrl);
        coverBlob = await res.blob();
      }
      
      zip.file("live_photo_cover.jpg", coverBlob);
      zip.file(`live_photo_video.${videoFile.name.split('.').pop() || 'mp4'}`, videoFile);
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "LivePhoto_Assets.zip");
    } catch (error) {
      console.error("Error creating zip:", error);
      alert("There was an error creating the ZIP file. See console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-purple-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Tools</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Video className="w-5 h-5" />
            </div>
            Live Photo Creator
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Video to Live Photo
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Upload a short clip, pick the perfect cover frame, and export it as an interactive web live photo bundle.
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
                  isDragging ? "border-purple-500 bg-purple-50/50 scale-[1.02]" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
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
                <h3 className="text-xl font-semibold mb-2">Select a short video file</h3>
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
                      onClick={() => { setVideoUrl(null); setCoverImageUrl(null); }}
                      className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-600"
                      title="Start over"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-neutral-700">Studio Editor</span>
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading || !coverImageUrl}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-sm",
                      (isDownloading || !coverImageUrl) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isDownloading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isDownloading ? 'Packaging...' : 'Export ZIP Bundle'}
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-neutral-100/50">
                  {/* Step 1: Select Frame */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold">1</span>
                       <h3 className="text-lg font-semibold text-neutral-900">Choose Cover Frame</h3>
                    </div>
                    
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-sm group">
                      <video
                        ref={videoRef}
                        src={videoUrl || undefined}
                        className="w-full h-full object-contain"
                        onSeeked={extractFrame}
                        onLoadedMetadata={(e) => {
                          setDuration(e.currentTarget.duration);
                          // give it a tiny delay to ensure first frame is decoded
                          setTimeout(extractFrame, 150);
                        }}
                        playsInline
                        muted
                      />
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                      <div className="flex justify-between text-xs font-medium text-neutral-500 mb-2">
                        <span>0:00</span>
                        <span>{duration.toFixed(2)}s</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={duration} 
                        step="0.01"
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-purple-600" 
                      />
                      <p className="text-center text-sm text-neutral-500 mt-4">
                        Drag to find the perfect still cover image
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Test Live Photo */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold">2</span>
                       <h3 className="text-lg font-semibold text-neutral-900">Test Live Photo</h3>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm h-[calc(100%-80px)]">
                      <div 
                        className="relative w-full max-w-[300px] aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden shadow-xl cursor-pointer select-none ring-4 ring-neutral-100"
                        onMouseDown={startLivePhoto}
                        onMouseUp={stopLivePhoto}
                        onMouseLeave={stopLivePhoto}
                        onTouchStart={(e) => { e.preventDefault(); startLivePhoto(); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopLivePhoto(); }}
                      >
                        {/* Cover Image */}
                        {coverImageUrl && (
                          <img 
                            src={coverImageUrl} 
                            className={cn(
                              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none",
                              isPressing ? "opacity-0" : "opacity-100"
                            )}
                            alt="Cover"
                          />
                        )}
                        
                        {/* Video Layer */}
                        <video 
                          ref={resultVideoRef}
                          src={videoUrl || undefined}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          playsInline
                          loop
                          muted
                        />

                        {/* Guide Overlay */}
                        <div className={cn(
                          "absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-opacity duration-300",
                          isPressing ? "opacity-0" : "opacity-100"
                        )}>
                          <span className="w-2 h-2 rounded-full border-2 border-white opacity-80" />
                          <span className="text-[10px] uppercase font-bold text-white tracking-widest">LIVE</span>
                        </div>
                      </div>
                      
                      <p className="mt-8 font-medium text-neutral-500 flex items-center gap-2 animate-bounce">
                        <PlayCircle className="w-5 h-5 text-purple-600" />
                        Press and hold image to play
                      </p>
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
