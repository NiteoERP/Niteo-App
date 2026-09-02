'use client';

export default function ShrinkageList({ shrinkages }: { shrinkages: any[] }) {
    if (!shrinkages || shrinkages.length === 0) {
        return <div className="text-gray-500 text-center py-8">No hay mermas registradas.</div>;
    }

    const getBadgeColor = (reasonName: string) => {
        if (reasonName.includes('Robo')) return 'bg-red-100 text-red-800';
        if (reasonName.includes('Caducidad')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Fecha</th>
                    <th className="px-4 py-3 font-medium">Producto ID</th>
                    <th className="px-4 py-3 font-medium text-right">Cant.</th>
                    <th className="px-4 py-3 font-medium text-right">Pérdida ($)</th>
                    <th className="px-4 py-3 font-medium rounded-tr-lg">Motivo</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {shrinkages.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                            #{s.product_id}
                        </td>
                        <td className="px-4 py-3 text-right">
                            {Number(s.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                            ${Number(s.total_loss).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeColor(s.shrinkage_reasons?.name || '')}`}>
                                {s.shrinkage_reasons?.name || 'Desconocido'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
