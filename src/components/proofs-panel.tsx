import type { Obligation } from "@/lib/proofs";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ProofsPanel({ title, items }: { title: string; items: Obligation[] }) {
  const [sel, setSel] = useState(0);
  const active = items[sel];
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
        {items.map((o, i) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => setSel(i)}
              className={cn(
                "flex w-full items-baseline gap-3 px-3 py-3 text-left",
                sel === i ? "bg-subtle" : "hover:bg-subtle/60",
              )}
            >
              <span className="font-mono text-xs text-faint tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-mono text-xs text-fg">{o.lemma}</span>
                <span className="block text-xs text-faint">
                  {o.method}
                  {o.depends.length ? ` · depends ${o.depends.join(", ")}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {active ? (
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            {title} · {active.method}
          </p>
          <h3 className="mt-1 font-display text-xl font-medium tracking-tight">{active.lemma}</h3>
          <p className="mt-3 font-mono text-xs leading-relaxed text-fg">{active.statement}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{active.discharge}</p>
          {active.depends.length ? (
            <p className="mt-4 font-mono text-xs text-faint">depends: {active.depends.join(" → ")}</p>
          ) : (
            <p className="mt-4 font-mono text-xs text-faint">base obligation</p>
          )}
        </article>
      ) : null}
    </div>
  );
}
