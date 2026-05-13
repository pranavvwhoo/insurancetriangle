/** Read cell from API matrix (keys may be string or number). */
export function getMatrixCell(matrix, inception, delay) {
  if (!matrix || inception == null) return null;
  const row = matrix[inception];
  if (!row) return null;
  if (row[delay] !== undefined && row[delay] !== null) return row[delay];
  const s = String(delay);
  if (row[s] !== undefined && row[s] !== null) return row[s];
  return null;
}

export function computeMinMax(matrix, periods, delays) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of periods) {
    for (const d of delays) {
      const v = getMatrixCell(matrix, p, d);
      if (typeof v === 'number' && !Number.isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  return { min, max };
}

/** Heat from teal/cyan (lower) through amber to rose (higher). */
export function heatStyle(value, min, max) {
  if (value == null || Number.isNaN(value)) {
    return {
      background: '#f8fafc',
      color: '#94a3b8',
      fontWeight: 500,
    };
  }
  if (max === min) {
    return {
      background: 'rgba(6, 182, 212, 0.15)',
      color: '#0f172a',
      fontWeight: 600,
    };
  }
  const t = (value - min) / (max - min);
  const hue = 195 - t * 150;
  const sat = 52 + t * 28;
  const light = 88 - t * 42;
  const textLight = light < 58;
  return {
    background: `hsl(${hue} ${sat}% ${light}%)`,
    color: textLight ? '#f8fafc' : '#0f172a',
    fontWeight: 600,
  };
}

export function formatCell(value, decimals) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
