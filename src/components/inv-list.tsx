import type { InvResult } from "@/lib/invariants";
import { cn } from "@/lib/utils";

export function InvList({ items }: { items: InvResult[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((inv) => (
        <li key={inv.name} className="flex gap-3 px-3 py-2">
          <span
            className={cn(
              "mt-1 size-2 shrink-0 rounded-full",
              inv.holds ? "bg-ok" : "bg-danger",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-mono text-xs text-fg">
              {inv.name}{" "}
              <span className={inv.holds ? "text-ok" : "text-danger"}>{inv.holds ? "TRUE" : "FALSE"}</span>
            </p>
            <p className="text-xs leading-relaxed text-faint">{inv.obligation}</p>
            {inv.witness ? <p className="font-mono text-xs text-danger">{inv.witness}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
