import { HashRouter, Routes, Route } from 'react-router-dom';
import Builder from './pages/Builder';
import Leaderboard from './pages/Leaderboard';

// HashRouter keeps routing entirely client-side, which is required for
// GitHub Pages (no server to rewrite unknown paths).
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Builder />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </HashRouter>
  );
}
