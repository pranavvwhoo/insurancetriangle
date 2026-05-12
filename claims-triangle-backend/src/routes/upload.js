const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const supabase = require('../config/db');
const { parseFile }    = require('../engine/parser');
const { validateData } = require('../engine/validator');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel','text/csv','application/csv',
    ];
    ok.includes(file.mimetype) ? cb(null,true) : cb(new Error('Only Excel or CSV files accepted'), false);
  },
});

// POST /api/upload/parse — parse + preview (no save)
router.post('/parse', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('No file uploaded'), { status: 400 });
    const parsed = parseFile(req.file.buffer, req.file.mimetype, req.query.sheet || null);
    res.json({
      success: true,
      sheetNames: parsed.sheetNames, activeSheet: parsed.activeSheet,
      headers: parsed.headers, preview: parsed.rows.slice(0,10), totalRows: parsed.rows.length,
    });
  } catch (err) { next(err); }
});

// POST /api/upload/validate — validate against mapping (no save)
router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('No file uploaded'), { status: 400 });
    let mapping;
    try { mapping = JSON.parse(req.body.mapping || '{}'); }
    catch { throw Object.assign(new Error('Invalid mapping JSON'), { status: 400 }); }
    const parsed = parseFile(req.file.buffer, req.file.mimetype, req.body.sheet || null);
    const result = validateData(parsed.rows, mapping);
    res.json({ success: true, valid: result.valid, errors: result.errors, warnings: result.warnings, rowCount: result.rowCount });
  } catch (err) { next(err); }
});

// POST /api/upload/save/:projectId — validate + persist rows
router.post('/save/:projectId', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('No file uploaded'), { status: 400 });
    const { projectId } = req.params;
    let mapping;
    try { mapping = JSON.parse(req.body.mapping || '{}'); }
    catch { throw Object.assign(new Error('Invalid mapping JSON'), { status: 400 }); }

    const parsed     = parseFile(req.file.buffer, req.file.mimetype, req.body.sheet || null);
    const validation = validateData(parsed.rows, mapping);

    if (!validation.valid) {
      return res.status(422).json({
        success: false, message: 'Data failed validation',
        errors: validation.errors, warnings: validation.warnings,
      });
    }

    // Clear old rows and insert new
    await supabase.from('uploaded_data').delete().eq('project_id', projectId);

    const CHUNK = 1000;
    for (let i = 0; i < parsed.rows.length; i += CHUNK) {
      const chunk = parsed.rows.slice(i, i+CHUNK).map(row => ({ project_id: projectId, row_data: row }));
      const { error } = await supabase.from('uploaded_data').insert(chunk);
      if (error) throw error;
    }

    await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId);

    res.json({ success: true, message: parsed.rows.length + ' rows saved', rowCount: parsed.rows.length, warnings: validation.warnings });
  } catch (err) { next(err); }
});

module.exports = router;
