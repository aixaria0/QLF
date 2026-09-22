import { Button } from "@/components/ui/button";
import { SpecPanel } from "@/components/spec-panel";
import {
  N,
  PREPARE_QUORUM,
  commitAll,
  committedCount,
  createPbft,
  decidedValues,
  equivocate,
  prePrepare,
  prepareAll,
  preparedCount,
  toggleByzantine,
  viewChange,
  type PbftState,
} from "@/lib/byzantine";
import { PBFT_SPEC } from "@/lib/specs";
import { cn } from "@/lib/utils";

export function ByzantineLab({
  state,
  edit,
  sub,
}: {
  state: PbftState;
  edit: (fn: (s: PbftState) => void) => void;
  sub: "spec" | "exec";
}) {
  if (sub === "spec") return <SpecPanel doc={PBFT_SPEC} />;

  const decided = decidedValues(state);
  const unique = decided.length <= 1;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          PBFT · n={N} f=1 · quorum 2f+1={PREPARE_QUORUM}
        </p>
        <h2 className="font-display text-xl font-medium tracking-tight">Three-phase commit</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Any two 2f+1 sets intersect in ≥ f+1. At most f Byzantine, so the intersection contains
          an honest replica that never equivocates. That is the safety engine.
        </p>
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <Button size="sm" onClick={() => edit(prePrepare)}>
            Pre-prepare
          </Button>
          <Button size="sm" variant="secondary" onClick={() => edit(prepareAll)}>
            Prepare
          </Button>
          <Button size="sm" variant="secondary" onClick={() => edit(commitAll)}>
            Commit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => edit(viewChange)}>
            View-change
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              edit((s) => {
                Object.assign(s, createPbft());
              })
            }
          >
            Init
          </Button>
        </div>
        <p className="mt-3 font-mono text-xs text-faint">
          view={state.view} · primary=r{state.primary + 1} · seq={state.seq} · decided=
          {decided.length ? decided.join(",") : "∅"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {state.replicas.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => edit((s) => toggleByzantine(s, r.id))}
              className={cn(
                "rounded-lg border p-3 text-left",
                r.byzantine ? "border-danger/40 bg-subtle" : "border-border bg-surface",
              )}
            >
              <p className="font-mono text-xs text-faint">
                r{r.id + 1}
                {r.id === state.primary ? " primary" : ""}
              </p>
              <p className="font-display text-lg">{r.phase}</p>
              <p className="mt-2 font-mono text-xs text-muted">
                prep {preparedCount(r)}/{N}
                <br />
                cmt {committedCount(r)}/{N}
                <br />
                val {r.value ?? "—"}
              </p>
              <p className="mt-2 font-mono text-xs text-faint">{r.byzantine ? "Byzantine" : "honest"}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="danger" onClick={() => edit((s) => equivocate(s, 1))}>
            Equivocate r2
          </Button>
        </div>
        <ol className="mt-4 max-h-40 overflow-auto font-mono text-xs text-muted">
          {state.log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="font-display text-lg font-medium tracking-tight">Invariants</h3>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          <Inv
            name="Agreement"
            holds={unique}
            text="decided[i] ≠ None ∧ decided[j] ≠ None ⇒ decided[i] = decided[j]"
            witness={unique ? undefined : decided.join(", ")}
          />
          <Inv
            name="QuorumIntersection"
            holds
            text="∀ Q1, Q2 : |Q1 ∩ Q2| ≥ f+1 = 2"
          />
          <Inv
            name="HonestyBound"
            holds={state.replicas.filter((r) => r.byzantine).length <= 1}
            text="|{ Byzantine }| ≤ f = 1"
          />
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Mapping onto Paxos: PRE-PREPARE ≈ 2a (primary is the proposer), PREPARE ≈ 1b/2b
          certificate, COMMIT ≈ Chosen. View-change ≈ new ballot. Raft terms are views with a
          single primary.
        </p>
      </div>
    </div>
  );
}

function Inv({
  name,
  holds,
  text,
  witness,
}: {
  name: string;
  holds: boolean;
  text: string;
  witness?: string;
}) {
  return (
    <li className="px-3 py-2">
      <p className="font-mono text-xs text-fg">
        {name} <span className={holds ? "text-ok" : "text-danger"}>{holds ? "TRUE" : "FALSE"}</span>
      </p>
      <p className="text-xs text-faint">{text}</p>
      {witness ? <p className="font-mono text-xs text-danger">{witness}</p> : null}
    </li>
  );
}
