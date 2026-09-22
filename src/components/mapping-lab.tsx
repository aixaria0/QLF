import { FailureFlow, PaxosFlow } from "@/components/paxos-flow";
import { MAPPING, PERF } from "@/lib/perf";

export function MappingLab() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-faint">Equivalence</p>
        <h2 className="font-display text-2xl font-medium tracking-tight">Paxos rounds onto Raft terms</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Raft is a restricted, strongly-leader-centric Multi-Paxos with an explicit log-matching
          rule (Wang et al., 2019). The table is the operational correspondence; the diagrams are
          the 1a/1b/2a/2b message schedule.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-subtle font-mono text-xs uppercase tracking-widest text-faint">
            <tr>
              <th className="px-3 py-2 font-medium">Paxos</th>
              <th className="px-3 py-2 font-medium">Raft</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {MAPPING.map((row) => (
              <tr key={row.paxos} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs text-fg whitespace-nowrap">{row.paxos}</td>
                <td className="px-3 py-2 font-mono text-xs text-fg whitespace-nowrap">{row.raft}</td>
                <td className="px-3 py-2 text-xs text-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">Happy path</h3>
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <PaxosFlow />
        </div>
      </section>
      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">Acceptor crash — majority still decides</h3>
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <FailureFlow />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">Quantitative comparison</h3>
        <p className="mt-1 text-xs text-faint">Literature figures, not this simulator. WAN numbers vary by RTT and batching.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-subtle font-mono text-xs uppercase tracking-widest text-faint">
              <tr>
                <th className="px-3 py-2 font-medium">Protocol</th>
                <th className="px-3 py-2 font-medium">Fault</th>
                <th className="px-3 py-2 font-medium">n (f=1)</th>
                <th className="px-3 py-2 font-medium">Commit</th>
                <th className="px-3 py-2 font-medium">Msgs</th>
                <th className="px-3 py-2 font-medium">Throughput</th>
                <th className="px-3 py-2 font-medium">Election</th>
                <th className="px-3 py-2 font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {PERF.map((r) => (
                <tr key={r.protocol} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-fg">{r.protocol}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.fault}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">{r.serversF1}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.commitRtt}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.msgPerCmd}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.throughput}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.electionMs}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-faint">
          {PERF.map((r) => (
            <li key={r.protocol}>
              {r.protocol}: {r.source}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
