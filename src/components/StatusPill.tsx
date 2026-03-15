interface StatusPillProps {
  tone: 'green' | 'amber' | 'red' | 'slate' | 'blue';
  children: React.ReactNode;
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
