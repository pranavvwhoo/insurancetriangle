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

function getInceptionKey(row, mapping, inceptionGranularity) {
  return formatPeriodKey(row[col(mapping, 'Risk_Inception_Month')], inceptionGranularity);
}

function getDelayKey(row, mapping, developmentGranularity) {
  if (developmentGranularity === 'monthly') return Number(row[col(mapping, 'Delay_Month')]);
  if (developmentGranularity === 'quarterly') return Number(row[col(mapping, 'Delay_Quarter')]);
  if (developmentGranularity === 'yearly') return Number(row[col(mapping, 'Delay_Year')]);
}

function getMetricValue(row, mapping, metric) {
  if (metric === 'paid') return cleanNum(row[col(mapping, 'Paid_Amount')] ?? 0);
  if (metric === 'reported') return cleanNum(row[col(mapping, 'Reported_Amount')] ?? 0);
  if (metric === 'count') return cleanNum(row[col(mapping, 'Reported_Count')] ?? 0);
  return 0;
}

function passesGranularityFlag(row, mapping, inceptionGranularity) {
  if (inceptionGranularity === 'monthly') return true;
  const flagField = inceptionGranularity === 'quarterly' ? 'Quarter_Flag' : 'Year_Flag';
  return String(row[col(mapping, flagField)] || '').toLowerCase() === 'yes';
}

function passesFilters(row, mapping, filters) {
  const segments = filters?.segments || [];
  if (segments.length === 0) return true;
  
  const v1 = String(row[col(mapping, 'Level_1')] || '').trim();
  const v2 = String(row[col(mapping, 'Level_2')] || '').trim();
  
  if (v1) {
    if (segments.includes(`${v1} - Combined`)) return true;
    if (v2 && segments.includes(`${v1} - ${v2}`)) return true;
  }
  return false;
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
  const { inceptionGranularity = 'monthly', developmentGranularity = 'monthly', metric = 'paid', filters = {}, startPeriod = null,
    endPeriod = null, minDelay = null, maxDelay = null, scale = 'units', decimals = 0 } = params;

  const filtered = rows.filter(row =>
    passesGranularityFlag(row, mapping, inceptionGranularity) &&
    passesFilters(row, mapping, filters) &&
    passesDateRange(row, mapping, startPeriod, endPeriod)
  );

  const rawMatrix = {}, inceptionSet = new Set(), delaySet = new Set();

  filtered.forEach(row => {
    const inception = getInceptionKey(row, mapping, inceptionGranularity);
    const delay = getDelayKey(row, mapping, developmentGranularity);
    const value = getMetricValue(row, mapping, metric);
    if (inception === null || isNaN(delay)) return;
    if (minDelay !== null && delay < minDelay) return;
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
    meta: { inceptionGranularity, developmentGranularity, metric, scale, decimals, rowsUsed: filtered.length, totalRows: rows.length },
  };
}

function getFilterOptions(rows, mapping) {
  const segmentsSet = new Set();
  rows.forEach(row => {
    const v1 = String(row[col(mapping, 'Level_1')] || '').trim();
    const v2 = String(row[col(mapping, 'Level_2')] || '').trim();
    if (v1) {
      segmentsSet.add(`${v1} - Combined`);
      if (v2) {
        segmentsSet.add(`${v1} - ${v2}`);
      }
    }
  });
  return { segments: Array.from(segmentsSet).sort() };
}

module.exports = { buildTriangle, getFilterOptions, formatPeriodKey };