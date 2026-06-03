import { create } from 'zustand';
import type { Build, Category, Component } from '../lib/types';
import type { ScoreBreakdown } from '../rules/benchmark';
import type { RuleResult } from '../rules/compatibility';

export type Phase = 'building' | 'testing' | 'failed' | 'done';

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
  build: {},
  activeCategory: 'CASE',
  result: null,
  phase: 'building',
  errors: [],
  setComponent: (c) =>
    set((s) => ({ build: { ...s.build, [c.category]: c }, result: null, phase: 'building', errors: [] })),
  removeComponent: (cat) =>
    set((s) => {
      const next = { ...s.build };
      delete next[cat];
      return { build: next, result: null, phase: 'building', errors: [] };
    }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setResult: (r) => set({ result: r }),
  setPhase: (p) => set({ phase: p }),
  setErrors: (e) => set({ errors: e }),
  reset: () => set({ build: {}, result: null, phase: 'building', errors: [], activeCategory: 'CASE' }),
}));
