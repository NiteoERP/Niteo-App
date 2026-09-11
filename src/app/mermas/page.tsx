import { fetchShrinkagesAction, fetchShrinkageReasonsAction } from '@/actions/mermas-actions';
import ShrinkageContainer from './ShrinkageContainer';

export default function MermasPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Mermas</h1>
            <ShrinkageContainer />
        </div>
    );
}
