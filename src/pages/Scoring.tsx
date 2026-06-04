import { Link } from 'react-router-dom';
import ScoringDoc from '../components/ScoringDoc';

export default function Scoring() {
  return (
    <div className="page">
      <header className="topbar">
        <h1>📊 Scoring &amp; How It Works</h1>
        <Link className="btn" to="/build">← Builder</Link>
      </header>
      <ScoringDoc />
    </div>
  );
}
