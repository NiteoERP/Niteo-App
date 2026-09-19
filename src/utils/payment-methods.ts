/**
 * Normaliza una cadena de método de pago eliminando acentos,
 * espacios duplicados y convirtiendo a minúsculas para comparar
 * si dos nombres son letra por letra la misma (ej. "Pago Movil" === "Pago Móvil").
 */
export function normalizePaymentKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna el nombre canónico y legible para métodos comunes.
 */
export function getCanonicalPaymentMethodName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const key = normalizePaymentKey(trimmed);

  if (key === 'pago movil') return 'Pago Móvil';
  if (key === 'credito') return 'Crédito';
  if (key === 'cortesia') return 'Cortesía';
  if (key === 'efectivo bs' || key === 'efectivo bolivares') return 'Efectivo BS';
  if (key === 'efectivo usd' || key === 'efectivo dolares') return 'Efectivo USD';
  if (key === 'punto de venta' || key === 'punto') return 'Punto de Venta';
  if (key === 'zelle') return 'Zelle';
  if (key === 'binance') return 'Binance';
  if (key === 'cashea') return 'Cashea';
  if (key === 'paypal') return 'Paypal';

  return trimmed;
}

/**
 * Deduplica y unifica una lista de nombres de métodos de pago
 * que sean letra por letra la misma (ignorando tildes y mayúsculas).
 */
export function unifyPaymentMethods(methods: string[]): string[] {
  const map = new Map<string, string>();

  methods.forEach(m => {
    if (!m) return;
    const raw = m.trim();
    const key = normalizePaymentKey(raw);

    // Omitir cortesías y créditos de la lista genérica desplegable (tienen su propio botón/sección)
    if (key.includes('cortes') || key === 'credito') return;

    const canonical = getCanonicalPaymentMethodName(raw);
    if (!map.has(key)) {
      map.set(key, canonical);
    } else {
      // Si el nombre actual es más canónico o tiene acento, preferir la forma canónica
      const existing = map.get(key)!;
      if (canonical !== raw && existing === raw) {
        map.set(key, canonical);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'));
}
