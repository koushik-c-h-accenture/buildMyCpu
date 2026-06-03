import { create } from 'zustand';

// Lightweight participant session, persisted so a refresh keeps the player in
// their competition. (The competition record itself lives in Supabase.)
const KEY = 'bmpc-participant';

interface Session { gameId: string; username: string; }
function load(): Session | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

interface CompState {
  gameId: string | null;
  username: string | null;
  setSession: (gameId: string, username: string) => void;
  clear: () => void;
}

const initial = load();
export const useCompStore = create<CompState>((set) => ({
  gameId: initial?.gameId ?? null,
  username: initial?.username ?? null,
  setSession: (gameId, username) => {
    localStorage.setItem(KEY, JSON.stringify({ gameId, username }));
    set({ gameId, username });
  },
  clear: () => { localStorage.removeItem(KEY); set({ gameId: null, username: null }); },
}));
