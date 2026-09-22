/** Basic Paxos aligned to the TLA+ spec (msgs, maxBal, maxVBal, maxVal). */

export const ACCEPTORS = [0, 1, 2] as const;
export const QUORUMS: number[][] = [
  [0, 1],
  [0, 2],
  [1, 2],
];

export type PaxosMsg =
  | { type: "1a"; bal: number }
  | { type: "1b"; acc: number; bal: number; mbal: number; mval: string | null }
  | { type: "2a"; bal: number; val: string }
  | { type: "2b"; acc: number; bal: number; val: string };

export type PaxosState = {
  msgs: PaxosMsg[];
  maxBal: number[];
  maxVBal: number[];
  maxVal: (string | null)[];
  nextBal: number;
  value: string;
  log: string[];
  crashed: boolean[];
};

function send(state: PaxosState, m: PaxosMsg) {
  state.msgs = [...state.msgs, m];
}

export function createPaxos(): PaxosState {
  return {
    msgs: [],
    maxBal: [-1, -1, -1],
    maxVBal: [-1, -1, -1],
    maxVal: [null, null, null],
    nextBal: 0,
    value: "v1",
    log: ["Init. maxBal = maxVBal = -1. No messages."],
    crashed: [false, false, false],
  };
}

export function clonePaxos(s: PaxosState): PaxosState {
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

export function phase1a(state: PaxosState, ballot?: number) {
  const b = ballot ?? state.nextBal;
  state.nextBal = Math.max(state.nextBal, b + 1);
  send(state, { type: "1a", bal: b });
  state.log = [`Phase1a(${b})`, ...state.log].slice(0, 20);
}

export function phase1b(state: PaxosState, a: number) {
  if (state.crashed[a]) return false;
  const m = [...state.msgs].reverse().find((x) => x.type === "1a" && x.bal > state.maxBal[a]);
  if (!m || m.type !== "1a") return false;
  send(state, {
    type: "1b",
    acc: a,
    bal: m.bal,
    mbal: state.maxVBal[a],
    mval: state.maxVal[a],
  });
  state.maxBal[a] = m.bal;
  state.log = [`Phase1b(a${a + 1}) promise ballot ${m.bal}`, ...state.log].slice(0, 20);
  return true;
}

export function phase1bAll(state: PaxosState) {
  for (const a of ACCEPTORS) phase1b(state, a);
}

function promisesFor(state: PaxosState, b: number) {
  return state.msgs.filter((m): m is Extract<PaxosMsg, { type: "1b" }> => m.type === "1b" && m.bal === b);
}

export function forcedValue(state: PaxosState, b: number): string | null {
  const S = promisesFor(state, b);
  let bestBal = -1;
  let val: string | null = null;
  for (const m of S) {
    if (m.mbal > bestBal && m.mval) {
      bestBal = m.mbal;
      val = m.mval;
    }
  }
  return val;
}

export function quorumPromised(state: PaxosState, b: number): boolean {
  const S = promisesFor(state, b);
  const accs = new Set(S.map((m) => m.acc));
  return QUORUMS.some((q) => q.every((a) => accs.has(a)));
}

export function phase2a(state: PaxosState, b: number, v: string, skipForce = false) {
  if (state.msgs.some((m) => m.type === "2a" && m.bal === b)) return false;
  if (!quorumPromised(state, b)) {
    state.log = [`Phase2a(${b}) refused — no quorum of 1b`, ...state.log].slice(0, 24);
    return false;
  }
  const forced = forcedValue(state, b);
  const val = skipForce ? v : (forced ?? v);
  send(state, { type: "2a", bal: b, val });
  state.value = val;
  const tag = skipForce && forced && forced !== v ? " — MESA skip-force (protocol-illegal on uniqueness)" : forced ? " — forced by highest mbal" : " — free choice";
  state.log = [`Phase2a(${b}, ${val})${tag}`, ...state.log].slice(0, 24);
  return true;
}

export function phase2b(state: PaxosState, a: number) {
  if (state.crashed[a]) return false;
  const m = [...state.msgs]
    .reverse()
    .find((x) => x.type === "2a" && x.bal >= state.maxBal[a]);
  if (!m || m.type !== "2a") return false;
  send(state, { type: "2b", acc: a, bal: m.bal, val: m.val });
  state.maxBal[a] = m.bal;
  state.maxVBal[a] = m.bal;
  state.maxVal[a] = m.val;
  state.log = [`Phase2b(a${a + 1}) accepted (${m.bal}, ${m.val})`, ...state.log].slice(0, 20);
  return true;
}

export function phase2bAll(state: PaxosState) {
  for (const a of ACCEPTORS) phase2b(state, a);
}

export function chosenValues(state: PaxosState): string[] {
  const twob = state.msgs.filter((m): m is Extract<PaxosMsg, { type: "2b" }> => m.type === "2b");
  const found = new Set<string>();
  const ballots = new Set(twob.map((m) => m.bal));
  for (const b of ballots) {
    const atB = twob.filter((m) => m.bal === b);
    for (const q of QUORUMS) {
      const vals = q.map((a) => atB.find((m) => m.acc === a)?.val);
      if (vals.every((v) => v && v === vals[0])) found.add(vals[0]!);
    }
  }
  return [...found];
}

export function crashAcceptor(state: PaxosState, a: number) {
  state.crashed[a] = !state.crashed[a];
  state.log = [
    state.crashed[a] ? `Acceptor a${a + 1} crashed` : `Acceptor a${a + 1} revived`,
    ...state.log,
  ].slice(0, 24);
}

/** Byzantine: acceptor a emits a 2b for a different value than the 2a it saw. */
export function equivocate(state: PaxosState, a: number) {
  const m = [...state.msgs].reverse().find((x) => x.type === "2a");
  if (!m || m.type !== "2a") {
    state.log = [`Equivocate(a${a + 1}) — no 2a to fork`, ...state.log].slice(0, 24);
    return;
  }
  const other = m.val === "v1" ? "v2" : "v1";
  send(state, { type: "2b", acc: a, bal: m.bal, val: other });
  state.log = [`BYZ a${a + 1} equivocates 2b(${m.bal}, ${other}) against 2a ${m.val}`, ...state.log].slice(0, 24);
}

/** Mesa proposer: on free choice, pick a selfish value instead of the client value. Protocol-legal. */
export function selfishFreeChoice(state: PaxosState, b: number, selfish: string) {
  const forced = forcedValue(state, b);
  if (forced) {
    state.log = [`SelfishFreeChoice refused — value is forced (${forced})`, ...state.log].slice(0, 24);
    return false;
  }
  return phase2a(state, b, selfish, false);
}

export function runHappyPath(state: PaxosState, value: string) {
  const b = state.nextBal;
  phase1a(state, b);
  phase1bAll(state);
  phase2a(state, b, value);
  phase2bAll(state);
}
