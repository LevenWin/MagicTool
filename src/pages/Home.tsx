import React from 'react';
import { Sparkles, Video, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            MagicTools
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20 pb-32">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 mb-6"
          >
            Create Magic with Media
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-neutral-600 max-w-2xl mx-auto"
          >
            Powerful browser-based tools for modern media workflows. Completely free and private.
          </motion.p>
        </div>

          <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto"
        >
          {/* Card 1 */}
          <Link to="/bg-removal" className="group block h-full">
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="text-blue-500 w-6 h-6" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-neutral-900">Background Remover</h2>
              <p className="text-neutral-500 flex-1">
                Instantly remove backgrounds from images natively in your browser using advanced AI models. No servers required.
              </p>
            </div>
          </Link>

          {/* Card 2 */}
          <Link to="/live-photo" className="group block h-full">
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="text-purple-500 w-6 h-6" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-neutral-900">Video to Live Photo</h2>
              <p className="text-neutral-500 flex-1">
                Convert any short video clipping into a dynamic interactive cover image or extract high quality frames perfectly.
              </p>
            </div>
          </Link>

          {/* Card 3 */}
          <Link to="/video-to-gif" className="group block h-full">
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-pink-300 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="text-pink-500 w-6 h-6" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-neutral-900">Video to GIF</h2>
              <p className="text-neutral-500 flex-1">
                Convert a section of any video into a lightweight, animated GIF perfectly sized for the web.
              </p>
            </div>
          </Link>
          {/* Card 4 */}
          <Link to="/video-bg-removal" className="group block h-full">
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-teal-300 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="text-teal-500 w-6 h-6" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-neutral-900">Video Bg Remover</h2>
              <p className="text-neutral-500 flex-1">
                Remove backgrounds from videos using AI. Replace with transparent, solid colors, or images, then export as Video or GIF.
              </p>
            </div>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
