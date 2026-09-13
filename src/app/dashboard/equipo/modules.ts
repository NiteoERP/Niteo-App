export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  category: 'operaciones' | 'inventario' | 'clientes' | 'admin';
}

export const CATEGORY_LABELS: Record<string, string> = {
  operaciones: 'Ventas, POS y Caja',
  inventario: 'Inventario y AlmacÃ©n',
  clientes: 'Clientes y Finanzas',
  admin: 'Control y AdministraciÃ³n',
};

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  // Ventas y Caja
  { 
    id: 'pos', 
    label: 'Ventas y FacturaciÃ³n (POS)', 
    description: 'Punto de venta, cobro de tickets y terminal de venta', 
    category: 'operaciones' 
  },
  { 
    id: 'caja', 
    label: 'Cierre de Caja y Turnos', 
    description: 'Apertura y cierre de turnos, arqueo de caja y cuadres diarios', 
    category: 'operaciones' 
  },
  { 
    id: 'compras', 
    label: 'Compras y Facturas de Insumos', 
    description: 'RecepciÃ³n de insumos, registro de facturas y notas de compra', 
    category: 'operaciones' 
  },
  { 
    id: 'proveedores', 
    label: 'Proveedores', 
    description: 'Directorio de proveedores y cuentas por pagar', 
    category: 'operaciones' 
  },

  // Inventario
  { 
    id: 'inventario', 
    label: 'Inventario y Stock', 
    description: 'Existencias de insumos, recetas, mermas y transformaciones', 
    category: 'inventario' 
  },
  { 
    id: 'despachos', 
    label: 'Despachos entre Sedes', 
    description: 'Traslados de stock, envÃ­os y recepciones entre sucursales', 
    category: 'inventario' 
  },

  // Clientes y Finanzas
  { 
    id: 'clientes', 
    label: 'Directorio de Clientes', 
    description: 'GestiÃ³n y datos de contacto de clientes registrados', 
    category: 'clientes' 
  },
  { 
    id: 'creditos', 
    label: 'CrÃ©ditos y Cobranzas', 
    description: 'GestiÃ³n de cuentas por cobrar, abonos y ventas fiadas', 
    category: 'clientes' 
  },
  { 
    id: 'reportes', 
    label: 'Informes de Ventas', 
    description: 'Reportes de ventas, productos mÃ¡s vendidos y mÃ©tricas', 
    category: 'clientes' 
  },
  { 
    id: 'finanzas', 
    label: 'Finanzas y Flujo', 
    description: 'MÃ©tricas de ingresos brutos, costos operativos y margen neto', 
    category: 'clientes' 
  },

  // AdministraciÃ³n
  { 
    id: 'dashboard', 
    label: 'Dashboard / Inicio', 
    description: 'GrÃ¡ficos ejecutivos y KPIs de rendimiento del negocio', 
    category: 'admin' 
  },
  { 
    id: 'equipo', 
    label: 'GestiÃ³n de Equipo', 
    description: 'Crear personal, asignar permisos y cambiar contraseÃ±as', 
    category: 'admin' 
  },
  
  { 
    id: 'ajustes', 
    label: 'Ajustes de Empresa', 
    description: 'ConfiguraciÃ³n general de empresa, tasas y mÃ©todos de pago', 
    category: 'admin' 
  },
  { 
    id: 'ver_todas_compras', 
    label: 'Ver Compras Globales', 
    description: 'Visualizar compras de todas las sucursales sin restricciÃ³n de sede', 
    category: 'admin' 
  },
];

export const ROLE_PRESETS: Record<string, string[]> = {
  CAJERO: ['pos', 'caja'],
  GERENTE: [
    'dashboard', 'pos', 'caja', 'inventario', 'compras', 'proveedores',
    'despachos', 'clientes', 'creditos', 'reportes', 'finanzas'
  ],
  COMPRADOR: ['compras', 'proveedores', 'inventario'],
  MASTER: AVAILABLE_MODULES.map(m => m.id),
};

