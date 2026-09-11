'use client';



import { useOptimistic } from 'react';
import ShrinkageForm from './ShrinkageForm';
import ShrinkageList from './ShrinkageList';
import { useMermasData } from '@/hooks/useMermasData';
import { Loader2 } from 'lucide-react';

export default function ShrinkageContainer() {
    const { mermas, reasons, isLoading, refetch } = useMermasData();
    
    // Implementación de Zero-Latency con useOptimistic
    const [optimisticShrinkages, addOptimisticShrinkage] = useOptimistic(
        mermas,
        (state, newShrinkage: any) => [newShrinkage, ...state]
    );

    if (isLoading) {
        return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" /> Cargando...</div>;
    }

    // Recalcular métricas de forma optimista
    const totalLoss = optimisticShrinkages.reduce((acc, curr) => acc + (Number(curr.total_loss) || 0), 0);

    return (
        <div className="space-y-6">
            {/* Dashboard Summary Optimista */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Costo Total Mermado (General)</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">${totalLoss.toFixed(2)}</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total de Registros</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-200 mt-2">{optimisticShrinkages.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Registrar Merma</h2>
                        {/* Pasamos la función optimista al formulario */}
                        <ShrinkageForm reasons={reasons} onOptimisticAdd={addOptimisticShrinkage} onSuccess={refetch} />
                    </div>
                </div>
                
                {/* Tabla Renderizando los datos optimistas */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <h2 className="text-xl font-semibold mb-4">Historial de Mermas</h2>
                        <ShrinkageList shrinkages={optimisticShrinkages} />
                    </div>
                </div>
            </div>
        </div>
    );
}
