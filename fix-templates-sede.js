const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/TransformacionesManager.tsx', 'utf-8');

// Modificamos handleGuardarPlantilla para inyectar el nombre
const target = `  const handleGuardarPlantilla = async () => {
    const validOrigenes = origenes.filter(o => o.insumo_id && o.cantidad > 0);
    const validDestinos = destinos.filter(d => d.insumo_id && d.cantidad > 0);`;

const replacement = `  const handleGuardarPlantilla = async () => {
    // Inyectar nombres para que la plantilla sirva en otras sedes
    const validOrigenes = origenes.filter(o => o.insumo_id && o.cantidad > 0).map(o => ({
      ...o,
      nombre_insumo: insumos.find(i => i.id === o.insumo_id)?.nombre
    }));
    const validDestinos = destinos.filter(d => d.insumo_id && d.cantidad > 0).map(d => ({
      ...d,
      nombre_insumo: insumos.find(i => i.id === d.insumo_id)?.nombre
    }));`;

code = code.replace(target, replacement);

// Y en handleCargarPlantilla, mapear por nombre si el ID no existe en la sede actual
const targetCargar = `    const p = plantillas.find(x => x.id === id);
    if (p) {
      setOrigenes(p.insumos_origen || []);
      setDestinos(p.insumos_destino || []);
    }`;

const replacementCargar = `    const p = plantillas.find(x => x.id === id);
    if (p) {
      // Intentar mapear insumos por ID o por Nombre (para soporte multi-sede)
      const mapItem = (item: any) => {
        let matched = insumos.find(i => i.id === item.insumo_id);
        if (!matched && item.nombre_insumo) {
          matched = insumos.find(i => i.nombre?.toLowerCase().trim() === item.nombre_insumo.toLowerCase().trim());
        }
        return {
          ...item,
          insumo_id: matched ? matched.id : ''
        };
      };
      
      setOrigenes((p.insumos_origen || []).map(mapItem));
      setDestinos((p.insumos_destino || []).map(mapItem));
    }`;

code = code.replace(targetCargar, replacementCargar);

fs.writeFileSync('src/app/dashboard/inventario/TransformacionesManager.tsx', code);
