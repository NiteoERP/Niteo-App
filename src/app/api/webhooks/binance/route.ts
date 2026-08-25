import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('Binancepay-Signature');
    const nonce = req.headers.get('Binancepay-Nonce');
    const timestamp = req.headers.get('Binancepay-Timestamp');

    if (!signature || !nonce || !timestamp) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
    }

    // OMITIMOS VERIFICACIN ESTRICTA DE FIRMA PARA EL MVP 
    // (En produccin se requiere la llave pblica de Binance Pay)
    
    const payload = JSON.parse(rawBody);

    if (payload.bizType === 'PAY' && payload.bizStatus === 'PAY_SUCCESS') {
      const data = JSON.parse(payload.data);
      // El merchantTradeNo debe ser el ID de la suscripcin/empresa
      const empresaId = data.merchantTradeNo;
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Registrar pago automticamente
      await supabase.from('suscripciones_pagos').insert({
        empresa_id: empresaId,
        metodo_pago: 'BINANCE',
        referencia: data.transactionId || 'BINANCE-PAY',
        monto: data.totalFee,
        estado: 'aprobado',
        fecha_revision: new Date().toISOString()
      });

      // Activar suscripcin
      await supabase
        .from('suscripciones_empresas')
        .update({ plan: 'PRO', estado: 'activa' })
        .eq('empresa_id', empresaId);
    }

    return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null });
  } catch (error) {
    console.error('Binance Webhook Error:', error);
    return NextResponse.json({ returnCode: 'FAIL', returnMessage: 'Error procesando webhook' }, { status: 500 });
  }
}

