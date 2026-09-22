import { MAJORITY, NODE_COUNT, type SimState } from "@/lib/raft";
import { chosenValues, type PaxosState } from "@/lib/paxos";

export type InvResult = {
  name: string;
  holds: boolean;
  obligation: string;
  witness?: string;
};

function minLen(sim: SimState) {
  return Math.min(...sim.nodes.map((n) => n.log.length));
}

export function raftInvariants(sim: SimState): InvResult[] {
  const leaders = sim.nodes.filter((n) => n.role === "leader" && n.alive);
  const byTerm = new Map<number, number[]>();
  for (const l of leaders) {
    const arr = byTerm.get(l.currentTerm) ?? [];
    arr.push(l.id);
    byTerm.set(l.currentTerm, arr);
  }
  let electionWitness: string | undefined;
  let electionOk = true;
  for (const [term, ids] of byTerm) {
    if (ids.length > 1) {
      electionOk = false;
      electionWitness = `term ${term}: ${ids.map((i) => `s${i + 1}`).join(",")}`;
    }
  }

  let matchingOk = true;
  let matchingWitness: string | undefined;
  const n = minLen(sim);
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const a = sim.nodes[i].log;
      const b = sim.nodes[j].log;
      const kmax = Math.min(a.length, b.length);
      for (let k = 0; k < kmax; k++) {
        if (a[k].term === b[k].term) {
          for (let m = 0; m <= k; m++) {
            if (a[m].term !== b[m].term || a[m].command !== b[m].command) {
              matchingOk = false;
              matchingWitness = `s${i + 1} vs s${j + 1} at index ${m}`;
            }
          }
        }
      }
    }
  }

  let smsOk = true;
  let smsWitness: string | undefined;
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const ci = Math.min(sim.nodes[i].commitIndex, sim.nodes[j].commitIndex);
      for (let k = 1; k <= ci; k++) {
        const a = sim.nodes[i].log[k];
        const b = sim.nodes[j].log[k];
        if (!a || !b || a.term !== b.term || a.command !== b.command) {
          smsOk = false;
          smsWitness = `committed index ${k}: s${i + 1} ≠ s${j + 1}`;
        }
      }
    }
  }

  const maxCommit = Math.max(...sim.nodes.map((n) => n.commitIndex));
  let completenessOk = true;
  let completenessWitness: string | undefined;
  for (const l of leaders) {
    for (const n of sim.nodes) {
      if (n.commitIndex <= 0) continue;
      for (let k = 1; k <= n.commitIndex; k++) {
        const e = n.log[k];
        const le = l.log[k];
        if (e && (!le || le.term !== e.term || le.command !== e.command)) {
          completenessOk = false;
          completenessWitness = `leader s${l.id + 1} missing committed index ${k}`;
        }
      }
    }
  }

  const typeOk =
    sim.nodes.every(
      (n) =>
        n.currentTerm >= 0 &&
        n.commitIndex >= 0 &&
        n.commitIndex < n.log.length &&
        n.log.length >= 1,
    ) && sim.nodes.length === NODE_COUNT;

  return [
    {
      name: "TypeOK",
      holds: typeOk,
      obligation: "currentTerm ∈ [Server → Nat], commitIndex ≤ Len(log).",
    },
    {
      name: "ElectionSafety",
      holds: electionOk,
      obligation: "At most one leader per term. Quorum intersection of votes.",
      witness: electionWitness,
    },
    {
      name: "LogMatching",
      holds: matchingOk,
      obligation: "If two logs share term at index k, prefixes 1..k are identical.",
      witness: matchingWitness,
    },
    {
      name: "StateMachineSafety",
      holds: smsOk,
      obligation: "Committed prefixes of any two servers are equal.",
      witness: smsWitness,
    },
    {
      name: "LeaderCompleteness",
      holds: completenessOk,
      obligation: "A leader of term t contains every entry committed in terms < t.",
      witness: completenessWitness,
    },
    {
      name: "MajorityBound",
      holds: MAJORITY === Math.floor(NODE_COUNT / 2) + 1,
      obligation: "Quorum size = ⌊n/2⌋+1 so any two quorums intersect.",
    },
    {
      name: "CommitPresent",
      holds: maxCommit >= 0,
      obligation: "commitIndex is a valid log prefix (always true if TypeOK).",
    },
  ];
}

export function paxosInvariants(state: PaxosState): InvResult[] {
  const chosen = chosenValues(state);
  const unique = chosen.length <= 1;
  const typeOk =
    state.maxBal.length === 3 &&
    state.maxBal.every((b, i) => b >= state.maxVBal[i]) &&
    state.maxVBal.every((b) => b >= -1);

  let monotonic = true;
  for (let a = 0; a < 3; a++) {
    if (state.maxVBal[a] > state.maxBal[a]) monotonic = false;
  }

  return [
    {
      name: "TypeOK",
      holds: typeOk,
      obligation: "msgs ⊆ Message, maxBal[a] ≥ maxVBal[a] ≥ −1.",
    },
    {
      name: "Inv (uniqueness)",
      holds: unique,
      obligation: "Chosen(v1) ∧ Chosen(v2) ⇒ v1 = v2.",
      witness: unique ? undefined : chosen.join(", "),
    },
    {
      name: "BallotMonotone",
      holds: monotonic,
      obligation: "An acceptor never votes in a ballot below maxBal.",
    },
    {
      name: "QuorumAssumption",
      holds: true,
      obligation: "∀ Q1, Q2 ∈ Quorum : Q1 ∩ Q2 ≠ {}.",
    },
  ];
}
