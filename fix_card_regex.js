const fs = require('fs');

let c = fs.readFileSync('src/components/mesas/NuevaComanda.tsx', 'utf8');

const regex = /<div className="grid grid-cols-2 gap-2">[\s\S]*?<\/div>\s*\)\}/;

const newProductCard = `<div className="grid grid-cols-2 gap-2">
            {prodsFiltrados.map((prod: any) => {
              const cartInfo = getCartInfo(prod.id);
              const inCart = !!cartInfo;
              return (
                <div key={prod.id} className="relative h-full">
                  <button
                    onClick={() => agregarAlCarrito(prod)}
                    className={\`w-full h-full bg-neutral-900 border p-3 rounded-xl flex flex-col items-start justify-between min-h-[90px] text-left active:scale-95 transition-all group \${
                      inCart ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-neutral-800 hover:border-indigo-500/50'
                    }\`}
                  >
                    <p className={\`text-sm font-medium line-clamp-2 leading-snug transition-colors \${inCart ? 'text-white' : 'text-white group-hover:text-indigo-300'}\`}>
                      {prod.nombre}
                    </p>
                    <p className="text-indigo-400 text-sm font-bold mt-1.5">\${Number(prod.precio_venta).toFixed(2)}</p>
                  </button>
                  
                  {inCart && (
                    <div className="absolute -top-2 -right-2 flex items-center bg-indigo-600 rounded-lg shadow-lg overflow-hidden border border-indigo-500 z-10">
                      <span className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 select-none">
                        {cartInfo.totalCantidad}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarrito(prev => prev.filter(i => i.producto_id !== prod.id));
                        }}
                        className="p-1.5 bg-rose-500 hover:bg-rose-400 transition-colors border-l border-indigo-500/30"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}`;

if (regex.test(c)) {
    c = c.replace(regex, newProductCard);
    fs.writeFileSync('src/components/mesas/NuevaComanda.tsx', c, 'utf8');
    console.log('Success regex replace');
} else {
    console.log('Regex did not match!');
}
