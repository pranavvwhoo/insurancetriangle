import { useMemo, useState } from 'react';
import { Filter, PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function toggleMember(arr, value) {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function MultiList({
  label,
  hint,
  options,
  selected,
  onChange,
  search,
  onSearchChange,
  idPrefix,
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-slate-700">{label}</Label>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{hint}</span>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          id={`${idPrefix}-search`}
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <ScrollArea className="h-[180px] rounded-md border border-slate-200 bg-white">
        <div className="space-y-1 p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500">No matches.</p>
          ) : (
            filtered.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-100',
                    checked && 'bg-cyan-50'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onChange(toggleMember(selected, opt))}
                  />
                  <span className="truncate text-slate-700">{opt}</span>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
      <p className="text-[11px] leading-snug text-slate-500">
        Leave all unchecked to include every value. Select one or more to restrict the triangle.
      </p>
    </div>
  );
}

export function FilterPanel({
  open,
  onOpenChange,
  options,
  filters,
  onFiltersChange,
  disabled,
}) {
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');

  const level1 = options?.level1 || [];
  const level2 = options?.level2 || [];

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200',
        open ? 'min-w-0 md:w-[320px]' : 'md:w-[52px]'
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="h-4 w-4 text-cyan-600" />
          Filters
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0" aria-label="Toggle filters panel">
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="min-h-0 flex-1 data-[state=closed]:hidden">
        <Card className="m-2 border-slate-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Segmentation</CardTitle>
            <p className="text-xs text-slate-500">
              Product names map to <code className="text-slate-600">Level_1</code>; large-claim style
              categories map to <code className="text-slate-600">Level_2</code>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <MultiList
              idPrefix="l1"
              label="Product name"
              hint="Level 1"
              options={level1}
              selected={filters.level1}
              onChange={(next) => onFiltersChange({ ...filters, level1: next })}
              search={q1}
              onSearchChange={setQ1}
            />
            <Separator />
            <MultiList
              idPrefix="l2"
              label="Large claim category"
              hint="Level 2"
              options={level2}
              selected={filters.level2}
              onChange={(next) => onFiltersChange({ ...filters, level2: next })}
              search={q2}
              onSearchChange={setQ2}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={disabled || (!filters.level1.length && !filters.level2.length)}
              onClick={() => onFiltersChange({ level1: [], level2: [] })}
            >
              Clear segment filters
            </Button>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
