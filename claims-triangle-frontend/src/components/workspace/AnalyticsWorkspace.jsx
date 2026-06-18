import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ControlsPanel } from '@/components/workspace/ControlsPanel';
import { DataMappingDialog } from '@/components/workspace/DataMappingDialog';
import { FilterPanel } from '@/components/workspace/FilterPanel';
import { NewProjectDialog } from '@/components/workspace/NewProjectDialog';
import { ProjectHomePage } from '@/components/workspace/ProjectHomePage';
import { Ribbon } from '@/components/workspace/Ribbon';
import { TriangleGrid } from '@/components/workspace/TriangleGrid';
import { projectsApi, triangleApi } from '@/lib/api';

function clampDecimals(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.min(6, Math.max(0, Math.round(x)));
}

export function AnalyticsWorkspace() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  /** Full GET /api/projects/:id payload */
  const [detail, setDetail] = useState(null);

  const [section, setSection] = useState('triangle');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [filterOptions, setFilterOptions] = useState({ segments: [] });
  const [filters, setFilters] = useState({ segments: [] });

  const [inceptionGranularity, setInceptionGranularity] = useState('monthly');
  const [developmentGranularity, setDevelopmentGranularity] = useState('monthly');
  const [metric, setMetric] = useState('paid');
  const [scale, setScale] = useState('units');
  const [decimals, setDecimals] = useState(0);
  const [rowSort, setRowSort] = useState('asc');
  const [startPeriod, setStartPeriod] = useState(null);
  const [endPeriod, setEndPeriod] = useState(null);
  const [minDelay, setMinDelay] = useState(null);
  const [maxDelay, setMaxDelay] = useState(null);
  const [autoSave, setAutoSave] = useState(true);

  const [triangle, setTriangle] = useState(null);
  const [triangleMeta, setTriangleMeta] = useState(null);
  const [triangleLoading, setTriangleLoading] = useState(false);
  const [triangleError, setTriangleError] = useState(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Bump after uploads so triangle refetches even if slice controls are unchanged */
  const [dataRevision, setDataRevision] = useState(0);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const r = await projectsApi.list();
      setProjects(r.projects || []);
    } catch (e) {
      setTriangleError(e.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setDetail(null);
      setFilters({ segments: [] });
      setFilterOptions({ segments: [] });
      setTriangle(null);
      setTriangleError(null);
      setStartPeriod(null);
      setEndPeriod(null);
      setMinDelay(null);
      setMaxDelay(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [projBundle, vs, fo] = await Promise.all([
          projectsApi.get(selectedProjectId),
          triangleApi.viewState(selectedProjectId).catch(() => ({ viewState: null })),
          triangleApi.filters(selectedProjectId).catch(() => ({ options: { segments: [] } })),
        ]);
        if (cancelled) return;

        setDetail(projBundle);
        setStartPeriod(projBundle?.project?.parameters?.startPeriod || null);
        setEndPeriod(projBundle?.project?.parameters?.endPeriod || null);
        setMaxDelay(
          Number.isFinite(Number(projBundle?.project?.parameters?.maxDelay))
            ? Number(projBundle.project.parameters.maxDelay)
            : null
        );
        setMinDelay(null);
        setFilterOptions(fo.options || { segments: [] });

        const vsData = vs.viewState;
        if (vsData) {
          setInceptionGranularity(vsData.inceptionGranularity || 'monthly');
          setDevelopmentGranularity(vsData.developmentGranularity || 'monthly');
          setMetric(vsData.metric || 'paid');
          setScale(vsData.scale || 'units');
          setDecimals(clampDecimals(vsData.decimals ?? 0));
          const f = vsData.filters || {};
          setFilters(sanitizeFilters({
            segments: Array.isArray(f.segments) ? f.segments : [],
          }, fo.options || { segments: [] }));
        }
      } catch (e) {
        if (!cancelled) setTriangleError(e.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || section !== 'triangle') return;

    let cancelled = false;
    (async () => {
      setTriangleLoading(true);
      setTriangleError(null);
      try {
        const body = {
          inceptionGranularity,
          developmentGranularity,
          metric,
          scale,
          decimals: clampDecimals(decimals),
          filters: {
            segments: filters.segments,
          },
          startPeriod,
          endPeriod,
          minDelay,
          maxDelay,
        };
        const r = await triangleApi.build(selectedProjectId, body);
        if (!cancelled) {
          setTriangle(r.triangle || null);
          setTriangleMeta(r.triangle?.meta || null);
        }
      } catch (e) {
        if (!cancelled) {
          setTriangle(null);
          setTriangleMeta(null);
          setTriangleError(e.message);
        }
      } finally {
        if (!cancelled) setTriangleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedProjectId,
    section,
    inceptionGranularity,
    developmentGranularity,
    metric,
    scale,
    decimals,
    filters.segments,
    startPeriod,
    endPeriod,
    minDelay,
    maxDelay,
    dataRevision,
  ]);

  useEffect(() => {
    if (!autoSave || !selectedProjectId || !detail?.project) return;
    const timer = setTimeout(async () => {
      try {
        await projectsApi.update(selectedProjectId, {
          parameters: {
            ...detail.project.parameters,
            startPeriod: startPeriod || null,
            endPeriod: endPeriod || null,
            maxDelay: maxDelay ?? detail.project.parameters?.maxDelay ?? null,
          },
        });
      } catch {
        /* keep UI responsive even if autosave fails */
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [autoSave, selectedProjectId, detail?.project, startPeriod, endPeriod, maxDelay]);

  async function handleCreateProject(payload) {
    const r = await projectsApi.create(payload);
    const p = r.project;
    setProjects((list) => [p, ...list.filter((x) => x.id !== p.id)]);
    setSelectedProjectId(p.id);
    await refreshProjects();
    // After creating a project, prompt the user to upload data and map columns
    setUploadOpen(true);
  }

  async function handleSaveWorkspace() {
    if (!selectedProjectId || !detail?.project) return;
    setSaving(true);
    try {
      await projectsApi.update(selectedProjectId, {
        name: detail.project.name,
        parameters: detail.project.parameters,
      });
      await refreshProjects();
      const bundle = await projectsApi.get(selectedProjectId);
      setDetail(bundle);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) return;
    const ok = window.confirm('Delete this project and all imported data? This cannot be undone. Continue?');
    if (!ok) return;
    setDeleting(true);
    try {
      await projectsApi.remove(selectedProjectId);
      await refreshProjects();
      handleExitProject();
    } catch (e) {
      setTriangleError(e.message || String(e));
    } finally {
      setDeleting(false);
    }
  }

  function sanitizeFilters(filters, options) {
    const segmentsOpts = options?.segments || [];
    return {
      segments: Array.isArray(filters.segments)
        ? filters.segments.filter((value) => segmentsOpts.includes(value))
        : [],
    };
  }

  async function refreshFiltersOnly() {
    if (!selectedProjectId) return;
    try {
      const fo = await triangleApi.filters(selectedProjectId);
      const nextOptions = fo.options || { segments: [] };
      setFilterOptions(nextOptions);
      setFilters((current) => sanitizeFilters(current, nextOptions));
    } catch {
      /* ignore */
    }
  }

  function handleResetFilters() {
    setFilters({ segments: [] });
    setStartPeriod(null);
    setEndPeriod(null);
    setMinDelay(null);
    setMaxDelay(null);
  }

  const mappingSaved = Boolean(detail?.mapping?.mapping);
  const projectName = detail?.project?.name || projects.find((p) => p.id === selectedProjectId)?.name;

  function handleExitProject() {
    setSelectedProjectId(null);
    setDetail(null);
    setFilters({ segments: [] });
    setFilterOptions({ segments: [] });
    setTriangle(null);
    setTriangleError(null);
    setStartPeriod(null);
    setEndPeriod(null);
    setMinDelay(null);
    setMaxDelay(null);
    setFiltersOpen(true);
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen flex-col overflow-auto bg-slate-50">
        {selectedProjectId ? (
          <Ribbon
            projectName={projectName}
            onSaveWorkspace={handleSaveWorkspace}
            onExitProject={handleExitProject}
            onDeleteProject={handleDeleteProject}
            saving={saving}
            deleting={deleting}
          />
        ) : null}

        <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} onCreated={handleCreateProject} />

        <DataMappingDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          projectId={selectedProjectId}
          onCompleted={async () => {
            setDataRevision((x) => x + 1);
            const bundle = await projectsApi.get(selectedProjectId);
            setDetail(bundle);
            await refreshFiltersOnly();
            // Immediately request a triangle build so the UI shows the imported data
            try {
              setTriangleLoading(true);
              setTriangleError(null);
              const body = {
                inceptionGranularity,
                developmentGranularity,
                metric,
                scale,
                decimals: clampDecimals(decimals),
                filters: {
                  segments: filters.segments,
                },
                startPeriod,
                endPeriod,
                minDelay,
                maxDelay,
              };
              const resp = await triangleApi.build(selectedProjectId, body).catch((e) => {
                throw e;
              });
              setTriangle(resp.triangle || null);
              setTriangleMeta(resp.triangle?.meta || null);
              const meta = resp.triangle?.meta;
              console.debug('Triangle build response meta:', meta);
              if (meta) {
                if ((meta.totalRows ?? 0) === 0) {
                  setTriangleError('No uploaded rows found for this project — upload a dataset first.');
                } else if ((meta.rowsUsed ?? 0) === 0) {
                  setTriangleError('No rows matched the current filters/date range — try clearing filters or widening the date range.');
                } else {
                  setTriangleError(null);
                }
              }
            } catch (e) {
              setTriangle(null);
              setTriangleError(e.message || String(e));
            } finally {
              setTriangleLoading(false);
            }
          }}
        />

        {!selectedProjectId ? (
          <ProjectHomePage
            projects={projects}
            loading={loadingProjects}
            onOpenProject={(id) => setSelectedProjectId(id)}
            onCreateProject={() => setNewProjectOpen(true)}
            onEditMapping={(id) => {
              setSelectedProjectId(id);
              setUploadOpen(true);
            }}
            onUploadFile={(id) => {
              setSelectedProjectId(id);
              setUploadOpen(true);
            }}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <FilterPanel
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              options={filterOptions}
              filters={filters}
              onFiltersChange={setFilters}
              disabled={!selectedProjectId || triangleLoading}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-3 md:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {projectName ? (
                      <>
                        Project: <span className="text-cyan-700">{projectName}</span>
                      </>
                    ) : (
                      'Select or create a project to begin'
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span>
                      Mapping:{' '}
                      <strong className={mappingSaved ? 'text-emerald-700' : 'text-amber-700'}>
                        {mappingSaved ? 'saved' : 'required'}
                      </strong>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="tabular-nums">
                      Tip: cells are heat-coded within the visible triangle for faster scanning than Excel.
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!filtersOpen && selectedProjectId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={triangleLoading}
                      onClick={() => setFiltersOpen(true)}
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedProjectId || triangleLoading}
                    onClick={handleResetFilters}
                  >
                    Reset filters
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedProjectId || triangleLoading}
                    onClick={() => setDataRevision((x) => x + 1)}
                  >
                    <RefreshCw className={`h-4 w-4 ${triangleLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {triangleError ? (
                <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">Triangle unavailable</p>
                    <p className="text-xs text-amber-800">{triangleError}</p>
                  </div>
                </div>
              ) : null}

              {triangleMeta ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold uppercase tracking-wider text-slate-500">Diagnostics</span>
                    <span>
                      Periods: <strong>{triangleMeta.inceptionPeriods?.length ?? 0}</strong>
                    </span>
                    <span>
                      Delays: <strong>{triangleMeta.delays?.length ?? 0}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      Filters: {filters.segments?.length ? `Segments (${filters.segments.length})` : 'All segments'}
                    </span>
                  </div>
                </div>
              ) : null}

              <TriangleGrid triangle={triangle} rowSort={rowSort} className={triangleLoading ? 'opacity-70' : ''} />
            </main>

            <ControlsPanel
              inceptionGranularity={inceptionGranularity}
              onInceptionGranularityChange={setInceptionGranularity}
              developmentGranularity={developmentGranularity}
              onDevelopmentGranularityChange={setDevelopmentGranularity}
              metric={metric}
              onMetricChange={setMetric}
              scale={scale}
              onScaleChange={setScale}
              decimals={decimals}
              onDecimalsChange={(n) => setDecimals(clampDecimals(n))}
              rowSort={rowSort}
              onRowSortChange={setRowSort}
              startPeriod={startPeriod}
              onStartPeriodChange={setStartPeriod}
              endPeriod={endPeriod}
              onEndPeriodChange={setEndPeriod}
              minDelay={minDelay}
              onMinDelayChange={setMinDelay}
              maxDelay={maxDelay}
              onMaxDelayChange={setMaxDelay}
              autoSave={autoSave}
              onAutoSaveChange={setAutoSave}
              disabled={!selectedProjectId || triangleLoading}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

