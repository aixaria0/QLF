import { useMemo } from "react";
import type { Envelope, SimState } from "@/lib/raft";
import { NODE_COUNT } from "@/lib/raft";
import { cn } from "@/lib/utils";

const LABELS = ["s1", "s2", "s3", "s4", "s5"];

function pos(i: number, cx: number, cy: number, r: number) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / NODE_COUNT;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function packetT(env: Envelope, time: number) {
  const span = Math.max(1, env.deliverAt - env.sentAt);
  return Math.min(1, Math.max(0, (time - env.sentAt) / span));
}

export function ClusterView({
  sim,
  selected,
  onSelect,
}: {
  sim: SimState;
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const layout = useMemo(() => {
    const cx = 200;
    const cy = 188;
    const r = 112;
    return Array.from({ length: NODE_COUNT }, (_, i) => pos(i, cx, cy, r));
  }, []);

  return (
    <svg
      viewBox="0 0 400 380"
      className="mx-auto h-auto w-full max-h-72"
      role="img"
      aria-label="Raft cluster of five servers"
    >
      <circle cx="200" cy="188" r="118" fill="none" stroke="currentColor" className="text-border" strokeDasharray="2 6" />
      {sim.network.map((env) => {
        const a = layout[env.from];
        const b = layout[env.to];
        const t = packetT(env, sim.time);
        const x = lerp(a.x, b.x, t);
        const y = lerp(a.y, b.y, t);
        const isVote = env.rpc.kind.startsWith("RequestVote");
        return (
          <circle
            key={env.id}
            cx={x}
            cy={y}
            r="3.5"
            className={isVote ? "fill-warn" : "fill-accent"}
          />
        );
      })}
      {sim.nodes.map((n, i) => {
        const p = layout[i];
        const isSel = selected === n.id;
        const fill =
          !n.alive
            ? "var(--color-subtle)"
            : n.role === "leader"
              ? "var(--color-leader)"
              : n.role === "candidate"
                ? "var(--color-warn)"
                : "var(--color-surface)";
        const stroke = isSel ? "var(--color-fg)" : "var(--color-border)";
        const text = n.role === "leader" && n.alive ? "var(--color-accent-fg)" : "var(--color-fg)";
        return (
          <g key={n.id} className="cursor-pointer" onClick={() => onSelect(n.id)}>
            {n.partition !== 0 && n.alive ? (
              <circle cx={p.x} cy={p.y} r="30" fill="none" stroke="var(--color-danger)" strokeDasharray="4 3" />
            ) : null}
            <circle cx={p.x} cy={p.y} r="24" fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1} />
            <text
              x={p.x}
              y={p.y - 2}
              textAnchor="middle"
              fill={text}
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {LABELS[i]}
            </text>
            <text
              x={p.x}
              y={p.y + 11}
              textAnchor="middle"
              fill={n.role === "leader" && n.alive ? "var(--color-accent-fg)" : "var(--color-faint)"}
              fontSize="8"
              fontFamily="var(--font-mono)"
            >
              t{n.currentTerm}
            </text>
            {n.log.slice(1).map((_, k) => (
              <rect
                key={k}
                x={p.x - 16 + k * 6}
                y={p.y + 32}
                width="4"
                height="8"
                rx="1"
                fill={k + 1 <= n.commitIndex ? "var(--color-ok)" : "var(--color-border)"}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function NodeInspector({ sim, id }: { sim: SimState; id: number }) {
  const n = sim.nodes[id];
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium tracking-tight">s{id + 1}</h3>
        <span
          className={cn(
            "font-mono text-xs uppercase tracking-wider",
            !n.alive ? "text-danger" : n.role === "leader" ? "text-fg" : "text-muted",
          )}
        >
          {n.alive ? n.role : "crashed"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs text-muted">
        <div>
          currentTerm <span className="text-fg tabular-nums">{n.currentTerm}</span>
        </div>
        <div>
          votedFor <span className="text-fg">{n.votedFor === null ? "Nil" : `s${n.votedFor + 1}`}</span>
        </div>
        <div>
          commitIndex <span className="text-fg tabular-nums">{n.commitIndex}</span>
        </div>
        <div>
          Len(log) <span className="text-fg tabular-nums">{n.log.length}</span>
        </div>
      </dl>
      <ol className="mt-3 space-y-1 font-mono text-xs text-muted">
        {n.log.map((e, i) => (
          <li key={i} className={i <= n.commitIndex ? "text-fg" : "text-faint"}>
            log[{i}] term={e.term} {e.command}
            {i <= n.commitIndex ? "  committed" : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}
