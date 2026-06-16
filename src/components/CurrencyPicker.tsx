import { useCurrencyStore } from '../store/currencyStore';
import { CURRENCIES } from '../lib/currency';

/** Compact currency selector used in top bars. Persists choice to localStorage. */
export default function CurrencyPicker() {
  const { currency, setCurrency } = useCurrencyStore();
  return (
    <select
      className="currency-picker"
      value={currency}
      title="Display currency"
      onChange={(e) => setCurrency(e.target.value)}
    >
      {Object.values(CURRENCIES).map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
