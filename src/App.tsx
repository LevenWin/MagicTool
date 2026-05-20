import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BgRemoval from './pages/BgRemoval';
import LivePhoto from './pages/LivePhoto';
import VideoToGif from './pages/VideoToGif';
import VideoBgRemoval from './pages/VideoBgRemoval';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bg-removal" element={<BgRemoval />} />
        <Route path="/live-photo" element={<LivePhoto />} />
        <Route path="/video-to-gif" element={<VideoToGif />} />
        <Route path="/video-bg-removal" element={<VideoBgRemoval />} />
      </Routes>
    </BrowserRouter>
  );
}
