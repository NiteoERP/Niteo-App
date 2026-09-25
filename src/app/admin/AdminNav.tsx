'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, DollarSign, CreditCard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin',              label: 'Panel Principal',   icon: LayoutDashboard, exact: true },
  { href: '/admin/empresas',     label: 'Empresas',          icon: Users,           exact: false },
  { href: '/admin/pagos',        label: 'Pagos Pendientes',  icon: DollarSign,      exact: false },
  { href: '/admin/metodos-pago', label: 'Métodos de Pago',   icon: CreditCard,      exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-4 space-y-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? 'flex items-center gap-3 px-3 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/10'
                : 'flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors'
            }
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
