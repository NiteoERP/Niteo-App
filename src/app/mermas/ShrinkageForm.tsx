'use client';

import { useRef, useState } from 'react';
import { registerShrinkageAction } from '@/actions/mermas-actions';

export default function ShrinkageForm({ 
    reasons, 
    onOptimisticAdd 
}: { 
    reasons: any[],
    onOptimisticAdd: (shrinkage: any) => void
}) {
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        
        const formData = new FormData(e.currentTarget);
        
        // 1. Extraer los datos para el estado optimista instantáneo
        const quantity = parseFloat(formData.get('quantity') as string);
        const unitCost = parseFloat(formData.get('unit_cost') as string);
        const reasonId = formData.get('reason_id') as string;
        
        const selectedReason = reasons.find(r => r.id === reasonId);
        
        const optimisticShrinkage = {
            id: crypto.randomUUID(), // ID temporal
            product_id: formData.get('product_id'),
            quantity: quantity,
            unit_cost: unitCost,
            total_loss: quantity * unitCost,
            created_at: new Date().toISOString(),
            shrinkage_reasons: { name: selectedReason?.name || 'Procesando...' },
            isOptimistic: true // Bandera opcional para UI (ej. opacidad reducida)
        };

        // 2. Ejecutar la actualización optimista para latencia cero
        onOptimisticAdd(optimisticShrinkage);
        
        // 3. Limpiar formulario inmediatamente para que el usuario pueda seguir trabajando
        formRef.current?.reset();
        setIsPending(true);

        try {
            // 4. Disparar el Server Action en segundo plano
            await registerShrinkageAction(formData);
        } catch (err: any) {
            setError(err.message || 'Error al registrar merma, refrescando...');
            // En un caso real más avanzado se manejaría el rollback o toast alert
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            
            <div>
                <label className="block text-sm font-medium mb-1">ID Producto</label>
                <input 
                    name="product_id" 
                    type="number" 
                    required 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
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
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Costo Unit.</label>
                    <input 
                        name="unit_cost" 
                        type="number" 
                        step="0.01"
                        required 
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <select 
                    name="reason_id" 
                    required 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Opcional..."
                />
            </div>

            <button 
                type="submit" 
                disabled={isPending}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 relative"
            >
                {isPending ? 'Sincronizando...' : 'Registrar Baja'}
            </button>
        </form>
    );
}
