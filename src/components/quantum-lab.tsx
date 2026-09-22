import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DISTANCES,
  encodedSuccess,
  logicalError,
  P_THRESHOLD,
  QUANTUM_SKETCH,
  sampleConsensus,
} from "@/lib/quantum";

const P_GRID = [0.0005, 0.001, 0.002, 0.004, 0.006, 0.008, 0.01, 0.015, 0.02];

export function QuantumLab() {
  const [p, setP] = useState(0.01);
  const [gamma, setGamma] = useState(0.02);
  const [shots, setShots] = useState(400);
  const [votes, setVotes] = useState<[number, number, number]>([1, 1, 0]);
  const [seed, setSeed] = useState(0);

  const result = useMemo(
    () => sampleConsensus(votes, { depolarizing: p, amplitudeDamping: gamma }, shots),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, gamma, shots, votes, seed],
  );

  const curves = DISTANCES.map((d) => ({
    d,
    pts: P_GRID.map((x) => ({ x, y: logicalError(x, d) })),
  }));

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <header>
          <p className="font-mono text-xs uppercase tracking-widest text-faint">Quantum consensus</p>
          <h2 className="font-display text-2xl font-medium tracking-tight">GHZ voting + surface code</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Three acceptors share a GHZ state. Votes are Z phases; X-measurement majority is the
            decided bit. The same bits feed classical Paxos uniqueness. Noise is depolarizing
            composed with amplitude damping. Logical qubits use a distance-d surface code with
            p<sub>th</sub> ≈ {P_THRESHOLD}.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-muted">
            depolarizing p
            <input
              type="range"
              min={0}
              max={0.08}
              step={0.001}
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <span className="font-mono text-fg tabular-nums">{p.toFixed(3)}</span>
          </label>
          <label className="text-xs text-muted">
            amplitude damping γ
            <input
              type="range"
              min={0}
              max={0.2}
              step={0.005}
              value={gamma}
              onChange={(e) => setGamma(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <span className="font-mono text-fg tabular-nums">{gamma.toFixed(3)}</span>
          </label>
          <label className="text-xs text-muted">
            shots
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <span className="font-mono text-fg tabular-nums">{shots}</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">votes</span>
          {votes.map((v, i) => (
            <Button
              key={i}
              size="sm"
              variant={v ? "primary" : "secondary"}
              onClick={() => {
                const next = [...votes] as [number, number, number];
                next[i] = v ? 0 : 1;
                setVotes(next);
              }}
            >
              a{i + 1}={v}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSeed((s) => s + 1)}>
            Resample
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
          <Stat label="intended bit" value={String(result.intended)} />
          <Stat label="success" value={`${(result.successRate * 100).toFixed(1)}%`} />
          <Stat label="X⊗X⊗X = +1" value={`${(result.stabilizerRate * 100).toFixed(1)}%`} />
          <Stat label="d=5 encoded" value={`${(encodedSuccess(p, 5) * 100).toFixed(2)}%`} />
        </dl>

        <div>
          <p className="mb-2 font-mono text-xs text-faint">computational histogram</p>
          <div className="grid grid-cols-8 gap-1">
            {result.histogram.map((c, i) => {
              const h = Math.round((c / result.shots) * 96);
              const label = i.toString(2).padStart(3, "0");
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end rounded-sm bg-subtle">
                    <div
                      className="w-full rounded-sm bg-accent"
                      style={{ height: `${c ? Math.max(h, 3) : 0}px` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-faint">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-xs text-faint">
            p_L(p, d) = 0.03 (p / p_th)^((d+1)/2)
          </p>
          <SurfaceChart curves={curves} p={p} />
        </div>
      </div>

      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">QuantumPaxos.tla</p>
        <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-border bg-subtle p-3 font-mono text-xs leading-relaxed text-muted">
          {QUANTUM_SKETCH}
        </pre>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="font-mono text-sm text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function SurfaceChart({
  curves,
  p,
}: {
  curves: { d: number; pts: { x: number; y: number }[] }[];
  p: number;
}) {
  const W = 520;
  const H = 220;
  const pad = { l: 36, r: 8, t: 8, b: 24 };
  const maxP = 0.02;
  const maxY = 0.5;
  const x = (v: number) => pad.l + ((v / maxP) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
  const opac = ["0.35", "0.5", "0.7", "0.85", "1"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Logical error vs physical error">
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="var(--color-border)" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="var(--color-border)" />
      {curves.map((c, i) => {
        const d = c.pts.map((pt, k) => `${k === 0 ? "M" : "L"} ${x(pt.x)} ${y(pt.y)}`).join(" ");
        return <path key={c.d} d={d} fill="none" stroke="var(--color-accent)" strokeOpacity={opac[i]} strokeWidth="1.4" />;
      })}
      <line x1={x(p)} y1={pad.t} x2={x(p)} y2={H - pad.b} stroke="var(--color-warn)" strokeDasharray="3 3" />
      <text x={x(maxP)} y={H - 6} textAnchor="end" fill="var(--color-faint)" fontSize="10" fontFamily="var(--font-mono)">
        p
      </text>
      <text x={4} y={14} fill="var(--color-faint)" fontSize="10" fontFamily="var(--font-mono)">
        p_L
      </text>
      {DISTANCES.map((d, i) => (
        <text key={d} x={W - 8} y={18 + i * 12} textAnchor="end" fill="var(--color-accent)" fillOpacity={opac[i]} fontSize="10" fontFamily="var(--font-mono)">
          d={d}
        </text>
      ))}
    </svg>
  );
}
