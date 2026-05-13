import { useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  computeMinMax,
  formatCell,
  getMatrixCell,
  heatStyle,
} from '@/components/workspace/triangleCells';

export function TriangleGrid({ triangle, rowSort = 'asc', className = '' }) {
  const { matrix, inceptionPeriods, delays, grandTotals, meta } = triangle || {};
  const scrollRef = useRef(null);

  const periods = useMemo(() => {
    const list = [...(inceptionPeriods || [])];
    if (rowSort === 'desc') list.reverse();
    return list;
  }, [inceptionPeriods, rowSort]);

  const { min, max } = useMemo(
    () => computeMinMax(matrix, periods, delays || []),
    [matrix, periods, delays]
  );

  const decimals = meta?.decimals ?? 0;

  if (!triangle || !periods.length || !(delays || []).length) {
    return (
      <div
        className={`flex min-h-[240px] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400 ${className}`}
      >
        <div>
          <p className="text-lg font-medium text-slate-300">No triangle to display</p>
          <p className="mt-1 max-w-md text-sm">
            Upload a dataset, complete column mapping, then filters and display options will populate
            this grid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <Badge variant="outline">
          Granularity: <span className="ml-1 text-slate-800">{meta?.granularity}</span>
        </Badge>
        <Badge variant="outline">
          Metric: <span className="ml-1 text-slate-800">{meta?.metric}</span>
        </Badge>
        <Badge variant="outline">
          Scale: <span className="ml-1 text-slate-800">{meta?.scale}</span>
        </Badge>
        <span className="text-slate-600">
          Rows used: <strong className="text-slate-800">{meta?.rowsUsed ?? '—'}</strong> /{' '}
          {meta?.totalRows ?? '—'}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600">
          Heat scale: min <strong className="tabular-nums text-cyan-700">{formatCell(min, decimals)}</strong>{' '}
          → max{' '}
          <strong className="tabular-nums text-rose-700">{formatCell(max, decimals)}</strong>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-7 text-[11px]"
          onClick={() => {
            if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
          }}
        >
          Jump to last delay
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
        <div ref={scrollRef} className="h-[min(70vh,720px)] w-full overflow-auto md:h-[min(75vh,800px)]">
          <div className="inline-block min-w-full align-middle">
            <table className="w-max border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[120px] border border-slate-200 bg-white px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Inception
                  </th>
                  {(delays || []).map((d) => (
                    <th
                      key={String(d)}
                      className="sticky top-0 z-10 min-w-[88px] border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700"
                    >
                      Dev {d}
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 min-w-[100px] border border-slate-200 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-800">
                    Σ Row
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((inc) => (
                  <tr key={inc}>
                    <td className="sticky left-0 z-10 border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-800">
                      {inc}
                    </td>
                    {(delays || []).map((d) => {
                      const v = getMatrixCell(matrix, inc, d);
                      const st = heatStyle(v, min, max);
                      return (
                        <td
                          key={`${inc}-${d}`}
                          className="border border-slate-200 px-2 py-1.5 text-right tabular-nums text-xs transition-colors"
                          style={st}
                          title={
                            v == null
                              ? 'No data'
                              : `${formatCell(v, decimals)} (${meta?.metric}, ${meta?.scale})`
                          }
                        >
                          {formatCell(v, decimals)}
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right tabular-nums text-xs font-semibold text-amber-900">
                      {formatCell(grandTotals?.byInception?.[inc], decimals)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 border border-slate-200 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-800">
                    Σ Period
                  </td>
                  {(delays || []).map((d) => (
                    <td
                      key={`col-${d}`}
                      className="border border-slate-200 bg-emerald-50 px-2 py-1.5 text-right tabular-nums text-xs font-semibold text-emerald-800"
                    >
                      {formatCell(grandTotals?.byDelay?.[d], decimals)}
                    </td>
                  ))}
                  <td className="border border-slate-200 bg-slate-100 px-2 py-1.5 text-right tabular-nums text-xs font-bold text-slate-800">
                    {formatCell(
                      periods.reduce(
                        (s, inc) => s + (Number(grandTotals?.byInception?.[inc]) || 0),
                        0
                      ),
                      decimals
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
