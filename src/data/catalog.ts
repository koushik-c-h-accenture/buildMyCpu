import type { Component } from '../lib/types';

// Real-world component library. Dimensions in mm, TDP in watts.
// Extend freely — the UI, validation and benchmark are all data-driven.
export const CATALOG: Component[] = [
  // ---------------------------- CASES ----------------------------
  {
    id: 'case-lianli-o11d', category: 'CASE', brand: 'Lian Li', model: 'O11 Dynamic',
    priceUsd: 149, tdpWatts: 0, dimensions: { length: 445, width: 285, height: 446 },
    color: '#2b2b32', benchBase: 1,
    formFactorsSupported: ['ATX', 'MicroATX', 'MiniITX', 'EATX'],
    maxGpuLengthMm: 420, maxCoolerHeightMm: 167, radiatorSupportMm: [240, 360],
  },
  {
    id: 'case-nzxt-h510', category: 'CASE', brand: 'NZXT', model: 'H510',
    priceUsd: 89, tdpWatts: 0, dimensions: { length: 428, width: 210, height: 460 },
    color: '#1f1f24', benchBase: 1,
    formFactorsSupported: ['ATX', 'MicroATX', 'MiniITX'],
    maxGpuLengthMm: 381, maxCoolerHeightMm: 165, radiatorSupportMm: [240, 280],
  },
  {
    id: 'case-fractal-meshify2', category: 'CASE', brand: 'Fractal', model: 'Meshify 2',
    priceUsd: 169, tdpWatts: 0, dimensions: { length: 542, width: 240, height: 474 },
    color: '#33343a', benchBase: 1,
    formFactorsSupported: ['EATX', 'ATX', 'MicroATX', 'MiniITX'],
    maxGpuLengthMm: 460, maxCoolerHeightMm: 185, radiatorSupportMm: [240, 280, 360],
  },

  // ------------------------- MOTHERBOARDS ------------------------
  {
    id: 'mobo-asus-z790-e', category: 'MOBO', brand: 'ASUS', model: 'ROG STRIX Z790-E',
    priceUsd: 449, tdpWatts: 50, dimensions: { length: 305, width: 244, height: 40 },
    color: '#3a2f4a', benchBase: 1,
    socket: 'LGA1700', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4,
  },
  {
    id: 'mobo-msi-b650-tomahawk', category: 'MOBO', brand: 'MSI', model: 'B650 Tomahawk',
    priceUsd: 219, tdpWatts: 45, dimensions: { length: 305, width: 244, height: 40 },
    color: '#4a2f2f', benchBase: 1,
    socket: 'AM5', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4,
  },
  {
    id: 'mobo-gigabyte-b550', category: 'MOBO', brand: 'Gigabyte', model: 'B550 AORUS Elite',
    priceUsd: 159, tdpWatts: 40, dimensions: { length: 305, width: 244, height: 40 },
    color: '#2f3a4a', benchBase: 1,
    socket: 'AM4', formFactor: 'ATX', memoryType: 'DDR4', memorySlots: 4,
  },
  {
    id: 'mobo-asrock-z790m', category: 'MOBO', brand: 'ASRock', model: 'Z790M-ITX',
    priceUsd: 199, tdpWatts: 40, dimensions: { length: 244, width: 244, height: 40 },
    color: '#2f4a3a', benchBase: 1,
    socket: 'LGA1700', formFactor: 'MicroATX', memoryType: 'DDR5', memorySlots: 4,
  },

  // ----------------------------- CPUS ----------------------------
  {
    id: 'cpu-intel-i9-14900k', category: 'CPU', brand: 'Intel', model: 'Core i9-14900K',
    priceUsd: 589, tdpWatts: 253, dimensions: { length: 45, width: 37.5, height: 7 },
    color: '#6c8ebf', benchBase: 5.0,
    socket: 'LGA1700', cores: 24, threads: 32, baseClock: 3.2, boostClock: 6.0,
    memoryType: 'DDR5', igpu: true,
  },
  {
    id: 'cpu-amd-7800x3d', category: 'CPU', brand: 'AMD', model: 'Ryzen 7 7800X3D',
    priceUsd: 399, tdpWatts: 120, dimensions: { length: 40, width: 40, height: 7 },
    color: '#bf6c6c', benchBase: 4.6,
    socket: 'AM5', cores: 8, threads: 16, baseClock: 4.2, boostClock: 5.0,
    memoryType: 'DDR5', igpu: true,
  },
  {
    id: 'cpu-intel-i5-13600k', category: 'CPU', brand: 'Intel', model: 'Core i5-13600K',
    priceUsd: 289, tdpWatts: 181, dimensions: { length: 45, width: 37.5, height: 7 },
    color: '#6c9ebf', benchBase: 3.8,
    socket: 'LGA1700', cores: 14, threads: 20, baseClock: 3.5, boostClock: 5.1,
    memoryType: 'DDR5', igpu: true,
  },
  {
    id: 'cpu-amd-5600x', category: 'CPU', brand: 'AMD', model: 'Ryzen 5 5600X',
    priceUsd: 159, tdpWatts: 65, dimensions: { length: 40, width: 40, height: 7 },
    color: '#bf8c6c', benchBase: 2.8,
    socket: 'AM4', cores: 6, threads: 12, baseClock: 3.7, boostClock: 4.6,
    memoryType: 'DDR4', igpu: false,
  },

  // ----------------------------- GPUS ----------------------------
  {
    id: 'gpu-rtx-4090', category: 'GPU', brand: 'NVIDIA', model: 'GeForce RTX 4090',
    priceUsd: 1599, tdpWatts: 450, dimensions: { length: 304, width: 137, height: 61 },
    color: '#3fae6b', benchBase: 10.0, vramGb: 24, recommendedPsuWatts: 850,
  },
  {
    id: 'gpu-rx-7900xtx', category: 'GPU', brand: 'AMD', model: 'Radeon RX 7900 XTX',
    priceUsd: 999, tdpWatts: 355, dimensions: { length: 287, width: 135, height: 51 },
    color: '#d14b3a', benchBase: 8.5, vramGb: 24, recommendedPsuWatts: 800,
  },
  {
    id: 'gpu-rtx-4070', category: 'GPU', brand: 'NVIDIA', model: 'GeForce RTX 4070',
    priceUsd: 549, tdpWatts: 200, dimensions: { length: 244, width: 112, height: 40 },
    color: '#46c47a', benchBase: 6.0, vramGb: 12, recommendedPsuWatts: 650,
  },
  {
    id: 'gpu-rtx-3060', category: 'GPU', brand: 'NVIDIA', model: 'GeForce RTX 3060',
    priceUsd: 299, tdpWatts: 170, dimensions: { length: 242, width: 112, height: 40 },
    color: '#5bd48f', benchBase: 4.0, vramGb: 12, recommendedPsuWatts: 550,
  },

  // ----------------------------- RAM -----------------------------
  {
    id: 'ram-corsair-ddr5-32', category: 'RAM', brand: 'Corsair', model: 'Vengeance 32GB DDR5',
    priceUsd: 109, tdpWatts: 8, dimensions: { length: 133, width: 7, height: 44 },
    color: '#c9a227', benchBase: 1, memoryType: 'DDR5', capacityGb: 32, modules: 2, speedMhz: 6000,
  },
  {
    id: 'ram-gskill-ddr5-64', category: 'RAM', brand: 'G.Skill', model: 'Trident Z5 64GB DDR5',
    priceUsd: 219, tdpWatts: 10, dimensions: { length: 133, width: 7, height: 44 },
    color: '#d4b94a', benchBase: 1, memoryType: 'DDR5', capacityGb: 64, modules: 2, speedMhz: 6400,
  },
  {
    id: 'ram-corsair-ddr4-32', category: 'RAM', brand: 'Corsair', model: 'Vengeance 32GB DDR4',
    priceUsd: 79, tdpWatts: 6, dimensions: { length: 133, width: 7, height: 44 },
    color: '#b8941f', benchBase: 1, memoryType: 'DDR4', capacityGb: 32, modules: 2, speedMhz: 3600,
  },

  // ----------------------------- PSUS ----------------------------
  {
    id: 'psu-corsair-rm850x', category: 'PSU', brand: 'Corsair', model: 'RM850x',
    priceUsd: 139, tdpWatts: 0, dimensions: { length: 160, width: 150, height: 86 },
    color: '#444448', benchBase: 1, wattage: 850, efficiency: '80+ Gold',
  },
  {
    id: 'psu-corsair-hx1000', category: 'PSU', brand: 'Corsair', model: 'HX1000',
    priceUsd: 199, tdpWatts: 0, dimensions: { length: 180, width: 150, height: 86 },
    color: '#3a3a3e', benchBase: 1, wattage: 1000, efficiency: '80+ Platinum',
  },
  {
    id: 'psu-evga-650b', category: 'PSU', brand: 'EVGA', model: '650 BR',
    priceUsd: 69, tdpWatts: 0, dimensions: { length: 150, width: 150, height: 86 },
    color: '#4e4e52', benchBase: 1, wattage: 650, efficiency: '80+ Bronze',
  },

  // --------------------------- COOLERS ---------------------------
  {
    id: 'cooler-corsair-h150i', category: 'COOLER', brand: 'Corsair', model: 'iCUE H150i (360mm)',
    priceUsd: 189, tdpWatts: 10, dimensions: { length: 397, width: 120, height: 27 },
    color: '#5a8fd6', benchBase: 1, coolerType: 'AIO',
    supportedSockets: ['LGA1700', 'AM5', 'AM4'], radiatorSizeMm: 360, airHeightMm: 0,
    dissipationWatts: 350,
  },
  {
    id: 'cooler-nzxt-x63', category: 'COOLER', brand: 'NZXT', model: 'Kraken X63 (280mm)',
    priceUsd: 149, tdpWatts: 8, dimensions: { length: 315, width: 140, height: 30 },
    color: '#6a9fe6', benchBase: 1, coolerType: 'AIO',
    supportedSockets: ['LGA1700', 'AM5', 'AM4'], radiatorSizeMm: 280, airHeightMm: 0,
    dissipationWatts: 280,
  },
  {
    id: 'cooler-noctua-nhd15', category: 'COOLER', brand: 'Noctua', model: 'NH-D15',
    priceUsd: 109, tdpWatts: 6, dimensions: { length: 150, width: 161, height: 165 },
    color: '#b5825a', benchBase: 1, coolerType: 'Air',
    supportedSockets: ['LGA1700', 'AM5', 'AM4'], radiatorSizeMm: 0, airHeightMm: 165,
    dissipationWatts: 250,
  },
  {
    id: 'cooler-cm-hyper212', category: 'COOLER', brand: 'Cooler Master', model: 'Hyper 212',
    priceUsd: 44, tdpWatts: 4, dimensions: { length: 120, width: 80, height: 159 },
    color: '#9a9a9e', benchBase: 1, coolerType: 'Air',
    supportedSockets: ['LGA1700', 'AM5', 'AM4'], radiatorSizeMm: 0, airHeightMm: 159,
    dissipationWatts: 150,
  },
];

export function byCategory(cat: string): Component[] {
  return CATALOG.filter((c) => c.category === cat);
}

export function byId(id: string): Component | undefined {
  return CATALOG.find((c) => c.id === id);
}
