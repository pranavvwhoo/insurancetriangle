const REQUIRED_MAPPED_FIELDS = [
  'Risk_Inception_Month','Data_Month','Delay_Month','Delay_Quarter','Delay_Year',
  'Quarter_Flag','Year_Flag','Level_1','Level_2',
  'Paid_Amount','Reported_Amount','Reported_Count',
];

function isValidDate(v) { if (!v) return false; return !isNaN(new Date(v).getTime()); }
function isNumeric(v)   { if (v === null || v === undefined || v === '') return false; return !isNaN(Number(v)); }

function validateData(rows, mapping) {
  const errors = [], warnings = [];

  // CHECK 1: Missing values
  const missingByField = {};
  REQUIRED_MAPPED_FIELDS.forEach(f => {
    const col = mapping[f]; if (!col) return;
    const n = rows.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length;
    if (n > 0) missingByField[f] = n;
  });
  if (Object.keys(missingByField).length > 0)
    errors.push({ check: 'missing_values', message: 'Missing values: ' + Object.entries(missingByField).map(([f,c])=>f+': '+c+' missing').join(', ') });

  // CHECK 2: Invalid dates
  const dateFields = ['Risk_Inception_Month','Data_Month'];
  const badDates = [];
  dateFields.forEach(f => {
    const col = mapping[f]; if (!col) return;
    rows.forEach((r,i) => { const v=r[col]; if (v && !isValidDate(v)) badDates.push({row:i+2,field:f,value:v}); });
  });
  if (badDates.length > 0)
    errors.push({ check: 'invalid_dates', message: 'Invalid dates in ' + badDates.length + ' row(s)', detail: badDates.slice(0,10) });

  // CHECK 3: Negative values
  const numFields = ['Paid_Amount','Reported_Amount','Reported_Count'];
  const negRows = [];
  numFields.forEach(f => {
    const col = mapping[f]; if (!col) return;
    rows.forEach((r,i) => { const v=Number(r[col]); if (!isNaN(v) && v < 0) negRows.push({row:i+2,field:f,value:v}); });
  });
  if (negRows.length > 0)
    errors.push({ check: 'negative_values', message: 'Negative values in ' + negRows.length + ' row(s)', detail: negRows.slice(0,10) });

  // CHECK 4: Paid > Reported
  const paidCol = mapping['Paid_Amount'], repCol = mapping['Reported_Amount'];
  const paidOverReported = [];
  if (paidCol && repCol)
    rows.forEach((r,i) => {
      const p=Number(r[paidCol]), rep=Number(r[repCol]);
      if (!isNaN(p) && !isNaN(rep) && p > rep) paidOverReported.push({row:i+2,paid:p,reported:rep});
    });
  if (paidOverReported.length > 0)
    errors.push({ check: 'paid_exceeds_reported', message: 'Paid > Reported in ' + paidOverReported.length + ' row(s) — actuarial rule violation', detail: paidOverReported.slice(0,10) });

  // CHECK 5: Non-numeric amounts
  const nonNum = [];
  numFields.forEach(f => {
    const col = mapping[f]; if (!col) return;
    rows.forEach((r,i) => { const v=r[col]; if (v !== null && v !== undefined && v !== '' && !isNumeric(v)) nonNum.push({row:i+2,field:f,value:v}); });
  });
  if (nonNum.length > 0)
    errors.push({ check: 'non_numeric_amounts', message: 'Non-numeric values in amount columns: ' + nonNum.length + ' row(s)', detail: nonNum.slice(0,10) });

  // CHECK 6: Delay sanity (warning only)
  const delayCol = mapping['Delay_Month'];
  const delayWarn = [];
  if (delayCol) rows.forEach((r,i) => { const v=Number(r[delayCol]); if (!isNaN(v) && (v<0||v>500)) delayWarn.push({row:i+2,delay:v}); });
  if (delayWarn.length > 0)
    warnings.push({ check: 'unusual_delay', message: delayWarn.length + ' row(s) with unusual delay values', detail: delayWarn.slice(0,10) });

  return { valid: errors.length === 0, errors, warnings, rowCount: rows.length };
}

module.exports = { validateData, REQUIRED_MAPPED_FIELDS };
