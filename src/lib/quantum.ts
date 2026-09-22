/**
 * Quantum consensus: GHZ voting + depolarizing / amplitude-damping noise
 * and a distance-d surface-code logical error model.
 *
 * 3-qubit GHZ |000⟩+|111⟩ / √2. Each acceptor encodes a vote as a Z phase.
 * Measure in the X basis; majority of +1 outcomes is the decided bit.
 */

export type NoiseModel = {
  depolarizing: number;
  amplitudeDamping: number;
};

export type Shot = {
  bits: [number, number, number];
  majority: number;
  ghzParity: number;
};

function clamp01(p: number) {
  return Math.max(0, Math.min(1, p));
}

/** Single-qubit depolarizing: with prob p, replace with I/2. */
function depolarizeBit(bit: number, p: number, rand: () => number) {
  if (rand() < p) return rand() < 0.5 ? 0 : 1;
  return bit;
}

/** Amplitude damping: |1⟩ → |0⟩ with probability γ. */
function dampBit(bit: number, gamma: number, rand: () => number) {
  if (bit === 1 && rand() < gamma) return 0;
  return bit;
}

/**
 * Ideal GHZ measurement in computational basis after vote-dependent Z.
 * Votes in {0,1}. A 1 vote applies Z, flipping the relative phase.
 * We then measure each qubit in X. For GHZ, X⊗X⊗X = +1 on the even-parity
 * subspace; local noise breaks the stabilizer.
 */
export function ghzShot(votes: [number, number, number], noise: NoiseModel, rand = Math.random): Shot {
  const p = clamp01(noise.depolarizing);
  const g = clamp01(noise.amplitudeDamping);
  const base = rand() < 0.5 ? 0 : 1;
  let bits: [number, number, number] = [base, base, base];
  bits = [
    dampBit(depolarizeBit(bits[0], p, rand), g, rand),
    dampBit(depolarizeBit(bits[1], p, rand), g, rand),
    dampBit(depolarizeBit(bits[2], p, rand), g, rand),
  ];
  const x: [number, number, number] = [
    bits[0] ^ votes[0],
    bits[1] ^ votes[1],
    bits[2] ^ votes[2],
  ];
  const majority = x[0] + x[1] + x[2] >= 2 ? 1 : 0;
  const ghzParity = x[0] ^ x[1] ^ x[2];
  return { bits: x, majority, ghzParity };
}

export function sampleConsensus(
  votes: [number, number, number],
  noise: NoiseModel,
  shots: number,
  rand = Math.random,
) {
  let agree = 0;
  let stabilizer = 0;
  const intended = votes[0] + votes[1] + votes[2] >= 2 ? 1 : 0;
  const histogram = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < shots; i++) {
    const s = ghzShot(votes, noise, rand);
    if (s.majority === intended) agree += 1;
    if (s.ghzParity === 0) stabilizer += 1;
    histogram[s.bits[0] * 4 + s.bits[1] * 2 + s.bits[2]] += 1;
  }
  return {
    intended,
    successRate: agree / shots,
    stabilizerRate: stabilizer / shots,
    histogram,
    shots,
  };
}

/** Surface-code logical error (Fowler et al. heuristic). p_th ≈ 0.57%–1% depolarizing. */
export const P_THRESHOLD = 0.0095;

export function logicalError(p: number, distance: number) {
  if (p <= 0) return 0;
  const ratio = p / P_THRESHOLD;
  return Math.min(0.5, 0.03 * ratio ** ((distance + 1) / 2));
}

export function encodedSuccess(p: number, distance: number) {
  return 1 - logicalError(p, distance);
}

export const DISTANCES = [1, 3, 5, 7, 9] as const;

export const QUANTUM_SKETCH = `--------------------------------- MODULE QuantumPaxos ---------------------------------
EXTENDS Integers, Reals, Sequences, FiniteSets, TLC

CONSTANTS Acceptor, Quorum, Value, pDepol, gammaAD, Distance
ASSUME
  /\\ \\A Q1, Q2 \\in Quorum : Q1 \\cap Q2 # {}
  /\\ pDepol \\in {x \\in Real : 0 <= x /\\ x <= 1}
  /\\ Distance \\in {1,3,5,7,9}

(* Physical channel on a single qubit. Kraus form. *)
Depolarizing(ρ, p) == (1 - p) * ρ + (p / 3) * (X(ρ) + Y(ρ) + Z(ρ))
AmpDamp(ρ, γ)      == E0(γ) ρ E0(γ)† + E1(γ) ρ E1(γ)†
Channel(ρ)         == AmpDamp(Depolarizing(ρ, pDepol), gammaAD)

(* Distance-d rotated surface code. Fowler et al. heuristic,
   p_th ≈ 0.0095 depolarizing. Below threshold the logical
   error is exponentially suppressed in d. *)
p_th == 0.0095
LogicalError(p, d) ==
  IF p <= 0 THEN 0 ELSE Min(0.5, 0.03 * (p / p_th) ^ ((d + 1) \\div 2))

(* Encode a classical 2a/2b bit as a logical qubit. Decode
   is majority of d² data qubits after d rounds of stabilizer
   measurement. A logical error flips the decoded 2b value. *)
Encode(bit) == SurfaceCodeLogical(bit, Distance)
Decode(ψ)   == Majority(MeasureZ(ψ))   \\* may flip with p_L

(* GHZ voting among |Quorum| acceptors: prepare
     (|0^n⟩ + |1^n⟩)/√2, apply Z on acceptor a iff vote[a]=1,
   measure X. Majority of +1 is the decided bit.
   Noise breaks the X⊗n stabilizer; the surface code is
   applied *before* the GHZ so the logical GHZ is protected. *)
GHZVote(votes) ==
  LET ψ0 == EncodeGHZ(Cardinality(Acceptor), Distance)
      ψ1 == ApplyZ(ψ0, votes)
      bits == MeasureX(Channel(ψ1))
  IN  Majority(bits)

(* Safety is classical Paxos on the *decoded* bits.
   Quantum noise is a (possibly correlated) crash+corruption
   of 2b messages. Uniqueness is inherited from Inv of
   BasicPaxos provided p_L is treated as a Byzantine fraction
   f_Q = n * p_L and f_Q < n/2. *)
EncodedChosen(v) ==
  /\\ \\E b \\in Nat, Q \\in Quorum :
        \\A a \\in Q : Decoded2b(a, b) = v
  /\\ LogicalError(pDepol, Distance) * Cardinality(Acceptor) <
        Cardinality(Acceptor) \\div 2

THEOREM Spec => [](EncodedChosen(v1) /\\ EncodedChosen(v2) => v1 = v2)
(* Proof: reduce to BasicPaxos Inv after decode. Each logical
   error is a Byzantine 2b. Quorum intersection still holds
   among non-errored acceptors while f_Q < n/2. *)
=============================================================================`;
