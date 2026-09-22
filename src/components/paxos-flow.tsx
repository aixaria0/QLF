export function PaxosFlow() {
  return (
    <svg viewBox="0 0 720 280" className="h-auto w-full" role="img" aria-label="Basic Paxos happy-path message flow">
      <text x="36" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        Client
      </text>
      <text x="150" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        Proposer
      </text>
      <text x="300" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        a1
      </text>
      <text x="420" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        a2
      </text>
      <text x="540" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        a3
      </text>
      <text x="650" y="24" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        Learners
      </text>
      {[36, 150, 300, 420, 540, 650].map((x) => (
        <line key={x} x1={x + 18} y1="32" x2={x + 18} y2="268" stroke="var(--color-border)" />
      ))}
      <path d="M54 56 H168" stroke="var(--color-accent)" fill="none" />
      <text x="70" y="52" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        Request(v)
      </text>
      <path d="M168 88 H318 M168 88 H438 M168 88 H558" stroke="var(--color-accent)" fill="none" />
      <text x="180" y="84" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        1a Prepare(b)
      </text>
      <path d="M318 128 H168 M438 128 H168 M558 128 H168" stroke="var(--color-warn)" fill="none" />
      <text x="180" y="124" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        1b Promise(b, mbal, mval)
      </text>
      <path d="M168 168 H318 M168 168 H438 M168 168 H558" stroke="var(--color-accent)" fill="none" />
      <text x="180" y="164" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        2a Accept(b, v)
      </text>
      <path d="M318 208 H168 M438 208 H168 M558 208 H168 M558 208 H668" stroke="var(--color-ok)" fill="none" />
      <text x="180" y="204" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        2b Accepted — Chosen(v)
      </text>
      <path d="M168 248 H54" stroke="var(--color-ok)" fill="none" />
      <text x="70" y="244" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        reply v
      </text>
    </svg>
  );
}

export function FailureFlow() {
  return (
    <svg viewBox="0 0 520 180" className="h-auto w-full" role="img" aria-label="Paxos with one acceptor down">
      <text x="24" y="22" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        Proposer
      </text>
      <text x="180" y="22" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        a1
      </text>
      <text x="300" y="22" fill="var(--color-faint)" fontSize="11" fontFamily="var(--font-mono)">
        a2
      </text>
      <text x="420" y="22" fill="var(--color-danger)" fontSize="11" fontFamily="var(--font-mono)">
        a3 crashed
      </text>
      {[24, 180, 300, 420].map((x) => (
        <line
          key={x}
          x1={x + 18}
          y1="30"
          x2={x + 18}
          y2="170"
          stroke="var(--color-border)"
          strokeDasharray={x === 420 ? "4 4" : undefined}
        />
      ))}
      <path d="M42 60 H198 M42 60 H318" stroke="var(--color-accent)" fill="none" />
      <text x="50" y="56" fill="var(--color-muted)" fontSize="10" fontFamily="var(--font-mono)">
        Prepare(n) — a3 unreachable
      </text>
      <path d="M198 96 H42 M318 96 H42" stroke="var(--color-warn)" fill="none" />
      <path d="M42 128 H198 M42 128 H318" stroke="var(--color-accent)" fill="none" />
      <path d="M198 160 H42 M318 160 H42" stroke="var(--color-ok)" fill="none" />
      <text x="50" y="152" fill="var(--color-ok)" fontSize="10" fontFamily="var(--font-mono)">
        {`{a1,a2} quorum — value chosen`}
      </text>
    </svg>
  );
}
