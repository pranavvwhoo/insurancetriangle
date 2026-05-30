import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectHomePage({ projects = [], loading, onOpenProject, onCreateProject, onEditMapping, onUploadFile }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated_at');

  const sortedProjects = useMemo(() => {
    const items = [...projects];
    if (sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
    return items;
  }, [projects, sort]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedProjects;
    return sortedProjects.filter((project) =>
      project.name.toLowerCase().includes(q)
    );
  }, [query, sortedProjects]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-300/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-700">Projects</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Choose your analysis workspace</h1>
              <p className="max-w-xl text-slate-600">
                Open a project to jump straight into the analytics dashboard. Then refine filters and save your workspace
                state as you explore claim development.
              </p>
            </div>
            <Button variant="secondary" size="lg" onClick={onCreateProject} className="w-full lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-300/10">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Total</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">{projects.length}</p>
              <p className="mt-2 text-sm text-slate-500">Projects available to open</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-300/10">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Sorted by</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">{sort === 'name' ? 'Name' : 'Recently modified'}</p>
              <p className="mt-2 text-sm text-slate-500">Click a project card to open it.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-300/10">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Updated</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">{projects.filter((project) => project.updated_at).length}</p>
              <p className="mt-2 text-sm text-slate-500">Projects modified recently.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900">Your projects</h2>
                <p className="mt-1 text-sm text-slate-500">Search, sort, and open the project you want to analyze next.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-auto">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a project"
                    className="pl-10 text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-500">Sort</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="updated_at">Last modified</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(loading ? Array.from({ length: 3 }) : filteredProjects).map((project, index) => (
                <div
                  key={project?.id ?? index}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{project?.name ?? 'Loading...'}</h3>
                    {project ? (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                        {project.updated_at ? 'Modified' : 'New'}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {project?.parameters?.label || 'Project workspace with triangle analytics.'}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span>Last modified</span>
                    <span className="font-medium text-slate-900">{project ? formatDate(project.updated_at) : '—'}</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => project && onOpenProject(project.id)}
                      disabled={!project}
                      className="w-full justify-center gap-2"
                    >
                      Open project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => project && onEditMapping(project.id)}
                        disabled={!project}
                        className="w-full"
                      >
                        Edit mapping
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => project && onUploadFile(project.id)}
                        disabled={!project}
                        className="w-full"
                      >
                        Upload file
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-300/10">
            <h2 className="text-lg font-semibold text-slate-900">Project guidance</h2>
            <Separator className="my-4 border-slate-200" />
            <div className="space-y-4 text-sm text-slate-600">
              <p>Pick a project to open the analytics workspace. Once opened, you can save settings and refine your triangle view.</p>
              <p>The home page now includes a polished project gallery with last modified timestamps and a cleaner selection flow.</p>
              <p>Use the filters and display panel inside the workspace to shape your analysis view.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
