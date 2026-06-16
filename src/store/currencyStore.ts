import { create } from 'zustand';
import { DEFAULT_CURRENCY, CURRENCIES } from '../lib/currency';

const KEY = 'bmpc-currency';
function load(): string {
  try {
    const c = localStorage.getItem(KEY);
    return c && CURRENCIES[c] ? c : DEFAULT_CURRENCY;
  } catch { return DEFAULT_CURRENCY; }
}

interface CurrencyState {
  currency: string;
  setCurrency: (code: string) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: load(),
  setCurrency: (code) => {
    try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
    set({ currency: code });
  },
}));
