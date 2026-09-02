import { fetchShrinkagesAction, fetchShrinkageReasonsAction } from '@/actions/mermas-actions';
import ShrinkageForm from './ShrinkageForm';
import ShrinkageList from './ShrinkageList';

export default async function MermasPage() {
    const shrinkages = await fetchShrinkagesAction();
    const reasons = await fetchShrinkageReasonsAction();
    
    // Cálculo de métricas
    const totalLoss = shrinkages.reduce((acc, curr) => acc + (Number(curr.total_loss) || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Mermas</h1>
            
            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Costo Total Mermado (General)</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">${totalLoss.toFixed(2)}</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total de Registros</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-200 mt-2">{shrinkages.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario (1 columna en desktop) */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Registrar Merma</h2>
                        <ShrinkageForm reasons={reasons} />
                    </div>
                </div>
                
                {/* Tabla (2 columnas en desktop) */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <h2 className="text-xl font-semibold mb-4">Historial de Mermas</h2>
                        <ShrinkageList shrinkages={shrinkages} />
                    </div>
                </div>
            </div>
        </div>
    );
}
