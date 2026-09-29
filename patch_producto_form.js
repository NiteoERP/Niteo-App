const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'dashboard', 'catalogo', 'ProductoForm.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Imports
if (!code.includes('import { getListasPrecios')) {
  code = code.replace(
    "import { createProducto, updateProducto } from '@/actions/catalogo-actions';",
    "import { createProducto, updateProducto } from '@/actions/catalogo-actions';\nimport { getListasPrecios, getPreciosPorProducto } from '@/actions/listas-precios-actions';"
  );
}

// 2. States and useEffect
if (!code.includes('const [listasPrecios')) {
  const stateInsert = `
  const [listasPrecios, setListasPrecios] = useState<any[]>([]);
  const [preciosDinamicos, setPreciosDinamicos] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      const res = await getListasPrecios();
      if (res.success && res.data) {
        setListasPrecios(res.data.filter((l: any) => l.estado_activo));
      }
      if (isEditing && initialData?.id) {
        const pricesRes = await getPreciosPorProducto(initialData.id);
        if (pricesRes.success && pricesRes.data) {
          const map: Record<string, number> = {};
          pricesRes.data.forEach((p: any) => {
            map[p.lista_precio_id] = p.precio;
          });
          setPreciosDinamicos(map);
        }
      }
    };
    fetchData();
  }, [isEditing, initialData]);
`;

  code = code.replace(
    "const [isPending, startTransition] = useTransition();",
    "const [isPending, startTransition] = useTransition();" + stateInsert
  );
}

// 3. UI
if (!code.includes('Listas de Precios Adicionales')) {
  const uiInsert = `
              {/* Listas de Precios Dinámicas */}
              {listasPrecios.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <PackageSearch size={16} className="text-indigo-400" /> Listas de Precios Adicionales
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listasPrecios.map((lista) => {
                      const isPorcentaje = lista.tipo_calculo === 'PORCENTAJE_BASE';
                      const calcPrice = isPorcentaje 
                        ? formData.precio_venta * (1 + lista.porcentaje_modificador / 100) 
                        : (preciosDinamicos[lista.id] || 0);

                      return (
                        <div key={lista.id}>
                          <label className="text-xs font-medium text-neutral-400 block mb-1.5 flex justify-between">
                            <span>{lista.nombre}</span>
                            {isPorcentaje && <span className="text-indigo-400 text-[10px]">{lista.porcentaje_modificador > 0 ? '+' : ''}{lista.porcentaje_modificador}%</span>}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                            <input 
                              type="number" step="0.01" min="0"
                              className={\`w-full border rounded-lg pl-7 pr-4 py-2 text-sm font-mono \${isPorcentaje ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-neutral-950 border-neutral-800 text-white focus:border-indigo-500'}\`}
                              value={isPorcentaje ? parseFloat(calcPrice.toFixed(2)) : (preciosDinamicos[lista.id] || '')}
                              onChange={e => {
                                if (!isPorcentaje) {
                                  setPreciosDinamicos(prev => ({ ...prev, [lista.id]: parseFloat(e.target.value) }));
                                }
                              }}
                              readOnly={isPorcentaje}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
`;

  code = code.replace(
    'onChange={e => handlePrecioChange(parseFloat(e.target.value))}\n                  />\n                </div>\n              </div>',
    'onChange={e => handlePrecioChange(parseFloat(e.target.value))}\n                  />\n                </div>\n              </div>\n' + uiInsert
  );
}

// 4. handleSubmit modifications
if (!code.includes('precios_dinamicos: pdArr')) {
  const payloadAdd = `
        const pdArr = listasPrecios.map(l => ({
          lista_precio_id: l.id,
          precio: l.tipo_calculo === 'PORCENTAJE_BASE' ? (formData.precio_venta * (1 + l.porcentaje_modificador / 100)) : (preciosDinamicos[l.id] || 0)
        }));
`;
  
  code = code.replace(
    "const payload = {\n          ...formData,",
    payloadAdd + "        const payload = {\n          ...formData,\n          precios_dinamicos: pdArr,"
  );
}

fs.writeFileSync(file, code);
