import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching productos es_reventa=true...');
  const { data: productos, error: err1 } = await supabase
    .from('productos')
    .select('id, empresa_id, nombre, costo, id_insumo_vinculado')
    .eq('es_reventa', true);

  if (err1) throw err1;
  console.log(`Found ${productos.length} reventa products.`);

  const { data: recetas, error: err2 } = await supabase
    .from('recetas')
    .select('producto_id, insumo_id');

  if (err2) throw err2;

  const { data: sedes, error: err3 } = await supabase.from('sedes').select('id, empresa_id');
  if (err3) throw err3;
  const sedesMap = {};
  sedes.forEach(s => {
    if (!sedesMap[s.empresa_id]) sedesMap[s.empresa_id] = s.id;
  });

  for (const prod of productos) {
    const isLinked = recetas.some(r => r.producto_id === prod.id && r.insumo_id !== null);
    
    if (!isLinked) {
      console.log(`Product ${prod.nombre} is not linked via recetas.`);
      
      let insumoId = prod.id_insumo_vinculado;
      
      if (!insumoId) {
        console.log(`- Missing id_insumo_vinculado. Creating new insumo...`);
        const { data: newInsumo, error: insumoErr } = await supabase
          .from('inventario_insumos')
          .insert({
            empresa_id: prod.empresa_id,
            sede_id: sedesMap[prod.empresa_id] || null,
            nombre: prod.nombre + ' (Reventa)',
            unidad_medida: 'Und',
            costo_promedio: prod.costo || 0,
            cantidad_actual: 0,
            es_reventa: true
          })
          .select()
          .single();
          
        if (insumoErr) {
          console.error(insumoErr);
          continue;
        }
        insumoId = newInsumo.id;
        
        // Also update the product's id_insumo_vinculado just in case
        await supabase.from('productos').update({ id_insumo_vinculado: insumoId }).eq('id', prod.id);
      }
      
      console.log(`- Linking to insumo ${insumoId}...`);
      await supabase.from('recetas').insert({
        empresa_id: prod.empresa_id,
        producto_id: prod.id,
        insumo_id: insumoId,
        cantidad_necesaria: 1
      });
    }
  }

  console.log('Fixing es_reventa flag on all inventario_insumos related to reventa...');
  const { data: linkedRecetas } = await supabase
    .from('recetas')
    .select('insumo_id, productos!inner(es_reventa)')
    .eq('productos.es_reventa', true);
    
  if (linkedRecetas && linkedRecetas.length > 0) {
    const insumoIds = linkedRecetas.map(r => r.insumo_id).filter(Boolean);
    const uniqueInsumoIds = [...new Set(insumoIds)];
    
    if (uniqueInsumoIds.length > 0) {
        const { error: updErr } = await supabase
          .from('inventario_insumos')
          .update({ es_reventa: true })
          .in('id', uniqueInsumoIds);
          
        if (updErr) console.error('Error updating es_reventa:', updErr);
        else console.log(`Updated ${uniqueInsumoIds.length} insumos to have es_reventa=true.`);
    }
  }

  // Also update anything with " (Reventa)" in the name just in case
  await supabase
    .from('inventario_insumos')
    .update({ es_reventa: true })
    .like('nombre', '%(Reventa)%');

  console.log('Done.');
}

run().catch(console.error);
