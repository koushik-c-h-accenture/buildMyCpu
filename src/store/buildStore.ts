import { create } from 'zustand';
import type { Build, Category, Component } from '../lib/types';
import type { ScoreBreakdown } from '../rules/benchmark';

interface BuildState {
  build: Build;
  activeCategory: Category;
  result: ScoreBreakdown | null;
  setComponent: (c: Component) => void;
  removeComponent: (cat: Category) => void;
  setActiveCategory: (cat: Category) => void;
  setResult: (r: ScoreBreakdown | null) => void;
  reset: () => void;
}

export const useBuildStore = create<BuildState>((set) => ({
  build: {},
  activeCategory: 'CASE',
  result: null,
  setComponent: (c) =>
    set((s) => ({ build: { ...s.build, [c.category]: c }, result: null })),
  removeComponent: (cat) =>
    set((s) => {
      const next = { ...s.build };
      delete next[cat];
      return { build: next, result: null };
    }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setResult: (r) => set({ result: r }),
  reset: () => set({ build: {}, result: null, activeCategory: 'CASE' }),
}));
