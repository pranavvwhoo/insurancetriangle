import { Layers, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Ribbon({ projectName, onSaveWorkspace, onExitProject, saving, onDeleteProject, deleting }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/20">
            <Layers className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm uppercase tracking-[0.25em] text-slate-500">Project</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">{projectName || 'Untitled project'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExitProject}>
            Projects
          </Button>
          <Button variant="outline" size="sm" onClick={onDeleteProject} disabled={deleting}>
            Delete
          </Button>
          <Button variant="default" size="sm" onClick={onSaveWorkspace} disabled={saving || deleting}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    </header>
  );
}
