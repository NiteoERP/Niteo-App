import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CatalogoPublicoClient from './CatalogoPublicoClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre_comercial')
    .eq('slug_catalogo', slug)
    .eq('catalogo_activo', true)
    .single();

  if (!empresa) {
    return { title: 'Catálogo no disponible' };
  }

  return {
    title: `Catálogo de ${empresa.nombre_comercial}`,
    description: `Explora el catálogo de productos de ${empresa.nombre_comercial} y realiza tu pedido por WhatsApp`,
    openGraph: {
      title: `Catálogo de ${empresa.nombre_comercial}`,
      description: `Explora y pide productos de ${empresa.nombre_comercial}`,
    },
  };
}

export default async function CatalogoPublicoPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Buscar la empresa por slug
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nombre_comercial, slug_catalogo, catalogo_activo, whatsapp_catalogo, simbolo_moneda, moneda')
    .eq('slug_catalogo', slug)
    .eq('catalogo_activo', true)
    .single();

  if (!empresa) {
    notFound();
  }

  // 2. Cargar productos activos con sus categorías y recetas
  const { data: productos } = await supabase
    .from('productos')
    .select('*, categorias(id, nombre)')
    .eq('empresa_id', empresa.id)
    .eq('estado_activo', true)
    .order('nombre');

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('empresa_id', empresa.id)
    .eq('estado_activo', true)
    .order('nombre');

  // 3. Cargar stocks del inventario para filtrar disponibles
  //    Unimos recetas → insumos para saber si hay existencia
  const { data: recetas } = await supabase
    .from('recetas')
    .select('producto_id, insumo_id, cantidad_necesaria')
    .eq('empresa_id', empresa.id);

  const { data: insumos } = await supabase
    .from('inventario_insumos')
    .select('id, cantidad_actual')
    .eq('empresa_id', empresa.id);

  // 4. Filtrar productos con stock disponible
  // Un producto tiene stock si TODOS sus insumos vinculados tienen cantidad_actual > 0
  const insumosMap = new Map((insumos || []).map(i => [i.id, i.cantidad_actual]));

  const productosConStock = (productos || []).map(prod => {
    let stock_disponible = null; // null = infinito / no trackeado

    if (prod.es_reventa && prod.id_insumo_vinculado) {
      stock_disponible = insumosMap.get(prod.id_insumo_vinculado) ?? 0;
    } else if (prod.es_compuesto) {
      const recetasProd = (recetas || []).filter(r => r.producto_id === prod.id);
      if (recetasProd.length > 0) {
        let maxPosible = Infinity;
        recetasProd.forEach(r => {
          const stock = insumosMap.get(r.insumo_id) ?? 0;
          if (r.cantidad_necesaria > 0) {
            const puedeHacer = Math.floor(stock / r.cantidad_necesaria);
            if (puedeHacer < maxPosible) maxPosible = puedeHacer;
          }
        });
        stock_disponible = maxPosible === Infinity ? 0 : maxPosible;
      }
    }

    return {
      ...prod,
      stock_disponible
    };
  }).filter(prod => {
    if (prod.stock_disponible !== null && prod.stock_disponible <= 0) {
      return false; // Ocultar si definitivamente no hay stock
    }
    return true;
  });

  return (
    <CatalogoPublicoClient
      empresa={empresa}
      productos={productosConStock}
      categorias={categorias || []}
    />
  );
}
