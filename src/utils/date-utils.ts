/**
 * Utilidades para manejo seguro de fechas y zonas horarias en Niteo App.
 * Evita el problema común donde fechas almacenadas a medianoche UTC (T00:00:00)
 * o fechas seleccionadas como 'YYYY-MM-DD' se desplazan al día anterior en Venezuela (UTC-4).
 */

export const DEFAULT_TIMEZONE = 'America/Caracas';
export const DEFAULT_TZ_OFFSET = '-04:00';

/**
 * Obtiene dinámicamente el offset UTC (ej. "-04:00", "-05:00", "+02:00", "+00:00")
 * para cualquier zona horaria IANA válida en una fecha dada.
 */
export function getTimezoneOffsetString(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): string {
  try {
    const tz = timeZone || DEFAULT_TIMEZONE;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset'
    }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
      if (tzPart.value === 'GMT') return '+00:00';
    }
  } catch (e) {
    console.warn(`[date-utils] Error determinando offset para timezone "${timeZone}", usando fallback.`, e);
  }
  return DEFAULT_TZ_OFFSET;
}

export function toSafeIsoDate(d?: string | null): string {
  if (!d) return new Date().toISOString();
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }
  return trimmed;
}

/**
 * Formatea una fecha/hora ISO en la zona horaria del negocio.
 * Retorna ej: "12 sept - 10:45 PM"
 */
export function formatDateTimeLocal(
  iso?: string | null,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const tz = timeZone || DEFAULT_TIMEZONE;
  const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: tz };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz };
  return `${d.toLocaleDateString('es-ES', dateOpts)} - ${d.toLocaleTimeString('en-US', timeOpts)}`;
}

/**
 * Convierte un timestamp a una clave YYYY-MM-DD en la zona horaria especificada.
 */
export function toLocalDateKey(
  iso?: string | Date | null,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  const tz = timeZone || DEFAULT_TIMEZONE;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
}

/**
 * Construye el rango ISO [inicio, fin] con offset de zona horaria inteligente.
 * Acepta tanto un nombre de zona ("America/Caracas", "America/Bogota") como un offset directo ("-04:00").
 * Si se pasa 'YYYY-MM-DD', retorna desde 00:00:00[tzOffset] hasta 23:59:59.999[tzOffset].
 * Si se pasa 'YYYY-MM', cubre todo el mes.
 */
export function getLocalDayRange(
  dateStr: string,
  timeZoneOrOffset: string = DEFAULT_TIMEZONE
): { start: string; end: string } {
  const tzOffset = /^[+-]\d{2}:\d{2}$/.test(timeZoneOrOffset)
    ? timeZoneOrOffset
    : getTimezoneOffsetString(timeZoneOrOffset);

  if (dateStr.length === 7) { // YYYY-MM
    const [y, m] = dateStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${dateStr}-01T00:00:00${tzOffset}`,
      end: `${dateStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999${tzOffset}`
    };
  }
  return {
    start: `${dateStr}T00:00:00${tzOffset}`,
    end: `${dateStr}T23:59:59.999${tzOffset}`
  };
}

export function formatFecha(dateStr?: string | null, options?: { includeTime?: boolean; timeZone?: string }): string {
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

    const tz = options?.timeZone || DEFAULT_TIMEZONE;

    if (options?.includeTime) {
      return date.toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: tz
      });
    }

    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: tz
    });
  } catch {
    return String(dateStr);
  }
}
