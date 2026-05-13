import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ControlsPanel({
  granularity,
  onGranularityChange,
  metric,
  onMetricChange,
  scale,
  onScaleChange,
  decimals,
  onDecimalsChange,
  rowSort,
  onRowSortChange,
  startPeriod,
  onStartPeriodChange,
  endPeriod,
  onEndPeriodChange,
  minDelay,
  onMinDelayChange,
  maxDelay,
  onMaxDelayChange,
  autoSave,
  onAutoSaveChange,
  disabled,
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-l border-slate-200 bg-white p-3 md:w-[300px] lg:w-[320px]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <SlidersHorizontal className="h-4 w-4 text-cyan-600" />
        Display & aggregation
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Triangle metric</CardTitle>
          <CardDescription className="text-xs">
            Switches the measure aggregated into each cell (calls the API with{' '}
            <code className="text-slate-600">metric</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={metric} onValueChange={onMetricChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="paid" disabled={disabled}>
                Paid
              </TabsTrigger>
              <TabsTrigger value="reported" disabled={disabled}>
                Reported
              </TabsTrigger>
              <TabsTrigger value="count" disabled={disabled}>
                Count
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              paid → Paid_Amount
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              reported → Reported_Amount
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              count → Reported_Count
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Development axis</CardTitle>
          <CardDescription className="text-xs">
            Monthly uses every row; quarterly/yearly respect Quarter_Flag / Year_Flag in your file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={granularity} onValueChange={onGranularityChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="monthly" disabled={disabled}>
                Monthly
              </TabsTrigger>
              <TabsTrigger value="quarterly" disabled={disabled}>
                Quarterly
              </TabsTrigger>
              <TabsTrigger value="yearly" disabled={disabled}>
                Yearly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Units & precision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Scale</Label>
            <select
              disabled={disabled}
              value={scale}
              onChange={(e) => onScaleChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
            >
              <option value="units">Units</option>
              <option value="thousands">Thousands</option>
              <option value="lakhs">Lakhs</option>
              <option value="crores">Crores</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decimals" className="text-xs text-slate-600">
              Decimal places (0–6)
            </Label>
            <input
              id="decimals"
              type="number"
              min={0}
              max={6}
              disabled={disabled}
              value={decimals}
              onChange={(e) => onDecimalsChange(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Inception date range</Label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                disabled={disabled}
                value={startPeriod || ''}
                onChange={(e) => onStartPeriodChange(e.target.value || null)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
              />
              <input
                type="date"
                disabled={disabled}
                value={endPeriod || ''}
                onChange={(e) => onEndPeriodChange(e.target.value || null)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Delay range filter</Label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min delay"
                disabled={disabled}
                value={minDelay ?? ''}
                onChange={(e) => onMinDelayChange(e.target.value === '' ? null : Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
              />
              <input
                type="number"
                min={0}
                placeholder="Max delay"
                disabled={disabled}
                value={maxDelay ?? ''}
                onChange={(e) => onMaxDelayChange(e.target.value === '' ? null : Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>Auto-save project settings</span>
            <button
              type="button"
              onClick={() => onAutoSaveChange(!autoSave)}
              className={`rounded px-2 py-1 font-medium ${autoSave ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
            >
              {autoSave ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Inception row order</Label>
            <Tabs value={rowSort} onValueChange={onRowSortChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="asc" disabled={disabled}>
                  Oldest → newest
                </TabsTrigger>
                <TabsTrigger value="desc" disabled={disabled}>
                  Newest → oldest
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
