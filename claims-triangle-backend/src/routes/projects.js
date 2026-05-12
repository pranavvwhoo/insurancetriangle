const express  = require('express');
const router   = express.Router();
const supabase = require('../config/db');

// GET /api/projects — list all
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('projects').select('id,name,parameters,created_at,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, projects: data });
  } catch (err) { next(err); }
});

// GET /api/projects/:id — single project with full state
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [pr, mr, vr] = await Promise.all([
      supabase.from('projects').select('*').eq('id',id).single(),
      supabase.from('column_mappings').select('*').eq('project_id',id).single(),
      supabase.from('view_states').select('*').eq('project_id',id).single(),
    ]);
    if (pr.error) throw pr.error;
    res.json({ success: true, project: pr.data, mapping: mr.data||null, viewState: vr.data||null });
  } catch (err) { next(err); }
});

// POST /api/projects — create
router.post('/', async (req, res, next) => {
  try {
    const { name, parameters } = req.body;
    if (!name?.trim()) throw Object.assign(new Error('Project name is required'), { status: 400 });
    const required = ['label','startPeriod','endPeriod','maxDelay'];
    const missing  = required.filter(p => !parameters?.[p]);
    if (missing.length) throw Object.assign(new Error('Missing parameters: ' + missing.join(', ')), { status: 400 });
    const { data, error } = await supabase.from('projects').insert({ name: name.trim(), parameters }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, project: data });
  } catch (err) { next(err); }
});

// PUT /api/projects/:id — update
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parameters } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name)       updates.name       = name.trim();
    if (parameters) updates.parameters = parameters;
    const { data, error } = await supabase.from('projects').update(updates).eq('id',id).select().single();
    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id — delete + cascade
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
