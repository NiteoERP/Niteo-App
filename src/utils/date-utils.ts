/**
 * Utilidades para manejo seguro de fechas y zonas horarias en Niteo App.
 * Evita el problema común donde fechas almacenadas a medianoche UTC (T00:00:00)
 * o fechas seleccionadas como 'YYYY-MM-DD' se desplazan al día anterior en Venezuela (UTC-4).
 */

export function toSafeIsoDate(d?: string | null): string {
  if (!d) return new Date().toISOString();
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }
  return trimmed;
}

export function formatFecha(dateStr?: string | null, options?: { includeTime?: boolean }): string {
  if (!dateStr) return '-';
  try {
    const trimmed = String(dateStr).trim();
    // Si es solo YYYY-MM-DD o se guardó como medianoche UTC (T00:00:00)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || trimmed.includes('T00:00:00')) {
      const datePart = trimmed.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}/${m}/${y}`;
      }
    }

    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return trimmed;

    if (options?.includeTime) {
      return date.toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}
