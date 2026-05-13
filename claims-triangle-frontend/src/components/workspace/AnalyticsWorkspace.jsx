import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ControlsPanel } from '@/components/workspace/ControlsPanel';
import { DataMappingDialog } from '@/components/workspace/DataMappingDialog';
import { FilterPanel } from '@/components/workspace/FilterPanel';
import { NewProjectDialog } from '@/components/workspace/NewProjectDialog';
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

  const [filterOptions, setFilterOptions] = useState({ level1: [], level2: [] });
  const [filters, setFilters] = useState({ level1: [], level2: [] });

  const [granularity, setGranularity] = useState('monthly');
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
  const [triangleLoading, setTriangleLoading] = useState(false);
  const [triangleError, setTriangleError] = useState(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setFilters({ level1: [], level2: [] });
      setFilterOptions({ level1: [], level2: [] });
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
          triangleApi.filters(selectedProjectId).catch(() => ({ options: { level1: [], level2: [] } })),
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
        setFilterOptions(fo.options || { level1: [], level2: [] });

        const vsData = vs.viewState;
        if (vsData) {
          setGranularity(vsData.granularity || 'monthly');
          setMetric(vsData.metric || 'paid');
          setScale(vsData.scale || 'units');
          setDecimals(clampDecimals(vsData.decimals ?? 0));
          const f = vsData.filters || {};
          setFilters({
            level1: Array.isArray(f.level1) ? f.level1 : [],
            level2: Array.isArray(f.level2) ? f.level2 : [],
          });
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
          granularity,
          metric,
          scale,
          decimals: clampDecimals(decimals),
          filters: {
            level1: filters.level1,
            level2: filters.level2,
          },
          startPeriod,
          endPeriod,
          minDelay,
          maxDelay,
        };
        const r = await triangleApi.build(selectedProjectId, body);
        if (!cancelled) setTriangle(r.triangle || null);
      } catch (e) {
        if (!cancelled) {
          setTriangle(null);
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
    granularity,
    metric,
    scale,
    decimals,
    filters.level1,
    filters.level2,
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

  async function refreshFiltersOnly() {
    if (!selectedProjectId) return;
    try {
      const fo = await triangleApi.filters(selectedProjectId);
      setFilterOptions(fo.options || { level1: [], level2: [] });
    } catch {
      /* ignore */
    }
  }

  const mappingSaved = Boolean(detail?.mapping?.mapping);
  const projectName = detail?.project?.name || projects.find((p) => p.id === selectedProjectId)?.name;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen flex-col overflow-auto bg-slate-50">
        <Ribbon
          section={section}
          onSectionChange={setSection}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          onNewProject={() => setNewProjectOpen(true)}
          onOpenUpload={() => setUploadOpen(true)}
          onSaveWorkspace={handleSaveWorkspace}
          saving={saving}
          loadingProjects={loadingProjects}
        />

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
          }}
        />

        {section === 'triangle' ? (
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

              <TriangleGrid triangle={triangle} rowSort={rowSort} className={triangleLoading ? 'opacity-70' : ''} />
            </main>

            <ControlsPanel
              granularity={granularity}
              onGranularityChange={setGranularity}
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
        ) : (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Data & column mapping</CardTitle>
                  <CardDescription>
                    Upload Excel or CSV, align columns to the engine&apos;s required fields once per project, then import
                    validated rows. The mapping is stored server-side and reused whenever you reopen this workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Badge variant={mappingSaved ? 'success' : 'warning'}>
                    Mapping: {mappingSaved ? 'configured' : 'not configured'}
                  </Badge>
                  <Badge variant="outline">Upload supports .csv and .xlsx (see backend limits)</Badge>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">Workflow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Create a project from the ribbon.</li>
                    <li>Open Upload — parse your sheet and map each required field to a column.</li>
                    <li>Validate, then import rows into the project.</li>
                    <li>
                      Switch to the Triangle tab; filters and heat-coded cells update instantly without full page reloads.
                    </li>
                  </ol>
                  <Button type="button" onClick={() => setUploadOpen(true)} disabled={!selectedProjectId}>
                    Open upload & mapping
                  </Button>
                  {!selectedProjectId ? (
                    <p className="text-xs text-amber-700">Select a project first.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
