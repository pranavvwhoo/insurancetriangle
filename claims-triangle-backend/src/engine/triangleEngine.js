const SCALE_DIVISOR = { units: 1, thousands: 1000, lakhs: 100000, crores: 10000000 };

// Strip commas/whitespace from Excel-formatted numbers e.g. " 2,476 "
function cleanNum(v) { return Number(String(v ?? 0).trim().replace(/,/g, '')); }

function col(mapping, field) { return mapping[field]; }

function formatPeriodKey(raw, granularity) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear(), month = d.getMonth() + 1;
  if (granularity === 'monthly') return year + '-' + String(month).padStart(2, '0');
  if (granularity === 'quarterly') return year + '-Q' + Math.ceil(month / 3);
  if (granularity === 'yearly') return String(year);
  return null;
}

function getInceptionKey(row, mapping, granularity) {
  return formatPeriodKey(row[col(mapping, 'Risk_Inception_Month')], granularity);
}

function getDelayKey(row, mapping, granularity) {
  if (granularity === 'monthly') return Number(row[col(mapping, 'Delay_Month')]);
  if (granularity === 'quarterly') return Number(row[col(mapping, 'Delay_Quarter')]);
  if (granularity === 'yearly') return Number(row[col(mapping, 'Delay_Year')]);
}

function getMetricValue(row, mapping, metric) {
  if (metric === 'paid') return cleanNum(row[col(mapping, 'Paid_Amount')] ?? 0);
  if (metric === 'reported') return cleanNum(row[col(mapping, 'Reported_Amount')] ?? 0);
  if (metric === 'count') return cleanNum(row[col(mapping, 'Reported_Count')] ?? 0);
  return 0;
}

function passesGranularityFlag(row, mapping, granularity) {
  if (granularity === 'monthly') return true;
  const flagField = granularity === 'quarterly' ? 'Quarter_Flag' : 'Year_Flag';
  return String(row[col(mapping, flagField)] || '').toLowerCase() === 'yes';
}

function passesFilters(row, mapping, filters) {
  const { level1 = [], level2 = [] } = filters || {};
  if (level1.length > 0 && !level1.includes(String(row[col(mapping, 'Level_1')] || '').trim())) return false;
  if (level2.length > 0 && !level2.includes(String(row[col(mapping, 'Level_2')] || '').trim())) return false;
  return true;
}

function passesDateRange(row, mapping, startPeriod, endPeriod) {
  const d = new Date(row[col(mapping, 'Risk_Inception_Month')]);
  if (isNaN(d.getTime())) return false;
  if (startPeriod && d < new Date(startPeriod)) return false;
  if (endPeriod && d > new Date(endPeriod)) return false;
  return true;
}

function scaleValue(value, scale, decimals) {
  return parseFloat((value / (SCALE_DIVISOR[scale] || 1)).toFixed(decimals ?? 0));
}

function buildTriangle(rows, mapping, params) {
  const { granularity = 'monthly', metric = 'paid', filters = {}, startPeriod = null,
    endPeriod = null, maxDelay = null, scale = 'units', decimals = 0 } = params;

  const filtered = rows.filter(row =>
    passesGranularityFlag(row, mapping, granularity) &&
    passesFilters(row, mapping, filters) &&
    passesDateRange(row, mapping, startPeriod, endPeriod)
  );

  const rawMatrix = {}, inceptionSet = new Set(), delaySet = new Set();

  filtered.forEach(row => {
    const inception = getInceptionKey(row, mapping, granularity);
    const delay = getDelayKey(row, mapping, granularity);
    const value = getMetricValue(row, mapping, metric);
    if (inception === null || isNaN(delay)) return;
    if (maxDelay !== null && delay > maxDelay) return;
    inceptionSet.add(inception);
    delaySet.add(delay);
    if (!rawMatrix[inception]) rawMatrix[inception] = {};
    rawMatrix[inception][delay] = (rawMatrix[inception][delay] || 0) + value;
  });

  const inceptionPeriods = Array.from(inceptionSet).sort();
  const delays = Array.from(delaySet).sort((a, b) => a - b);

  const matrix = {};
  inceptionPeriods.forEach(inc => {
    matrix[inc] = {};
    delays.forEach(d => {
      const raw = rawMatrix[inc]?.[d] ?? null;
      matrix[inc][d] = raw !== null ? scaleValue(raw, scale, decimals) : null;
    });
  });

  const byInception = {};
  inceptionPeriods.forEach(inc => {
    byInception[inc] = scaleValue(delays.reduce((s, d) => s + (rawMatrix[inc]?.[d] || 0), 0), scale, decimals);
  });
  const byDelay = {};
  delays.forEach(d => {
    byDelay[d] = scaleValue(inceptionPeriods.reduce((s, inc) => s + (rawMatrix[inc]?.[d] || 0), 0), scale, decimals);
  });

  return {
    inceptionPeriods, delays, matrix,
    grandTotals: { byInception, byDelay },
    meta: { granularity, metric, scale, decimals, rowsUsed: filtered.length, totalRows: rows.length },
  };
}

function getFilterOptions(rows, mapping) {
  const l1 = new Set(), l2 = new Set();
  rows.forEach(row => {
    const v1 = row[col(mapping, 'Level_1')]; if (v1) l1.add(String(v1).trim());
    const v2 = row[col(mapping, 'Level_2')]; if (v2) l2.add(String(v2).trim());
  });
  return { level1: Array.from(l1).sort(), level2: Array.from(l2).sort() };
}

module.exports = { buildTriangle, getFilterOptions, formatPeriodKey };