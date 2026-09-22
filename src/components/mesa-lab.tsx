import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProofsPanel } from "@/components/proofs-panel";
import {
  LOB_NOTE,
  MESA_TLA,
  evaluatePaxosMesa,
  evaluateRaftMesa,
  type MesaInject,
  type MesaReport,
} from "@/lib/mesa";
import { MESA_OBLIGATIONS } from "@/lib/proofs";
import type { PaxosState } from "@/lib/paxos";
import {
  createPaxos,
  equivocate,
  phase1a,
  phase1bAll,
  phase2a,
  phase2bAll,
  selfishFreeChoice,
} from "@/lib/paxos";
import type { SimState } from "@/lib/raft";
import { cn } from "@/lib/utils";

export function MesaLab({ raft, paxos }: { raft: SimState | null; paxos: PaxosState }) {
  const [inject, setInject] = useState<MesaInject>({ proposer: "honest", acceptor: "honest" });
  const [local, setLocal] = useState<PaxosState>(() => structuredClonePaxos(paxos));
  const raftReport = evaluateRaftMesa(raft);
  const paxosReport = evaluatePaxosMesa(local, inject);

  const apply = (fn: (s: PaxosState) => void) => {
    setLocal((prev) => {
      const next = structuredClonePaxos(prev);
      fn(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">Self-reference</p>
        <h2 className="font-display text-2xl font-medium tracking-tight">Mesa detection · Löb · HoTT</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{LOB_NOTE}</p>
      </header>

      <section className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-medium tracking-tight">Inject a policy</h3>
          <p className="mt-1 text-xs text-muted">
            Mesa stays inside the protocol. Byzantine leaves it. Run a ballot, then read MesaFree vs
            Inv.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["honest", "honest proposer"],
                ["selfish-free", "mesa proposer (selfish free choice)"],
                ["skip-force", "bug: skip force-value"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={inject.proposer === id ? "primary" : "secondary"}
                onClick={() => setInject((x) => ({ ...x, proposer: id }))}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["honest", "honest acceptor"],
                ["starve-2b", "mesa acceptor (starve 2b)"],
                ["equivocate", "Byzantine equivocate"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={inject.acceptor === id ? "primary" : "secondary"}
                onClick={() => setInject((x) => ({ ...x, acceptor: id }))}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                apply((s) => {
                  const b = s.nextBal;
                  phase1a(s, b);
                  phase1bAll(s);
                  if (inject.proposer === "selfish-free") selfishFreeChoice(s, b, "v2");
                  else phase2a(s, b, "v1", inject.proposer === "skip-force");
                  if (inject.acceptor === "starve-2b") {
                    s.crashed[2] = true;
                    phase2bAll(s);
                  } else if (inject.acceptor === "equivocate") {
                    phase2bAll(s);
                    equivocate(s, 1);
                  } else {
                    phase2bAll(s);
                  }
                })
              }
            >
              Run ballot
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLocal(createPaxos());
                setInject({ proposer: "honest", acceptor: "honest" });
              }}
            >
              Init
            </Button>
          </div>
          <ol className="mt-4 max-h-40 overflow-auto font-mono text-xs text-muted">
            {local.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-3">
          <ReportCard title="Paxos proposer / acceptor" report={paxosReport} />
          <ReportCard title="Raft replica policies" report={raftReport} />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">Lemma chain</h3>
        <div className="mt-3">
          <ProofsPanel title="MesaDetect" items={MESA_OBLIGATIONS} />
        </div>
      </section>

      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-faint">MesaDetect.tla</p>
        <pre className="mt-2 max-h-[70vh] overflow-auto rounded-xl border border-border bg-subtle p-3 font-mono text-xs leading-relaxed text-muted">
          {MESA_TLA}
        </pre>
      </section>
    </div>
  );
}

function structuredClonePaxos(s: PaxosState): PaxosState {
  return {
    msgs: [...s.msgs],
    maxBal: [...s.maxBal],
    maxVBal: [...s.maxVBal],
    maxVal: [...s.maxVal],
    nextBal: s.nextBal,
    value: s.value,
    log: [...s.log],
    crashed: [...s.crashed],
  };
}

function ReportCard({ title, report }: { title: string; report: MesaReport }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
        <span className="font-mono text-xs">
          <span className={report.free ? "text-ok" : "text-danger"}>
            MesaFree={report.free ? "TRUE" : "FALSE"}
          </span>
          {" · "}
          <span className={report.observableLegal ? "text-ok" : "text-danger"}>
            ObservableLegal={report.observableLegal ? "TRUE" : "FALSE"}
          </span>
        </span>
      </div>
      <ul className="mt-3 space-y-1 font-mono text-xs text-muted">
        {report.replicas.map((r) => (
          <li key={`${r.role}-${r.id}`}>
            <span className="text-fg">
              {r.role} {r.id === 9 ? "P" : r.id + 1}
            </span>{" "}
            U={r.protocolObj} H={r.hiddenObj} δ={r.delta.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className={cn("mt-2 font-mono text-xs", report.illicitDischarge ? "text-warn" : "text-faint")}>
        LobFixedPoint {report.lobHolds ? "TRUE" : "FALSE"} · NoIllicitDischarge{" "}
        {report.illicitDischarge ? "FALSE" : "TRUE"}
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
        {report.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
