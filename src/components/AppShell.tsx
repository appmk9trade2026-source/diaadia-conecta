import type { PropsWithChildren } from 'react';
import { ClipboardCheck, MapPinned, ShieldCheck, TicketCheck } from 'lucide-react';

const funnelItems = [
  { label: 'Jornada', icon: MapPinned },
  { label: 'Visitas', icon: ClipboardCheck },
  { label: 'Leads', icon: ShieldCheck },
  { label: 'Vouchers', icon: TicketCheck }
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand">
          <span className="brand-mark">DC</span>
          <div>
            <strong>DIA A DIA</strong>
            <span>CONECTA</span>
          </div>
        </div>
        <nav className="funnel-nav" aria-label="Funil operacional">
          {funnelItems.map((item) => {
            const Icon = item.icon;

            return (
              <a href="/" key={item.label} aria-label={item.label}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
