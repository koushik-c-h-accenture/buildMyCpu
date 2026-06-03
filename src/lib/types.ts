// Shared domain types for components and builds.

export type Category =
  | 'CPU' | 'GPU' | 'MOBO' | 'RAM' | 'PSU' | 'COOLER' | 'CASE' | 'STORAGE' | 'FANS';

/** Categories that must be filled for a complete, testable build. */
export const REQUIRED_CATEGORIES: Category[] = [
  'CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'STORAGE', 'PSU',
];
/** Optional accessory categories (improve thermals/airflow but not mandatory). */
export const OPTIONAL_CATEGORIES: Category[] = ['FANS'];
/** Display + selection order. */
export const CATEGORY_ORDER: Category[] = [...REQUIRED_CATEGORIES, ...OPTIONAL_CATEGORIES];

export const CATEGORY_LABELS: Record<Category, string> = {
  CASE: 'Case', MOBO: 'Motherboard', CPU: 'CPU', COOLER: 'CPU Cooler',
  RAM: 'Memory', GPU: 'GPU', STORAGE: 'Storage', PSU: 'Power Supply',
  FANS: 'Case Fans',
};

/** Real-world physical dimensions, in millimetres. */
export interface Dimensions { length: number; width: number; height: number; }

export interface BaseComponent {
  id: string;
  category: Category;
  brand: string;
  model: string;
  priceUsd: number;
  tdpWatts: number;
  dimensions: Dimensions;
  /** Hex colour for the placeholder 3D part. */
  color: string;
  /** Base performance multiplier feeding the benchmark. */
  benchBase: number;
  /** Approx mass in grams (used for the build-weight metric). */
  weightG?: number;
  /** Reliability proxy 0-1 (build quality / MTBF tier). */
  reliability?: number;
}

export interface Cpu extends BaseComponent {
  category: 'CPU';
  socket: string; cores: number; threads: number;
  baseClock: number; boostClock: number;
  memoryType: 'DDR4' | 'DDR5'; igpu: boolean;
}
export interface Gpu extends BaseComponent {
  category: 'GPU'; vramGb: number; recommendedPsuWatts: number;
}
export interface Mobo extends BaseComponent {
  category: 'MOBO'; socket: string;
  formFactor: 'ATX' | 'MicroATX' | 'MiniITX' | 'EATX';
  memoryType: 'DDR4' | 'DDR5'; memorySlots: number; m2Slots: number;
}
export interface Ram extends BaseComponent {
  category: 'RAM'; memoryType: 'DDR4' | 'DDR5';
  capacityGb: number; modules: number; speedMhz: number;
}
export interface Psu extends BaseComponent {
  category: 'PSU'; wattage: number; efficiency: string; efficiencyPct: number;
}
export interface Cooler extends BaseComponent {
  category: 'COOLER'; coolerType: 'AIO' | 'Air';
  supportedSockets: string[]; radiatorSizeMm: number; airHeightMm: number;
  dissipationWatts: number; noiseDb: number;
}
export interface Case extends BaseComponent {
  category: 'CASE';
  formFactorsSupported: Array<'ATX' | 'MicroATX' | 'MiniITX' | 'EATX'>;
  maxGpuLengthMm: number; maxCoolerHeightMm: number;
  radiatorSupportMm: number[]; fanMounts: number; includedFans: number;
}
export interface Storage extends BaseComponent {
  category: 'STORAGE'; iface: 'NVMe' | 'SATA';
  capacityGb: number; readMBps: number; writeMBps: number;
}
export interface Fans extends BaseComponent {
  category: 'FANS'; count: number; airflowCfm: number; noiseDb: number;
}

export type Component = Cpu | Gpu | Mobo | Ram | Psu | Cooler | Case | Storage | Fans;

/** A (possibly incomplete) selection of one component per category. */
export type Build = Partial<Record<Category, Component>>;

export interface LeaderboardRow {
  id: string;
  username: string;
  build_name: string;
  cpu_label: string;
  gpu_label: string;
  final_score: number;
  created_at: string;
}
