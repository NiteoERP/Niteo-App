import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Módulo Mesero | Niteo',
};

export default function MesasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
