const fs = require('fs');

let pageContent = fs.readFileSync('src/app/catalogo/[slug]/page.tsx', 'utf8');

const oldFilterLogic = `  const productosConStock = (productos || []).filter(prod => {
    const recetasProd = (recetas || []).filter(r => r.producto_id === prod.id);
    if (recetasProd.length === 0) {
      // Sin receta: consideramos disponible si tiene imagen o no es compuesto
      return true;
    }
    // Tiene receta: todos los insumos deben tener stock suficiente
    return recetasProd.every(r => {
      const stock = insumosMap.get(r.insumo_id) ?? 0;
      return stock >= r.cantidad_necesaria;
    });
  });`;

const newFilterLogic = `  const productosConStock = (productos || []).map(prod => {
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
  });`;

pageContent = pageContent.replace(oldFilterLogic, newFilterLogic);
fs.writeFileSync('src/app/catalogo/[slug]/page.tsx', pageContent, 'utf8');

let clientContent = fs.readFileSync('src/app/catalogo/[slug]/CatalogoPublicoClient.tsx', 'utf8');

const interfaceStr = `  estado_activo: boolean;`;
const newInterfaceStr = `  estado_activo: boolean;
  stock_disponible?: number | null;`;
clientContent = clientContent.replace(interfaceStr, newInterfaceStr);

const addToCartStr = `  const addToCart = useCallback((prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === prod.id);
      if (existing) {
        return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
  }, []);`;

const newAddToCartStr = `  const addToCart = useCallback((prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === prod.id);
      if (existing) {
        if (prod.stock_disponible !== null && prod.stock_disponible !== undefined && existing.cantidad >= prod.stock_disponible) {
          alert('¡Stock máximo alcanzado! Solo hay ' + prod.stock_disponible + ' disponibles.');
          return prev;
        }
        return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      if (prod.stock_disponible !== null && prod.stock_disponible !== undefined && prod.stock_disponible < 1) {
         return prev;
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
  }, []);`;
clientContent = clientContent.replace(addToCartStr, newAddToCartStr);

const updateQtyStr = `  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0)
    );
  }, []);`;

const newUpdateQtyStr = `  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const newQty = item.cantidad + delta;
      
      if (delta > 0 && item.stock_disponible !== null && item.stock_disponible !== undefined && newQty > item.stock_disponible) {
         alert('¡Stock máximo alcanzado! Solo hay ' + item.stock_disponible + ' disponibles.');
         return prev;
      }
      
      return prev
        .map(i => i.id === id ? { ...i, cantidad: newQty } : i)
        .filter(i => i.cantidad > 0);
    });
  }, []);`;
clientContent = clientContent.replace(updateQtyStr, newUpdateQtyStr);

// Also add a little stock indicator to the UI
const tagStr = `{prod.categorias?.nombre && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1 block">
                          {prod.categorias.nombre}
                        </span>
                      )}`;
const newTagStr = `{prod.categorias?.nombre && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1 block">
                          {prod.categorias.nombre}
                        </span>
                      )}
                      {prod.stock_disponible !== null && prod.stock_disponible !== undefined && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1 block">
                          Solo {prod.stock_disponible} disponibles
                        </span>
                      )}`;
clientContent = clientContent.replace(tagStr, newTagStr);

fs.writeFileSync('src/app/catalogo/[slug]/CatalogoPublicoClient.tsx', clientContent, 'utf8');
console.log('Success stock update');
