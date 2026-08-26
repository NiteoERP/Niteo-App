const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

// Fix the ID property
code = code.replace(/venta\.id,/g, "venta.id_factura.toString(),");
code = code.replace(/v\.id === id/g, "v.id_factura.toString() === id");

// Fix the toggleVentaVerificada import
const importActionsRegex = /import \{ HistorialVentaPOS, getHistorialVentasCompleto \} from '@\/actions\/pos-actions';/;
code = code.replace(importActionsRegex, "import { HistorialVentaPOS, getHistorialVentasCompleto, toggleVentaVerificada } from '@/actions/pos-actions';");

// Fix the CheckCircle2 and Circle imports
const importIconsRegex = /import \{ Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users \} from 'lucide-react';/;
code = code.replace(importIconsRegex, "import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle } from 'lucide-react';");

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
