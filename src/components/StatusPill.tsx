interface StatusPillProps {
  tone: 'green' | 'amber' | 'red' | 'slate';
  children: React.ReactNode;
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
