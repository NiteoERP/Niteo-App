'use server';

import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// SERVER ACTIONS: MÓDULO DE DELIVERY
// ============================================================================

/**
 * Reclama un delivery dado un número de orden o documento.
 * Aplica la "Regla Anti-Picarones" y calcula el pago del repartidor buscando 
 * el ítem 'delivery' en los detalles de la factura.
 */
export async function reclamarDeliveryManual(numeroOrden: string) {
  try {
    const supabase = await createClient();
    
    // 1. Obtener usuario actual (el repartidor)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('No estás autenticado');

    // Asumimos que el empresa_id viene del perfil del usuario (protección multitenant)
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id, nombre_completo')
      .eq('id', user.id)
      .single();
      
    if (!perfil) throw new Error('Perfil no encontrado');

    // 2. Buscar la factura por número de orden o documento
    const { data: factura, error: facturaError } = await supabase
      .from('ventas_facturas')
      .select(`
        id, 
        estado_delivery, 
        repartidor:perfiles!ventas_facturas_repartidor_id_fkey(nombre_completo)
      `)
      .eq('empresa_id', perfil.empresa_id)
      .or(`numero_orden.eq.${numeroOrden},numero_documento.eq.${numeroOrden}`)
      .single();

    if (facturaError || !factura) {
      return { success: false, message: '❌ Orden no encontrada. Verifica el número.' };
    }

    // 3. Regla Anti-Picarones: Validar si ya fue entregado
    if (factura.estado_delivery === 'ENTREGADO') {
      const nombreQuienReclamo = (factura.repartidor as any)?.nombre_completo || (Array.isArray(factura.repartidor) && (factura.repartidor as any)[0]?.nombre_completo) || 'otro repartidor';
      return { 
        success: false, 
        message: `⚠️ Este pedido ya fue reclamado por ${nombreQuienReclamo}.` 
      };
    }

    // 4. Buscar cuánto vale el Delivery en los detalles de la factura
    // Hacemos un JOIN con la tabla productos para buscar la palabra 'delivery'
    const { data: detalles } = await supabase
      .from('ventas_detalles')
      .select(`
        total,
        producto:productos!inner(nombre)
      `)
      .eq('factura_id', factura.id)
      .ilike('productos.nombre', '%delivery%');

    // Si encontró el producto 'delivery', tomamos su total, si no, es 0
    const pagoRepartidor = (detalles && detalles.length > 0) ? detalles[0].total : 0;

    // 5. Actualizar la factura (Bloqueo Atómico con la condición estado_delivery != ENTREGADO)
    const { error: updateError, count } = await supabase
      .from('ventas_facturas')
      .update({
        estado_delivery: 'ENTREGADO',
        repartidor_id: user.id,
        pago_repartidor: pagoRepartidor
      })
      .eq('id', factura.id)
      .neq('estado_delivery', 'ENTREGADO'); // Doble candado por si 2 le dan clic a la vez

    if (updateError || count === 0) {
      return { success: false, message: '⚠️ Hubo un conflicto, alguien reclamó esto en el último segundo.' };
    }

    return { 
      success: true, 
      message: `✅ ¡Orden reclamada!`,
      pagoSumado: pagoRepartidor 
    };

  } catch (error: any) {
    console.error("Error en reclamarDelivery:", error);
    return { success: false, message: '❌ Error interno del servidor.' };
  }
}

/**
 * Procesa la foto de una comanda usando Inteligencia Artificial (Gemini Vision)
 * para extraer el número de orden y luego reclamarla automáticamente.
 */
export async function procesarFotoDelivery(base64Image: string) {
  try {
    // Verificamos que exista la API Key en el entorno
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no configurada");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Configuramos el modelo principal que confirmaste que funciona perfecto y rápido
    let model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Eres un sistema automático de lectura de tickets de restaurante (OCR).
      Busca en esta imagen el "Número de Orden" o "Número de Documento" o "Factura".
      Suele ser un número de 3 a 8 dígitos (ej. 001524, 125, etc).
      Devuelve ÚNICAMENTE el número, sin letras, sin espacios, sin explicaciones. 
      Si no encuentras ningún número lógico, devuelve la palabra ERROR.
    `;

    // Limpiamos el base64 por si trae el prefix de HTML
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg" // Asumimos jpeg por simplicidad en captura de móvil
        },
      },
    ];

    let extractedText = '';
    
    try {
      // Intentamos con el modelo principal
      const result = await model.generateContent([prompt, ...imageParts]);
      extractedText = result.response.text().trim();
    } catch (primaryError) {
      console.warn("Fallo gemini-flash-latest, intentando con el respaldo lite...", primaryError);
      // Fallback al modelo de respaldo ultra rápido si el primero se satura o falla
      model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
      const fallbackResult = await model.generateContent([prompt, ...imageParts]);
      extractedText = fallbackResult.response.text().trim();
    }

    if (extractedText === 'ERROR' || extractedText === '') {
      return { success: false, message: 'Error al escanear, intente nuevamente o ingrese manualmente.' };
    }

    // Una vez que la IA extrajo el número, ejecutamos el proceso normal
    return await reclamarDeliveryManual(extractedText);

  } catch (error: any) {
    console.error("Error en OCR:", error);
    
    // Traducción de errores de timeout o saturación (503/504) según el reporte técnico
    const errMsg = error?.message?.toLowerCase() || '';
    if (errMsg.includes('503') || errMsg.includes('504') || errMsg.includes('timeout')) {
      return { success: false, message: 'Servidor saturado, intenta en un minuto o ingresa manual.' };
    }
    
    return { success: false, message: 'Error al escanear, intente nuevamente o ingrese manualmente.' };
  }
}
