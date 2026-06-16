import type { Build, Case, Cooler, Fans } from '../lib/types';

/**
 * Derives a realistic intake/exhaust plan from the fans actually present, using
 * the standard desktop convention:
 *   • front + bottom fans  → INTAKE  (cool air in)
 *   • rear + top/radiator   → EXHAUST (warm air out)
 * A chassis with fans dedicates one to rear exhaust; the rest are front/bottom
 * intake. An AIO radiator is treated as top exhaust. The intake/exhaust balance
 * gives case pressure (positive keeps dust out; negative pulls it through gaps).
 */
export interface AirflowPlan {
  intake: number;   // front/bottom intake fans
  exhaust: number;  // rear + top/radiator exhaust fans
  total: number;    // all moving-air fans (incl. CPU air-cooler fan)
  pressure: 'positive' | 'negative' | 'balanced';
  hasCase: boolean;
}

export function airflowPlan(b: Build): AirflowPlan {
  const pcCase = b.CASE as Case | undefined;
  const fans = b.FANS as Fans | undefined;
  const cooler = b.COOLER as Cooler | undefined;

  const chassisFans = (pcCase?.includedFans ?? 0) + (fans?.count ?? 0);
  const radFans = cooler?.coolerType === 'AIO' ? Math.round(cooler.radiatorSizeMm / 120) : 0;
  const airCoolerFan = cooler?.coolerType === 'Air' ? 1 : 0;

  const rearExhaust = chassisFans >= 1 ? 1 : 0;
  const intake = Math.max(0, chassisFans - rearExhaust);
  const exhaust = rearExhaust + radFans;
  const total = chassisFans + radFans + airCoolerFan;

  const diff = intake - exhaust;
  const pressure = diff === 0 ? 'balanced' : diff > 0 ? 'positive' : 'negative';
  return { intake, exhaust, total, pressure, hasCase: !!pcCase };
}
