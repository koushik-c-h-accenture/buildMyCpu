import { create } from 'zustand';

export type SceneStyle = 'studio' | 'space' | 'light' | 'workshop' | 'carbon';

export const SCENE_LABELS: Record<SceneStyle, string> = {
  studio: '🎬 Studio',
  space: '🌌 Space',
  light: '⬜ White',
  workshop: '🛠️ Workshop',
  carbon: '⬛ Carbon',
};

const KEY = 'bmpc-scene';
function load(): SceneStyle {
  try {
    const s = localStorage.getItem(KEY) as SceneStyle | null;
    return s && s in SCENE_LABELS ? s : 'studio';
  } catch { return 'studio'; }
}

interface SceneState {
  style: SceneStyle;
  setStyle: (s: SceneStyle) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  style: load(),
  setStyle: (s) => {
    try { localStorage.setItem(KEY, s); } catch { /* ignore */ }
    set({ style: s });
  },
}));
