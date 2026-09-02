'use client';

import { useRef, useState } from 'react';
import { registerShrinkageAction } from '@/actions/mermas-actions';

export default function ShrinkageForm({ reasons }: { reasons: any[] }) {
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setError('');
        
        try {
            const formData = new FormData(e.currentTarget);
            await registerShrinkageAction(formData);
            formRef.current?.reset();
        } catch (err: any) {
            setError(err.message || 'Error al registrar merma');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            
            <div>
                <label className="block text-sm font-medium mb-1">ID Producto (Simulado)</label>
                <input 
                    name="product_id" 
                    type="number" 
                    required 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Ej. 1234"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Cantidad</label>
                    <input 
                        name="quantity" 
                        type="number" 
                        step="0.01"
                        required 
                        min="0.01"
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Costo Unit.</label>
                    <input 
                        name="unit_cost" 
                        type="number" 
                        step="0.01"
                        required 
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <select 
                    name="reason_id" 
                    required 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">Seleccione un motivo...</option>
                    {reasons.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Observaciones</label>
                <textarea 
                    name="notes" 
                    rows={3} 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Detalles adicionales..."
                />
            </div>

            <button 
                type="submit" 
                disabled={isPending}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
                {isPending ? 'Registrando...' : 'Registrar Baja'}
            </button>
        </form>
    );
}
