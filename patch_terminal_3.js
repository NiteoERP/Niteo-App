const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'pos', 'TerminalVirtual.tsx');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const getPrecioParaLista')) {
  const func = `
  const getPrecioParaLista = (prod, listaId) => {
    if (listaId === 'base') return prod.precio_venta;
    const lista = listasPrecios.find(l => l.id === listaId);
    if (!lista) return prod.precio_venta;
    
    if (lista.tipo_calculo === 'PORCENTAJE_BASE') {
      return prod.precio_venta * (1 + (lista.porcentaje_modificador || 0) / 100);
    } else {
      return (prod.precios_dinamicos && prod.precios_dinamicos[listaId] !== undefined) 
        ? prod.precios_dinamicos[listaId] 
        : prod.precio_venta;
    }
  };
  `;
  code = code.replace("const agregarProducto = useCallback((prod: ProductoPOS) => {", func + "\n  const agregarProducto = useCallback((prod: ProductoPOS) => {");
}

code = code.replace(
  /return \[\n\s*\.\.\.prev,\n\s*\{\n\s*producto_id: prod\.producto_id,\n\s*nombre: prod\.nombre,\n\s*precio_unitario: prod\.precio_venta,\n\s*cantidad: 1,\n\s*precio_modificable: prod\.precio_modificable,\n\s*\},\n\s*\];/,
  `return [
          ...prev,
          {
            producto_id: prod.producto_id,
            nombre: prod.nombre,
            precio_unitario: getPrecioParaLista(prod, globalListaPrecio),
            cantidad: 1,
            precio_modificable: prod.precio_modificable,
            lista_precio_id: globalListaPrecio,
            producto_original: prod
          },
        ];`
);

if (!code.includes('useEffect(() => { // update cart prices')) {
  const effect = `
  useEffect(() => { // update cart prices
    setCarrito(prev => prev.map(item => {
      if (!item.producto_original) return item;
      return {
        ...item,
        lista_precio_id: globalListaPrecio,
        precio_unitario: getPrecioParaLista(item.producto_original, globalListaPrecio)
      };
    }));
  }, [globalListaPrecio, listasPrecios]);
  `;
  code = code.replace("const cambiarCantidad =", effect + "\n  const cambiarCantidad =");
}

if (!code.includes('const cambiarListaPrecioItem =')) {
  const fn = `
  const cambiarListaPrecioItem = (producto_id: string, nuevaListaId: string) => {
    setCarrito(prev => prev.map(item => {
      if (item.producto_id === producto_id && item.producto_original) {
        return {
          ...item,
          lista_precio_id: nuevaListaId,
          precio_unitario: getPrecioParaLista(item.producto_original, nuevaListaId)
        };
      }
      return item;
    }));
  };
  `;
  code = code.replace("const eliminarItem = useCallback((producto_id: string) => {", fn + "\n  const eliminarItem = useCallback((producto_id: string) => {");
}

// Global selector UI injection
if (!code.includes('Selector Global de Precio')) {
  const globalUI = `
          {/* Selector Global de Precio */}
          {listasPrecios.length > 0 && (
            <div className="bg-neutral-900 border-b border-neutral-800 p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-400">Lista de Precios Global:</span>
              <select
                className="bg-neutral-950 border border-neutral-800 text-sm text-white rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                value={globalListaPrecio}
                onChange={(e) => setGlobalListaPrecio(e.target.value)}
              >
                <option value="base">Precio Base (Normal)</option>
                {listasPrecios.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
          )}
  `;
  code = code.replace(
    '<div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">',
    '<div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">\n' + globalUI
  );
}

// Individual item selector UI
if (!code.includes('cambiarListaPrecioItem(item.producto_id')) {
  const individualUI = `
                      {/* Individual Price List Selector */}
                      {listasPrecios.length > 0 && item.producto_original && (
                        <div className="mt-2">
                          <select
                            className="bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:outline-none w-auto"
                            value={item.lista_precio_id || 'base'}
                            onChange={(e) => cambiarListaPrecioItem(item.producto_id, e.target.value)}
                          >
                            <option value="base">Normal</option>
                            {listasPrecios.map(l => (
                              <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                          </select>
                        </div>
                      )}
  `;
  
  // Find where to inject in the cart item render block.
  // There is typically a block like `<h4 className="text-sm font-semibold text-white">`
  code = code.replace(
    '</button>\n                      </div>\n                    </div>\n                  </div>',
    '</button>\n                      </div>\n                    </div>\n' + individualUI + '\n                  </div>'
  );
}


fs.writeFileSync(file, code);
