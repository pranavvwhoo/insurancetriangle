import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { mappingApi, uploadApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function MappingRow({ field, headers, value, onChange, hint }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(0,2fr)] sm:items-center">
      <div>
        <p className="text-xs font-medium text-slate-800">{field}</p>
        {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      >
        <option value="">Select column…</option>
        {(headers || []).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DataMappingDialog({ open, onOpenChange, projectId, onCompleted }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [sheet, setSheet] = useState('');
  const [requiredFields, setRequiredFields] = useState([]);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await mappingApi.requiredFields();
        if (!cancelled) setRequiredFields(r.fields || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!projectId) return;
      try {
        const existing = await mappingApi.get(projectId);
        if (!cancelled && existing.mapping?.mapping)
          setMapping((prev) => ({ ...prev, ...existing.mapping.mapping }));
      } catch (_) {
        /* none */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setParseResult(null);
      setSheet('');
      setValidation(null);
      setError(null);
      setMapping({});
    }
  }, [open]);

  const headers = parseResult?.headers || [];

  const mappingComplete = useMemo(() => {
    if (!requiredFields.length) return false;
    return requiredFields.every((f) => mapping[f]);
  }, [requiredFields, mapping]);

  async function handlePickFile(f) {
    if (!f) return;
    setFile(f);
    setBusy(true);
    setError(null);
    try {
      const res = await uploadApi.parse(f, null);
      setParseResult(res);
      const names = res.sheetNames || [];
      const active = res.activeSheet || names[0] || '';
      setSheet(active);
      if (names.length > 1 && active) {
        const again = await uploadApi.parse(f, active);
        setParseResult(again);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSheetChange(nextSheet) {
    setSheet(nextSheet);
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadApi.parse(file, nextSheet || null);
      setParseResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMappingOnly() {
    if (!projectId || !mappingComplete) return;
    setBusy(true);
    setError(null);
    try {
      await mappingApi.save(projectId, mapping);
      await onCompleted?.();
      onOpenChange(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function validateOnly() {
    if (!file || !mappingComplete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadApi.validate(file, mapping, sheet || undefined);
      setValidation(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function importSave() {
    if (!projectId || !file || !mappingComplete) return;
    setBusy(true);
    setError(null);
    try {
      await mappingApi.save(projectId, mapping);
      const res = await uploadApi.save(projectId, file, mapping, sheet || undefined);
      setValidation(res);
      await onCompleted?.();
      onOpenChange(false);
    } catch (e) {
      const body = e.body;
      if (e.status === 422 && body?.errors) setValidation(body);
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const previewRows = parseResult?.preview || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden border-slate-200 bg-white p-0">
        <div className="border-b border-slate-200 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-cyan-600" />
              Data intake & column mapping
            </DialogTitle>
            <DialogDescription>
              Parse Excel / CSV, map columns to the actuarial schema once per project, then import rows into
              Supabase-backed storage.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={step >= 1 ? 'success' : 'secondary'}>1 · File</Badge>
            <Badge variant={step >= 2 ? 'success' : 'secondary'}>2 · Map columns</Badge>
            <Badge variant={step >= 3 ? 'success' : 'secondary'}>3 · Validate / import</Badge>
          </div>
        </div>

        <div className="grid max-h-[calc(92vh-220px)] gap-0 md:grid-cols-[1fr_380px]">
          <ScrollArea className="max-h-[calc(92vh-220px)] border-r border-slate-200">
            <div className="space-y-4 p-6">
                {error ? (
                  <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Spreadsheet file (.csv, .xlsx)</Label>
                <InputLikeFile onChange={handlePickFile} disabled={busy} />
                {parseResult ? (
                  <p className="text-xs text-slate-500">
                    Parsed <strong className="text-slate-300">{parseResult.totalRows}</strong> rows · active sheet{' '}
                    <strong className="text-slate-300">{parseResult.activeSheet}</strong>
                  </p>
                ) : null}
              </div>

              {parseResult?.sheetNames?.length > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="sheet">Worksheet</Label>
                  <select
                    id="sheet"
                    value={sheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="h-9 w-full max-w-md rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                  >
                    {parseResult.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Preview (first rows)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setStep((s) => Math.max(1, s))}>
                    {step < 2 ? 'Continue to mapping →' : ''}
                  </Button>
                </div>
                <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-50">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        {headers.map((h) => (
                          <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold text-slate-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {headers.map((h) => (
                            <td key={h} className="max-w-[200px] truncate px-2 py-1.5 text-slate-800">
                              {row[h] != null ? String(row[h]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ScrollArea>

          <ScrollArea className="max-h-[calc(92vh-220px)] bg-slate-50">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Column mapping</h3>
                <Button type="button" size="sm" variant="secondary" onClick={() => setStep(2)}>
                  Map →
                </Button>
              </div>
              <p className="text-xs text-slate-600">
                Each model field must reference one uploaded column. Mapping is persisted per project via{' '}
                <code className="text-slate-700">POST /api/mapping/:projectId</code>.
              </p>
              <div className="space-y-3">
                {(requiredFields || []).map((field) => (
                  <MappingRow
                    key={field}
                    field={field}
                    headers={headers}
                    value={mapping[field]}
                    onChange={(col) => setMapping((m) => ({ ...m, [field]: col }))}
                  />
                ))}
              </div>

              {validation ? (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    {validation.valid !== false ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Validation OK
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        Validation issues
                      </>
                    )}
                  </div>
                  {(validation.errors || []).slice(0, 5).map((err, i) => (
                    <p key={i} className="text-rose-800">
                      {err.message || JSON.stringify(err)}
                    </p>
                  ))}
                  {(validation.warnings || []).slice(0, 3).map((w, i) => (
                    <p key={i} className="text-amber-800">
                      {w.message || JSON.stringify(w)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="secondary" disabled={busy || !mappingComplete || !projectId} onClick={saveMappingOnly}>
            Save mapping only
          </Button>
          <Button type="button" variant="secondary" disabled={busy || !file || !mappingComplete} onClick={validateOnly}>
            Validate file
          </Button>
          <Button type="button" disabled={busy || !file || !mappingComplete || !projectId} onClick={importSave}>
            Save mapping & import rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InputLikeFile({ onChange, disabled }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 transition hover:border-cyan-500 hover:bg-slate-100',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = '';
        }}
      />
      Drop or click to choose file
    </label>
  );
}
