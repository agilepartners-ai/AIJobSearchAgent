/**
 * Browser-side trace of the generate → Studio flow.
 *
 * Every step logs to the console as `[flow rid=<id>] step {data}` using the
 * same request id the server prints, so one generation can be followed across
 * both consoles. The last 300 lines are also kept in memory: run
 * `copyFlowLog()` in the browser console and paste the result into a bug report.
 *
 * Only ids, sizes and outcomes go here — never résumé text.
 */

interface FlowLine {
  t: string;
  rid: string;
  step: string;
  data?: Record<string, unknown>;
}

const MAX_LINES = 300;
const lines: FlowLine[] = [];

export function flowLog(rid: string | null | undefined, step: string, data?: Record<string, unknown>): void {
  const line: FlowLine = { t: new Date().toISOString().slice(11, 23), rid: rid ?? '-', step, data };
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();
  // eslint-disable-next-line no-console
  console.info(`[flow rid=${line.rid}] ${step}`, data ?? '');
}

export function dumpFlowLog(): string {
  return lines.map((l) => `${l.t} rid=${l.rid} ${l.step}${l.data ? ` ${JSON.stringify(l.data)}` : ''}`).join('\n');
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.dumpFlowLog = dumpFlowLog;
  w.copyFlowLog = async () => {
    await navigator.clipboard.writeText(dumpFlowLog());
    return `Copied ${lines.length} lines`;
  };
}
