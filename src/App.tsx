import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Builder from './pages/Builder';
import Host from './pages/Host';
import Leaderboard from './pages/Leaderboard';
import Scoring from './pages/Scoring';

// HashRouter keeps routing entirely client-side, required for GitHub Pages.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/build" element={<Builder />} />
        <Route path="/host/:gameId" element={<Host />} />
        <Route path="/board/:gameId" element={<Leaderboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/scoring" element={<Scoring />} />
      </Routes>
    </HashRouter>
  );
}
