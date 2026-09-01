'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';


export function CierreEnCursoBanner() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    // Check if there is a draft in localStorage
    let draft = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('niteo_draft_cierre_')) {
        draft = localStorage.getItem(key);
        break;
      }
    }
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && Array.isArray(parsed.transacciones) && parsed.transacciones.length > 0) {
          setHasDraft(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!hasDraft) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 text-amber-400">
        <Clock size={20} className="animate-pulse" />
        <div>
          <h4 className="font-bold">Tienes un cierre en curso</h4>
          <p className="text-sm text-amber-500/80">Hay información guardada en tu navegador que aún no ha sido registrada.</p>
        </div>
      </div>
      <Link href="/dashboard/caja/nuevo" className="w-full md:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
        Continuar Cierre <ArrowRight size={16} />
      </Link>
    </div>
  );
}
