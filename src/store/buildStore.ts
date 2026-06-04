import { create } from 'zustand';
import type { Build, Category, Component } from '../lib/types';
import type { ScoreBreakdown } from '../rules/benchmark';
import type { RuleResult } from '../rules/compatibility';
import { byId } from '../data/catalog';

export type Phase = 'building' | 'testing' | 'failed' | 'done';

// --- persistence: a build survives refresh (important during a timed contest) ---
const KEY = 'bmpc-build';
function persist(build: Build) {
  try {
    const ids = Object.fromEntries(Object.entries(build).map(([cat, c]) => [cat, c!.id]));
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}
function loadBuild(): Build {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, string>;
    const b: Build = {};
    for (const [cat, id] of Object.entries(ids)) {
      const c = byId(id);
      if (c) (b as Record<string, Component>)[cat] = c;
    }
    return b;
  } catch { return {}; }
}

interface BuildState {
  build: Build;
  activeCategory: Category;
  result: ScoreBreakdown | null;
  phase: Phase;
  errors: RuleResult[];
  setComponent: (c: Component) => void;
  removeComponent: (cat: Category) => void;
  setActiveCategory: (cat: Category) => void;
  setResult: (r: ScoreBreakdown | null) => void;
  setPhase: (p: Phase) => void;
  setErrors: (e: RuleResult[]) => void;
  reset: () => void;
}

export const useBuildStore = create<BuildState>((set) => ({
  build: loadBuild(),
  activeCategory: 'CASE',
  result: null,
  phase: 'building',
  errors: [],
  setComponent: (c) =>
    set((s) => {
      const build = { ...s.build, [c.category]: c };
      persist(build);
      return { build, result: null, phase: 'building', errors: [] };
    }),
  removeComponent: (cat) =>
    set((s) => {
      const build = { ...s.build };
      delete build[cat];
      persist(build);
      return { build, result: null, phase: 'building', errors: [] };
    }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setResult: (r) => set({ result: r }),
  setPhase: (p) => set({ phase: p }),
  setErrors: (e) => set({ errors: e }),
  reset: () => { persist({}); set({ build: {}, result: null, phase: 'building', errors: [], activeCategory: 'CASE' }); },
}));
