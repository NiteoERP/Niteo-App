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

let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

// find the function
let startIdx = content.indexOf('const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {');
let endIdx = content.indexOf('useEffect(() => {', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    let oldFn = content.substring(startIdx, endIdx);
    
    let newFn = `${compressionHelper}
  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64Str = await compressImage(file);
      const { scanInvoice } = await import('@/actions/ai-actions');

      const invContext = insumos.map(i => ({ id: i.id, nombre: i.nombre, unidad_medida: i.unidad_medida }));
      const res = await scanInvoice(base64Str, file.type || 'image/jpeg', invContext);

      if (res.error) {
        alert(res.error);
      } else if (res.data) {
        const d = res.data;

        if (d.moneda === 'VES' || d.moneda === 'USD') setMonedaGlobal(d.moneda);
        if (d.proveedor_nombre && d.proveedor_nombre !== 'Desconocido') setProveedor(d.proveedor_nombre);
        if (d.descuento_total) setDescuento(d.descuento_total.toString());
        if (d.monto_iva) setIva(d.monto_iva.toString());

        const newCart: CartItem[] = (d.items || []).map((item: any, i: number) => {
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
            unidad_compra: item.es_bulto ? 'Bulto' : 'Unidad',
            factor_compra: factor,
            cantidad_base: qty * factor,
            costoTotal: costo,
            monedaItem: d.moneda,
          };
        });

        setCart(prev => [...prev, ...newCart]);
      }
    } catch (errInner) {
      console.error('Error IA:', errInner);
      alert('Hubo un problema de conexión con la IA. Es posible que el servidor esté saturado (Rate Limit). Intenta de nuevo en un minuto.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (fileInputRefCam.current) fileInputRefCam.current.value = '';
    }
  };

  `;
    
    content = content.replace(oldFn, newFn);
    fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');
}

console.log('Replaced function in MobileCompraForm.tsx');