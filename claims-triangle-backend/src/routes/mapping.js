const express  = require('express');
const router   = express.Router();
const supabase = require('../config/db');
const { REQUIRED_MAPPED_FIELDS } = require('../engine/validator');

// GET /api/mapping/fields/required
router.get('/fields/required', (req, res) => {
  res.json({ success: true, fields: REQUIRED_MAPPED_FIELDS });
});

// GET /api/mapping/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('column_mappings').select('*').eq('project_id', req.params.projectId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, mapping: data || null });
  } catch (err) { next(err); }
});

// POST /api/mapping/:projectId — save / update
router.post('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { mapping }   = req.body;
    if (!mapping || typeof mapping !== 'object')
      throw Object.assign(new Error('mapping object is required'), { status: 400 });
    const missing = REQUIRED_MAPPED_FIELDS.filter(f => !mapping[f]);
    if (missing.length)
      throw Object.assign(new Error('Mapping incomplete. Missing: ' + missing.join(', ')), { status: 400 });
    const { data, error } = await supabase
      .from('column_mappings')
      .upsert({ project_id: projectId, mapping, updated_at: new Date().toISOString() }, { onConflict: 'project_id' })
      .select().single();
    if (error) throw error;
    res.json({ success: true, mapping: data });
  } catch (err) { next(err); }
});

module.exports = router;
