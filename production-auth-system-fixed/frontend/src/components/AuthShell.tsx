import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-copy" aria-label="Account security">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>
      <section className="auth-panel">
        {children}
      </section>
    </main>
  );
}
