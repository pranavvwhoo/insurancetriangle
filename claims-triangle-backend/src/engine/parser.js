const XLSX = require('xlsx');

function parseFile(buffer, mimetype, sheetName = null) {
  const isCSV = mimetype === 'text/csv' || mimetype === 'application/csv';
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const targetSheet = isCSV ? sheetNames[0] : (sheetName || sheetNames[0]);

  if (!sheetNames.includes(targetSheet)) {
    const err = new Error('Sheet "' + targetSheet + '" not found in uploaded file');
    err.status = 400;
    throw err;
  }

  const worksheet = workbook.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

  if (rows.length === 0) {
    const err = new Error('The selected sheet contains no data rows');
    err.status = 400;
    throw err;
  }

  const headers = Object.keys(rows[0]);
  return { sheetNames, rows, headers, activeSheet: targetSheet };
}

module.exports = { parseFile };
