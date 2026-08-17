import React from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      
      {/* Sección 1: Estilo de la aplicación */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-2">
          <h2 className="text-xl font-medium text-white">Estilo de la aplicación</h2>
          <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">Aprenda más</a>
        </div>

        <div className="space-y-5">
          {/* Idioma */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Idioma</label>
            <div className="relative w-48">
              <select className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>Español</option>
                <option>English</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Dirección de escritura */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Dirección de escritura</label>
            <div className="relative w-48">
              <select className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>De izquierda a derecha</option>
                <option>De derecha a izquierda</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Esquema de colores */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Esquema de colores</label>
            <div className="relative w-48">
              <select className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>Night (Oscuro)</option>
                <option>Day (Claro)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Diseño */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Diseño</label>
            <div className="relative w-48">
              <select className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>Estándar</option>
                <option>Compacto</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Número de filas / columnas */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Número de filas / columnas</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
                <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center text-sm font-medium text-white">5</span>
                <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="text-neutral-500 text-sm">/</span>
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
                <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center text-sm font-medium text-white">5</span>
                <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          </div>

          {/* Teclado Virtual */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Habilitar teclado virtual</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

        </div>
      </section>

      {/* Sección 2: Mensajes */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-2">
          <h2 className="text-xl font-medium text-white">Mensajes</h2>
        </div>

        <div className="space-y-5">
          {/* Botón cerrar */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Mostrar el botón de "Cerrar"</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Duración */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Duración del mensaje (seg.)</label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
              <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
              <span className="w-12 text-center text-sm font-medium text-white">4</span>
              <button className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
            </div>
          </div>

          {/* Posición */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Posición</label>
            <div className="relative w-48">
              <select className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>Arriba</option>
                <option>Abajo</option>
                <option>Centro</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: Día Laborable */}
      <section className="space-y-6 opacity-50 pointer-events-none">
        <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-2">
          <h2 className="text-xl font-medium text-white">Día laborable</h2>
        </div>
        <p className="text-sm text-neutral-500">Más configuraciones próximamente...</p>
      </section>
    </div>
  );
}
