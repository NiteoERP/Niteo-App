const fs = require('fs');

const compressionHelper = `
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };
`;

let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// find the function
let startIdx = content.indexOf('const handleScanInvoiceFac = async (e: React.ChangeEvent<HTMLInputElement>) => {');
let endIdx = content.indexOf('// Cart para insumos en factura');

if (startIdx !== -1 && endIdx !== -1) {
    let oldFn = content.substring(startIdx, endIdx);
    
    let newFn = `${compressionHelper}
  const handleScanInvoiceFac = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFac(true);
    try {
      const base64Str = await compressImage(file);
      const { scanInvoice } = await import('@/actions/ai-actions');
      
      const invContext = insumosList.map(i => ({ id: i.id, nombre: i.nombre, unidad_medida: i.unidad_medida }));
      const res = await scanInvoice(base64Str, file.type || 'image/jpeg', invContext);
      
      if (res.error) {
        alert(res.error);
      } else if (res.data) {
        const d = res.data;
        
        if (d.proveedor_nombre && d.proveedor_nombre !== 'Desconocido' && d.proveedor_nombre !== '?? Ilegible') {
          const provMatches = todosProveedores.filter(p => { const pName = (p.nombre_comercial || p.nombre_proveedor || p.nombre || '').toLowerCase(); const aiName = d.proveedor_nombre.toLowerCase(); return pName.includes(aiName) || aiName.includes(pName); });
          if (provMatches.length > 0) {
            setFacProveedorId(provMatches[0].id);
          } else {
            const { crearProveedorRapido } = await import('@/app/dashboard/proveedores/actions');
            const resProv = await crearProveedorRapido(d.proveedor_nombre);
            if (resProv.success && resProv.data) {
              setTodosProveedores(prev => [resProv.data, ...prev]); setProveedores(prev => [resProv.data, ...prev]);
              setFacProveedorId(resProv.data.id);
            }
          }
        }

        if (d.moneda === 'VES' || d.moneda === 'USD') setFacMoneda(d.moneda);
        if (d.descuento_total) setFacDescuento(d.descuento_total.toString());
        if (d.monto_iva) setFacIva(d.monto_iva.toString());
        if (d.fecha) setFacFecha(d.fecha);
        if (d.fecha_vencimiento) setFacFechaVencimiento(d.fecha_vencimiento);

        const newCart = (d.items || []).map((item: any, i: number) => {
          const isNew = !item.insumo_id_recomendado;
          const factor = item.es_bulto ? (item.unidades_por_bulto_estimado || 1) : 1;
          const qty = item.cantidad || 1;
          const costo = item.precio_total ?? ((item.precio_unitario ?? 0) * qty);
          return {
            id: Date.now().toString() + i,
            insumo_id: item.insumo_id_recomendado || null,
            is_new: isNew,
            nombre_nuevo: isNew ? (item.nombre_original_factura || '') : '',
            unidad_nueva: isNew ? (item.es_bulto ? 'Bulto' : (item.unidad_medida_sugerida || 'Unidad')) : '',
            cantidad: qty,
            precioUnitario: costo / qty,
            costoTotal: costo,
            monedaItem: d.moneda
          };
        });
        
        setFacItems(prev => [...prev, ...newCart]);
      }
    } catch (errInner) {
      console.error('Error IA:', errInner);
      alert('Hubo un problema de conexión con la IA. Es posible que el servidor esté saturado (Rate Limit). Intenta de nuevo en un minuto.');
    } finally {
      setIsScanningFac(false);
      if (fileInputRefFac.current) fileInputRefFac.current.value = '';
      if (fileInputRefFacCam.current) fileInputRefFacCam.current.value = '';
    }
  };
  
  `;
    
    content = content.replace(oldFn, newFn);
    fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
}

console.log('Replaced function in page.tsx');