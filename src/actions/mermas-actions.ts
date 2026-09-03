'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchShrinkageReasonsAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('shrinkage_reasons')
        .select('*')
        .eq('is_active', true);
        
    if (error) {
        console.error("Error fetching reasons:", error);
        return [];
    }
    return data;
}

export async function fetchShrinkagesAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('shrinkages')
        .select(`
            *,
            shrinkage_reasons (name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching shrinkages:", error);
        return [];
    }
    return data;
}

export async function registerShrinkageAction(formData: FormData) {
    const supabase = await createClient();
    
    // CORRECCIÓN: Bloqueo estricto si el usuario no está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("No autenticado. Acceso denegado.");
    }
    const userId = user.id;

    const productId = formData.get('product_id') as string;
    const reasonId = formData.get('reason_id') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const unitCost = parseFloat(formData.get('unit_cost') as string);
    const notes = formData.get('notes') as string;

    // Ejecutar RPC para transacción atómica
    const { error } = await supabase.rpc('register_shrinkage', {
        p_product_id: parseInt(productId),
        p_reason_id: reasonId,
        p_quantity: quantity,
        p_unit_cost: unitCost,
        p_notes: notes,
        p_user_id: userId
    });

    if (error) {
        console.error("Error registering shrinkage:", error);
        throw new Error(error.message);
    }

    revalidatePath('/mermas');
    return { success: true };
}
