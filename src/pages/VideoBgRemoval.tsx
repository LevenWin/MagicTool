import React, { useState, useRef } from 'react';
import { UploadCloud, Video, Trash2, ArrowLeft, Download, Loader2, Image as ImageIcon, Paintbrush, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { removeBackground } from '@imgly/background-removal';
import { encode } from 'modern-gif';
import workerUrl from 'modern-gif/worker?url';

export default function VideoBgRemoval() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [bgType, setBgType] = useState<'transparent' | 'color' | 'image'>('transparent');
  const [bgColor, setBgColor] = useState('#10b981');
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  
  const [exportFormat, setExportFormat] = useState<'video' | 'gif'>('gif');
  const [fps, setFps] = useState(10);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (log: string) => {
    setDebugLogs(prev => [...prev, log]);
    console.log(log);
  };

  const [debugImage, setDebugImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleVideoUpload = (file: File) => {
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
      setResultUrl(null);
    } else {
      alert("Please select a valid video file.");
    }
  };

  const handleBgImageUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setBgImageFile(file);
      setBgImageUrl(url);
    } else {
      alert("Please select a valid image file.");
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleVideoUpload(e.target.files[0]);
    }
  };

  const onBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleBgImageUpload(e.target.files[0]);
    }
  };

  // The helper function to record a canvas stream
  const exportVideoWebM = async (frames: string[], fpsRate: number, width: number, height: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(new Blob([]));
      
      const stream = canvas.captureStream(fpsRate);
      let options = { mimeType: 'video/webm; codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
      
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: options.mimeType }));
      };
      
      recorder.start();
      
      let frameIndex = 0;
      const renderNextFrame = () => {
        if (frameIndex >= frames.length) {
          // Allow the last frame to be captured
          setTimeout(() => { recorder.stop(); }, 100);
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          frameIndex++;
          setTimeout(renderNextFrame, 1000 / fpsRate);
        };
        img.src = frames[frameIndex];
      };
      
      renderNextFrame();
    });
  };

  const handleProcess = async () => {
    if (!videoRef.current || !videoUrl) return;
    
    setIsProcessing(true);
    setDebugLogs([]);
    setProgressMsg('Initializing AI model...');
    setProgressPercent(0);
    setResultUrl(null);

    try {
      const video = videoRef.current;
      // Force video length limit to avoid freezing the browser tabs
      const duration = Math.min(video.duration, 5); 
      const totalFrames = Math.floor(duration * fps);
      
      const canvas = document.createElement('canvas');
      const maxWidth = 480;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > maxWidth) {
        h = Math.round((maxWidth / w) * h);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Could not get canvas context");

      let bgImg: HTMLImageElement | null = null;
      if (bgType === 'image' && bgImageUrl) {
        bgImg = new Image();
        bgImg.src = bgImageUrl;
        await new Promise(r => { bgImg!.onload = r; });
      }

      const frames: any[] = [];
      
      for (let i = 0; i <= totalFrames; i++) {
        setProgressMsg(`Processing frame ${i+1} of ${totalFrames}...`);
        setProgressPercent(Math.round(((i) / totalFrames) * 100));

        const t = i / fps;
        video.currentTime = t;
        await new Promise(r => {
          const handler = () => { video.removeEventListener('seeked', handler); r(null); };
          video.addEventListener('seeked', handler);
        });

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(video, 0, 0, w, h);
        
        let frameBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
        if (!frameBlob) continue;
        
        let transparentBlob: Blob;
        try {
          addLog(`Starting removeBackground for frame ${i}, blob size: ${frameBlob.size}`);
          transparentBlob = await removeBackground(frameBlob, {
            output: { format: 'image/png' },
            model: 'medium',
            debug: true,
            progress: (key, current, total) => {
              if (i === 0) {
                // Models are downloaded only on the first frame typically
                addLog(`Downloading AI model progress [${key}]: ${Math.round((current/total)*100)}%`);
                setProgressMsg(`Downloading AI model (${key}): ${Math.round((current / total) * 100)}%`);
              }
            }
          });
          addLog(`Finished removeBackground for frame ${i}, output blob size: ${transparentBlob.size}`);
        } catch (e: any) {
          addLog(`Failed to remove bg for frame ${i}: ${e?.message}`);
          console.error('Failed to remove bg for frame', i, e);
          if (i === 0) {
            alert('Failed to initialize background removal AI. Hardware acceleration might not be available or network error occurred.');
            throw e; // Stop processing entirely
          }
          transparentBlob = frameBlob;
        }

        const fgImg = new Image();
        fgImg.src = URL.createObjectURL(transparentBlob);
        await new Promise(r => { fgImg.onload = r; });

        // Composite
        ctx.clearRect(0, 0, w, h);
        if (bgType === 'color') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else if (bgType === 'image' && bgImg) {
          // Fill to cover
          const scale = Math.max(w / bgImg.width, h / bgImg.height);
          const x = (w / 2) - (bgImg.width / 2) * scale;
          const y = (h / 2) - (bgImg.height / 2) * scale;
          ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
        }
        
        ctx.drawImage(fgImg, 0, 0, w, h);
        URL.revokeObjectURL(fgImg.src);
        
        if (exportFormat === 'gif') {
          // Store raw pixels for better compatibility with modern-gif
          frames.push(ctx.getImageData(0, 0, w, h).data);
          if (i === 0) setDebugImage(canvas.toDataURL('image/png'));
        } else {
          // Whammy needs webp data URLs
          frames.push(canvas.toDataURL('image/webp', 0.9));
          if (i === 0) setDebugImage(frames[0]);
        }
      }

      setProgressMsg('Encoding export file...');
      setProgressPercent(100);

      if (exportFormat === 'gif') {
        setProgressMsg('Encoding GIF...');
        setProgressPercent(50);
        
        const output = await encode({
          workerUrl,
          width: w,
          height: h,
          frames: frames.map(frameData => ({
            data: frameData,
            delay: 1000 / fps,
            disposal: 2 as const,
            transparent: true,
          })),
          maxColors: 256,
        });

        setProgressPercent(100);
        const gifBlob = new Blob([output], { type: 'image/gif' });
        setResultUrl(URL.createObjectURL(gifBlob));
      } else {
        const videoBlob = await exportVideoWebM(frames, fps, w, h);
        setResultUrl(URL.createObjectURL(videoBlob));
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `bg_removed_${Date.now()}.${exportFormat === 'gif' ? 'gif' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-teal-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Tools</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Video className="w-5 h-5" />
            </div>
            Video Bg Removal
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Video Background Remover
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Automatically remove the background from objects and people in videos. Export as transparent GIF, add a custom colored background or add an image background.
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
                  isDragging ? "border-teal-500 bg-teal-50/50 scale-[1.02]" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
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
                <h3 className="text-xl font-semibold mb-2">Upload a short video</h3>
                <p className="text-neutral-500 mb-6">Max 5 seconds recommended. MP4, MOV, WebM.</p>
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
                      onClick={() => { setVideoUrl(null); setResultUrl(null); }}
                      className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-600"
                      title="Start over"
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-neutral-700">Editor Settings</span>
                  </div>
                  
                  {resultUrl && (
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download {exportFormat.toUpperCase()}
                    </button>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-neutral-100/50">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-5">
                      {/* Processing options */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-900 block">Export Format</label>
                        <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                          <button 
                            disabled={isProcessing}
                            onClick={() => setExportFormat('video')}
                            className={cn(
                              "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                              exportFormat === 'video' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
                            )}>Video (WebM)</button>
                          <button 
                            disabled={isProcessing}
                            onClick={() => setExportFormat('gif')}
                            className={cn(
                              "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                              exportFormat === 'gif' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
                            )}>GIF</button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-900 block">Background Type</label>
                        <div className="space-y-2">
                          <button 
                             onClick={() => setBgType('transparent')}
                             disabled={isProcessing}
                             className={cn("w-full flex items-center justify-start gap-3 p-3 rounded-lg border", 
                              bgType === 'transparent' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-neutral-200 hover:bg-neutral-50 bg-white')}>
                             <Droplets className="w-4 h-4" />
                             <span className="font-medium text-sm">Transparent</span>
                          </button>
                          
                          <button 
                             onClick={() => setBgType('color')}
                             disabled={isProcessing}
                             className={cn("w-full flex items-center justify-between p-3 rounded-lg border", 
                              bgType === 'color' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-neutral-200 hover:bg-neutral-50 bg-white')}>
                             <div className="flex items-center gap-3">
                               <Paintbrush className="w-4 h-4" />
                               <span className="font-medium text-sm">Solid Color</span>
                             </div>
                             {bgType === 'color' && (
                                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} 
                                  className="w-6 h-6 rounded cursor-pointer border-0" />
                             )}
                          </button>

                          <button 
                             onClick={() => { setBgType('image'); if (!bgImageUrl) bgInputRef.current?.click(); }}
                             disabled={isProcessing}
                             className={cn("w-full flex items-center justify-between p-3 rounded-lg border overflow-hidden", 
                              bgType === 'image' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-neutral-200 hover:bg-neutral-50 bg-white')}>
                             <div className="flex items-center gap-3">
                               <ImageIcon className="w-4 h-4" />
                               <span className="font-medium text-sm">Custom Image</span>
                             </div>
                             {bgType === 'image' && bgImageUrl && (
                               <div className="w-8 h-8 rounded border border-neutral-200 overflow-hidden" onClick={(e) => { e.stopPropagation(); bgInputRef.current?.click()}}>
                                 <img src={bgImageUrl} alt="bg" className="w-full h-full object-cover" />
                               </div>
                             )}
                          </button>
                          <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={onBgImageSelect} />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-900 block flex justify-between">
                          <span>Quality / FPS</span>
                          <span className="text-neutral-500 font-normal">{fps} FPS</span>
                        </label>
                        <input 
                          type="range" min="5" max="15" step="5" 
                          disabled={isProcessing}
                          value={fps} onChange={(e) => setFps(Number(e.target.value))}
                          className="w-full h-2 bg-neutral-200 rounded-full appearance-none accent-teal-600" 
                        />
                      </div>

                      <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-4"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {progressMsg}
                          </>
                        ) : (
                          'Remove Background & Export'
                        )}
                      </button>
                      
                      {isProcessing && (
                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-teal-600 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      )}

                      {debugLogs.length > 0 && (
                        <div className="mt-4 p-3 bg-neutral-900 text-green-400 font-mono text-xs rounded-xl overflow-y-auto max-h-48 whitespace-pre-wrap">
                          {debugLogs.map((log, idx) => (
                            <div key={idx} className="mb-1">{log}</div>
                          ))}
                        </div>
                      )}
                      
                      {debugImage && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Debug First Frame:</p>
                          <img src={debugImage} className="w-full rounded border border-neutral-200" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm h-full min-h-[300px]">
                      {resultUrl && (
                         <div className="relative rounded-xl overflow-hidden shadow-xl ring-4 ring-neutral-100 checkerboard w-full mb-4">
                           {exportFormat === 'gif' ? (
                             <img src={resultUrl} alt="Result GIF" className="max-w-full max-h-[400px] object-contain mx-auto" />
                           ) : (
                             <video src={resultUrl} controls autoPlay loop playsInline muted className="max-w-full max-h-[400px] object-contain mx-auto" />
                           )}
                         </div>
                      )}
                      <div className={cn("relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-4 ring-neutral-100", resultUrl ? "hidden" : "block")}>
                         <video
                           ref={videoRef}
                           src={videoUrl || undefined}
                           className="w-full h-full object-contain"
                           controls
                           playsInline
                           crossOrigin="anonymous"
                         />
                      </div>
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
