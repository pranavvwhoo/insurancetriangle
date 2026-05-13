import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const emptyForm = () => ({
  name: '',
  label: '',
  startPeriod: '',
  endPeriod: '',
  maxDelay: '191',
});

export function NewProjectDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreated({
        name: form.name.trim(),
        parameters: {
          label: form.label.trim() || form.name.trim(),
          startPeriod: form.startPeriod,
          endPeriod: form.endPeriod,
          maxDelay: Number(form.maxDelay) || 191,
        },
      });
      setForm(emptyForm());
      onOpenChange(false);
    } catch {
      /* Parent may toast; keep dialog open */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects hold parameters, uploads, saved mapping, and your last triangle view state.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Project name</Label>
            <Input
              id="proj-name"
              required
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Motor FY2024"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-label">Label</Label>
            <Input
              id="proj-label"
              value={form.label}
              onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
              placeholder="Shown in reports"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start period</Label>
              <Input
                id="start"
                type="date"
                required
                value={form.startPeriod}
                onChange={(e) => setForm((s) => ({ ...s, startPeriod: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End period</Label>
              <Input
                id="end"
                type="date"
                required
                value={form.endPeriod}
                onChange={(e) => setForm((s) => ({ ...s, endPeriod: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-delay">Max delay (development periods)</Label>
            <Input
              id="max-delay"
              type="number"
              min={1}
              value={form.maxDelay}
              onChange={(e) => setForm((s) => ({ ...s, maxDelay: e.target.value }))}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
