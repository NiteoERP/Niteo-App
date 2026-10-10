const fs = require('fs');
const file = 'src/app/dashboard/proveedores/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Mejorar el footer de la tarjeta principal del proveedor (Adeudado + Pagar)
code = code.replace(
    /<div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto">/g,
    '<div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-neutral-800/50 sm:border-0">'
);

// 2. Mejorar el encabezado de "Facturas por Pagar" y sus botones
code = code.replace(
    /\{\/\* Esquina superior derecha: Historial de facturas y Agregar factura \*\/\}\s*<div className="flex items-center gap-2 flex-wrap">/g,
    `{/* Esquina superior derecha: Historial de facturas y Agregar factura */}
                          <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">`
);

// 3. Mejorar el bloque derecho de la tarjeta de cada factura (- Total / Saldo / + Abonar)
code = code.replace(
    /<div className="flex items-center gap-4">\s*<div className="text-right">/g,
    `<div className="flex items-center justify-between w-full sm:w-auto gap-4 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-neutral-800/50 sm:border-0">
                              <div className="text-right">`
);

// 4. Mejorar los botones de acción de cada factura (Editar, Ver Detalles, Eliminar, etc)
// Cambiamos el contenedor para separarlo más del título
code = code.replace(
    /<div className="flex items-center gap-3 mt-1\.5 flex-wrap">/g,
    '<div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">'
);

// Hacemos los botones ligeramente más grandes para tocarlos mejor
code = code.replace(
    /px-2 py-0\.5 rounded-lg/g,
    'px-2.5 py-1.5 rounded-lg'
);

fs.writeFileSync(file, code);
console.log("Card layout fixes applied.");
