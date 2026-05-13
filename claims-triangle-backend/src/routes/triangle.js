const express  = require('express');
const router   = express.Router();
const supabase = require('../config/db');
const { buildTriangle, getFilterOptions } = require('../engine/triangleEngine');

// POST /api/triangle/:projectId — generate triangle
router.post('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [projRes, mapRes, dataRes] = await Promise.all([
      supabase.from('projects').select('parameters').eq('id',projectId).single(),
      supabase.from('column_mappings').select('mapping').eq('project_id',projectId).single(),
      supabase.from('uploaded_data').select('row_data').eq('project_id',projectId),
    ]);

    if (projRes.error) throw Object.assign(new Error('Project not found'), { status: 404 });
    if (mapRes.error)  throw Object.assign(new Error('No column mapping found — complete mapping step first'), { status: 400 });
    if (!dataRes.data?.length) throw Object.assign(new Error('No data found — upload a file first'), { status: 400 });

    const rows    = dataRes.data.map(r => r.row_data);
    const mapping = mapRes.data.mapping;
    const p       = projRes.data.parameters;
    const params  = req.body;

    const parsedMinDelay = Number(params.minDelay);
    const parsedMaxDelay = Number(params.maxDelay);
    const projectMaxDelay = Number(p.maxDelay);

    const engineParams = {
      granularity: params.granularity || 'monthly',
      metric:      params.metric      || 'paid',
      filters:     params.filters     || {},
      scale:       params.scale       || 'units',
      decimals:    params.decimals    ?? 0,
      startPeriod: params.startPeriod || p.startPeriod || null,
      endPeriod:   params.endPeriod   || p.endPeriod   || null,
      minDelay:    Number.isFinite(parsedMinDelay) ? parsedMinDelay : null,
      maxDelay:    Number.isFinite(parsedMaxDelay)
        ? parsedMaxDelay
        : (Number.isFinite(projectMaxDelay) ? projectMaxDelay : null),
    };

    const triangle = buildTriangle(rows, mapping, engineParams);

    // Persist view state for next visit
    await supabase.from('view_states').upsert({
      project_id:  projectId,
      granularity: engineParams.granularity,
      metric:      engineParams.metric,
      filters:     engineParams.filters,
      scale:       engineParams.scale,
      decimals:    engineParams.decimals,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'project_id' });

    res.json({ success: true, triangle });
  } catch (err) { next(err); }
});

// GET /api/triangle/:projectId/filters — dropdown values
router.get('/:projectId/filters', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [mapRes, dataRes] = await Promise.all([
      supabase.from('column_mappings').select('mapping').eq('project_id',projectId).single(),
      supabase.from('uploaded_data').select('row_data').eq('project_id',projectId),
    ]);
    if (mapRes.error) throw Object.assign(new Error('No mapping found'), { status: 400 });
    const options = getFilterOptions(dataRes.data.map(r=>r.row_data), mapRes.data.mapping);
    res.json({ success: true, options });
  } catch (err) { next(err); }
});

// GET /api/triangle/:projectId/viewstate — restore last state
router.get('/:projectId/viewstate', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('view_states').select('*').eq('project_id',req.params.projectId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, viewState: data || null });
  } catch (err) { next(err); }
});

module.exports = router;
