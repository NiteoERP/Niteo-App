'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function scanInvoice(base64Image: string, mimeType: string, inventory: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return { error: 'Falta configurar GEMINI_API_KEY en .env.local' };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash', 
      generationConfig: { responseMimeType: "application/json" } 
    });

    const inventoryContext = inventory.map(i => {"id": "$", "nombre": "$", "unidad": "$"}).join('\n');

    const prompt = 
Eres un asistente experto en contabilidad y gestión de inventarios para un negocio en Venezuela.
Analiza esta imagen de una factura o ticket de compra y extrae los datos en formato JSON estricto.

Reglas de extracción:
1. Detecta la moneda: "USD" (Dólares) o "VES" (Bolívares). Observa símbolos como "Ref", "$", "Bs", "Bs.D".
2. Detecta el proveedor/tienda. Si no aparece claro, usa "Desconocido".
3. Extrae la fecha (formato YYYY-MM-DD). Si no la hay, usa la fecha actual.
4. Para los montos (subtotal, iva, total), conviértelos a número (ej. 15.50). Si no hay IVA, usa 0.
5. Para cada ítem, extrae su nombre, cantidad, precio unitario y precio total.
6. MATCHEA CON EL INVENTARIO: Usando el contexto de inventario provisto abajo, busca el insumo que más se parezca semánticamente al producto comprado (ej: "Aceite Mazeite 1L" -> "Aceite Vegetal"). Asigna su "id" exacto a "insumo_id_recomendado". Si no hay NADA similar, pon null.
7. DETECTA BULTOS: Si el ítem indica que es una caja, bulto, fardo o empaque múltiple (ej. "Bulto x 12", "Caja 24 unds"), pon "es_bulto": true, y si puedes deducir las unidades que trae el bulto, pon "unidades_por_bulto_estimado" (ej. 12, 24, 6). Si es una unidad individual, "es_bulto": false.

Inventario disponible:
$

Estructura JSON requerida (devuelve SOLO el objeto JSON):
{
  "proveedor_nombre": "String",
  "fecha": "YYYY-MM-DD",
  "moneda": "USD" | "VES",
  "subtotal": Number,
  "monto_iva": Number,
  "monto_total": Number,
  "items": [
    {
      "nombre_original_factura": "String",
      "insumo_id_recomendado": "String | null",
      "cantidad": Number,
      "es_bulto": Boolean,
      "unidades_por_bulto_estimado": Number | null,
      "precio_unitario": Number,
      "precio_total": Number
    }
  ]
}
;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } }
    ]);

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    return { success: true, data: parsed };
  } catch (error: any) {
    console.error('Error procesando factura con IA:', error);
    return { error: 'Error procesando la imagen con IA: ' + error.message };
  }
}