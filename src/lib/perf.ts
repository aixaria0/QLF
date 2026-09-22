export type PerfRow = {
  protocol: string;
  fault: string;
  serversF1: number;
  commitRtt: string;
  msgPerCmd: string;
  throughput: string;
  electionMs: string;
  year: string;
  source: string;
};

export const PERF: PerfRow[] = [
  {
    protocol: "Basic Paxos",
    fault: "crash",
    serversF1: 3,
    commitRtt: "2 RTT (1a+2a)",
    msgPerCmd: "O(n) per decree",
    throughput: "low (phase-1 every slot)",
    electionMs: "n/a (dueling ballots)",
    year: "1998",
    source: "Lamport, Part-Time Parliament / Paxos Made Simple",
  },
  {
    protocol: "Multi-Paxos",
    fault: "crash",
    serversF1: 3,
    commitRtt: "1 RTT steady-state",
    msgPerCmd: "O(n)",
    throughput: "~10⁴–10⁵ ops/s (log)",
    electionMs: "ballot timeout, 100–300",
    year: "1998/2001",
    source: "Lamport; Chandra/Griesemer/Redstone Chubby",
  },
  {
    protocol: "Raft",
    fault: "crash",
    serversF1: 3,
    commitRtt: "1 RTT to majority",
    msgPerCmd: "O(n) AppendEntries",
    throughput: "etcd ~10k–40k put/s local; 1–5k WAN",
    electionMs: "150–300 (typical etcd)",
    year: "2014",
    source: "Ongaro & Ousterhout, USENIX ATC; etcd benchmarks",
  },
  {
    protocol: "PBFT",
    fault: "Byzantine",
    serversF1: 4,
    commitRtt: "3 phases, ~2–3 RTT",
    msgPerCmd: "O(n²)",
    throughput: "Castro–Liskov ~10k ops/s LAN (1999 hw)",
    electionMs: "view-change, seconds",
    year: "1999",
    source: "Castro & Liskov, OSDI 1999",
  },
  {
    protocol: "HotStuff",
    fault: "Byzantine",
    serversF1: 4,
    commitRtt: "2–3 RTT pipelined (3-chain)",
    msgPerCmd: "O(n) with threshold sigs",
    throughput: "LibraBFT-class ~10⁴–10⁵ tx/s claimed",
    electionMs: "pacemaker, ~1–4 s",
    year: "2019",
    source: "Yin et al., PODC 2019",
  },
  {
    protocol: "Tendermint",
    fault: "Byzantine",
    serversF1: 4,
    commitRtt: "~1–2 s block (gossip)",
    msgPerCmd: "O(n²) gossip",
    throughput: "order of 10³–10⁴ tx/s",
    electionMs: "round timeout, 1–3 s",
    year: "2014/2018",
    source: "Kwon; Buchman, Tendermint thesis",
  },
  {
    protocol: "GHZ voting (this lab)",
    fault: "quantum noise",
    serversF1: 3,
    commitRtt: "1 shot + classical majority",
    msgPerCmd: "n qubits + 1 classical bit",
    throughput: "shot-rate limited; p_L(d=5,p=10⁻³)≈3×10⁻⁵",
    electionMs: "n/a",
    year: "—",
    source: "Fowler et al. surface-code p_th; GHZ stabilizer voting",
  },
];

export const MAPPING = [
  { paxos: "Ballot / proposal number", raft: "Term", note: "Strictly increasing; unique per attempt." },
  { paxos: "Phase 1a Prepare(b)", raft: "Timeout + RequestVote", note: "Collects promises / votes for a new ballot/term." },
  { paxos: "Phase 1b Promise(b, mbal, mval)", raft: "RequestVoteResponse (voteGranted, lastLogTerm/Index)", note: "Acceptor/follower reports highest accepted log." },
  { paxos: "Quorum of promises", raft: "Majority of votes → BecomeLeader", note: "Intersection is the safety engine." },
  { paxos: "Phase 2a Accept(b, v)", raft: "AppendEntries (log replication)", note: "v is forced if any promise carried a value." },
  { paxos: "Phase 2b Accepted", raft: "AppendEntriesResponse (matchIndex)", note: "Replica acknowledges the entry." },
  { paxos: "Chosen (majority 2b)", raft: "AdvanceCommitIndex", note: "A value is decided iff a quorum accepted it." },
  { paxos: "Multi-Paxos stable leader", raft: "Leader for the term", note: "Phase 1 is amortized; only Phase 2 per slot." },
  { paxos: "Acceptor log per slot", raft: "Contiguous log + prevLogTerm match", note: "Raft makes the matching rule explicit." },
  { paxos: "Dueling proposers", raft: "Split votes / live lock until timeout jitter", note: "Raft's randomized timeouts are the liveness fix." },
];
