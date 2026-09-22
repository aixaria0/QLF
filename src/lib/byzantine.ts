/** PBFT-style 3-phase commit, n = 3f+1, f = 1, n = 4. */

export const F = 1;
export const N = 3 * F + 1;
export const PREPARE_QUORUM = 2 * F + 1; // 3

export type PbftPhase = "idle" | "pre-prepare" | "prepare" | "commit" | "decided";

export type Replica = {
  id: number;
  view: number;
  seq: number;
  phase: PbftPhase;
  prepared: boolean[];
  committed: boolean[];
  byzantine: boolean;
  value: string | null;
  equivocated: boolean;
};

export type PbftState = {
  replicas: Replica[];
  primary: number;
  view: number;
  seq: number;
  value: string;
  log: string[];
};

export function createPbft(): PbftState {
  return {
    replicas: Array.from({ length: N }, (_, id) => ({
      id,
      view: 0,
      seq: 0,
      phase: "idle",
      prepared: [false, false, false, false],
      committed: [false, false, false, false],
      byzantine: false,
      value: null,
      equivocated: false,
    })),
    primary: 0,
    view: 0,
    seq: 1,
    value: "v1",
    log: ["Init. view=0 primary=r1 n=4 f=1. Quorum = 2f+1 = 3."],
  };
}

export function clonePbft(s: PbftState): PbftState {
  return {
    ...s,
    replicas: s.replicas.map((r) => ({
      ...r,
      prepared: [...r.prepared],
      committed: [...r.committed],
    })),
    log: [...s.log],
  };
}

export function prePrepare(s: PbftState) {
  const p = s.replicas[s.primary];
  if (p.byzantine) {
    s.log = [`⟨PRE-PREPARE⟩ primary r${p.id + 1} is Byzantine — may send two values.`, ...s.log].slice(0, 24);
  }
  for (const r of s.replicas) {
    r.view = s.view;
    r.seq = s.seq;
    r.phase = "pre-prepare";
    r.value = s.value;
  }
  s.log = [`⟨PRE-PREPARE, v=${s.view}, n=${s.seq}, ${s.value}⟩ from r${s.primary + 1}`, ...s.log].slice(0, 24);
}

export function prepareAll(s: PbftState) {
  for (const r of s.replicas) {
    if (r.phase !== "pre-prepare" && r.phase !== "prepare") continue;
    r.phase = "prepare";
    for (const q of s.replicas) {
      if (r.byzantine && q.id !== r.id && q.id % 2 === 0) continue;
      q.prepared[r.id] = true;
    }
  }
  s.log = ["⟨PREPARE⟩ multicast. Matching 2f+1 PREPARE ⇒ prepared certificate.", ...s.log].slice(0, 24);
}

export function commitAll(s: PbftState) {
  for (const r of s.replicas) {
    const count = r.prepared.filter(Boolean).length;
    if (count < PREPARE_QUORUM) continue;
    r.phase = "commit";
    for (const q of s.replicas) q.committed[r.id] = true;
  }
  for (const r of s.replicas) {
    const count = r.committed.filter(Boolean).length;
    if (count >= PREPARE_QUORUM) r.phase = "decided";
  }
  s.log = ["⟨COMMIT⟩. Matching 2f+1 COMMIT ⇒ decided. Safety: any two 2f+1 sets intersect in ≥ f+1 honest.", ...s.log].slice(0, 24);
}

export function viewChange(s: PbftState) {
  s.view += 1;
  s.primary = s.view % N;
  s.seq += 1;
  for (const r of s.replicas) {
    r.view = s.view;
    r.seq = s.seq;
    r.phase = "idle";
    r.prepared = [false, false, false, false];
    r.committed = [false, false, false, false];
    r.value = null;
    r.equivocated = false;
  }
  s.log = [`View-change → view ${s.view}, primary r${s.primary + 1}.`, ...s.log].slice(0, 24);
}

export function toggleByzantine(s: PbftState, id: number) {
  const r = s.replicas[id];
  r.byzantine = !r.byzantine;
  s.log = [`r${id + 1} Byzantine = ${r.byzantine}`, ...s.log].slice(0, 24);
}

export function equivocate(s: PbftState, id: number) {
  const r = s.replicas[id];
  r.byzantine = true;
  r.equivocated = true;
  r.value = r.value === "v1" ? "v2" : "v1";
  s.log = [`r${id + 1} equivocates: sends ${r.value} on one edge, the other value on another.`, ...s.log].slice(0, 24);
}

export function decidedValues(s: PbftState): string[] {
  const vals = new Set(
    s.replicas.filter((r) => r.phase === "decided" && r.value).map((r) => r.value as string),
  );
  return [...vals];
}

export function preparedCount(r: Replica) {
  return r.prepared.filter(Boolean).length;
}

export function committedCount(r: Replica) {
  return r.committed.filter(Boolean).length;
}

export const PBFT_SPEC_TEXT = `--------------------------------- MODULE PBFT_notes ---------------------------------
EXTENDS Integers, FiniteSets, TLC

CONSTANTS Replica, f
n == 3*f + 1
Quorum == { Q \\in SUBSET Replica : Cardinality(Q) >= 2*f + 1 }

VARIABLES view, primary, seq, msgs, prepared, committed, decided

(* Three phases. Safety from: any two 2f+1-sets intersect in ≥ f+1,
   and at most f replicas are Byzantine, so the intersection contains
   at least one honest replica. That honest replica never equivocates. *)

PrePrepare(v, n, val) ==
  /\\ primary[view] sends ⟨PRE-PREPARE, v, n, val⟩ to all
  /\\ UNCHANGED decided

Prepare(i) ==
  /\\ received valid PRE-PREPARE
  /\\ send ⟨PREPARE, v, n, val, i⟩
  /\\ prepared[i] when |{ PREPARE matching }| >= 2*f + 1

Commit(i) ==
  /\\ prepared[i]
  /\\ send ⟨COMMIT, v, n, val, i⟩
  /\\ decided[i] = val when |{ COMMIT matching }| >= 2*f + 1

Inv ==
  /\\ \\A i, j \\in Replica :
        decided[i] # None /\\ decided[j] # None => decided[i] = decided[j]
  /\\ \\A Q1, Q2 \\in Quorum : Cardinality(Q1 \\cap Q2) >= f + 1

THEOREM Spec => []Inv
=============================================================================`;
