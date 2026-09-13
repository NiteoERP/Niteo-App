import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { master_key } = await request.json();

    if (!master_key) {
      return NextResponse.json({ error: 'Master key requerida' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('sedes')
      .select('id, empresa_id, nombre_sede')
      .eq('master_key', master_key)
      .eq('estado_activo', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Master key inválida o inactiva' }, { status: 404 });
    }

    return NextResponse.json({ sede: data });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
