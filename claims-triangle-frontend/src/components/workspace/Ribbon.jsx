import {
  Activity,
  ChevronDown,
  Database,
  FolderOpen,
  Layers,
  Plus,
  Save,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getApiBase } from '@/lib/api';

export function Ribbon({
  section,
  onSectionChange,
  projects,
  selectedProjectId,
  onProjectChange,
  onNewProject,
  onOpenUpload,
  onSaveWorkspace,
  saving,
  loadingProjects,
}) {
  const current = projects?.find((p) => p.id === selectedProjectId);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-900/30">
            <Layers className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-800 md:text-lg">
                Claims Triangle Analytics
              </h1>
              <Badge variant="outline" className="hidden text-[10px] font-normal sm:inline-flex">
                Workspace
              </Badge>
            </div>
            <p className="truncate text-xs text-slate-600">
              Model triangles faster than Excel · Heat-coded insight ·{' '}
              <span className="tabular-nums text-slate-600">{getApiBase()}</span>
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-10 md:block" />

        <Tabs value={section} onValueChange={onSectionChange} className="flex-1">
          <TabsList className="h-9">
            <TabsTrigger value="triangle" className="gap-1.5 px-3">
              <Activity className="h-3.5 w-3.5" />
              Triangle
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5 px-3">
              <Database className="h-3.5 w-3.5" />
              Data & mapping
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loadingProjects} className="max-w-[220px] justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <FolderOpen className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="truncate">
                    {current?.name || 'Select project'}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Projects</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(projects || []).length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-500">No projects yet.</div>
              ) : (
                projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => onProjectChange(p.id)}>
                    <span className="truncate">{p.name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="sm" onClick={onNewProject}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a new analysis project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="sm" onClick={onOpenUpload} disabled={!selectedProjectId}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload CSV / Excel and map columns</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" size="sm" onClick={onSaveWorkspace} disabled={!selectedProjectId || saving}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save project metadata (server timestamps)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
