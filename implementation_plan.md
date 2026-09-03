# Soporte Multi-Moneda (USD / EUR)

Has solicitado que el sistema soporte tanto Dólares (USD) como Euros (EUR) y que se pueda elegir en los ajustes con cuál de las dos trabajar.

## Análisis de Impacto
Actualmente, el sistema está diseñado estructuralmente con el **USD (Dólar)** como moneda extranjera principal. Cambiar esto para que sea dinámico (USD o EUR) es un **cambio arquitectónico mayor**, ya que requiere modificar:
1. Las tablas de la base de datos para almacenar múltiples tasas (USD y EUR).
2. La Edge Function para consultar y guardar ambas tasas.
3. **Absolutamente todas las pantallas de la aplicación (más de 114 archivos detectados)** donde dice `USD`, `$`, `Divisas`, o se asume el cálculo en dólares, para que ahora lean la configuración de tu empresa y muestren el símbolo correcto (`€` o `$`).

## User Review Required

> [!WARNING]
> **Cambio a gran escala:** Esta modificación tocará el Punto de Venta, Compras, Informes, Inventario, Créditos y Finanzas. 
> ¿Estás completamente seguro de que deseas hacer este cambio ahora mismo, sabiendo que retrasará aún más el inicio del Módulo Contable?

## Proposed Changes

### 1. Base de Datos
- `[MODIFY]` Tabla `tasa_cambiaria`: Añadir columna `tasa_eur NUMERIC`.
- `[MODIFY]` Tabla `empresas`: Añadir columna `moneda_principal VARCHAR(3) DEFAULT 'USD'`.

### 2. Edge Function (Automatización)
- `[MODIFY]` `supabase/functions/sync-tasa-bcv/index.ts`: Consultar tanto la API de dólares como la de euros y guardar ambas tasas en la base de datos simultáneamente.

### 3. Configuraciones y Backend
- `[MODIFY]` `src/app/dashboard/configuracion/page.tsx`: Añadir el selector de moneda principal (USD / EUR).
- `[MODIFY]` `src/components/configuracion/GlobalTasaManager.tsx`: Mostrar dos paneles, uno para la Tasa USD y otro para la Tasa EUR.
- `[MODIFY]` Todas las acciones (`actions/*.ts`) que obtienen la tasa del día, para que devuelvan la correcta según la empresa.

### 4. Interfaz de Usuario (Global)
- `[MODIFY]` Crear un helper `formatDivisa(monto, moneda)` que use `$` o `€` dinámicamente.
- `[MODIFY]` Reemplazar todos los textos hardcodeados de "USD" y "$" en los módulos de POS, Caja, Compras e Informes.

## Verification Plan
1. Ir a Ajustes y cambiar la moneda principal a EUR.
2. Comprobar que el POS y los recibos impriman "EUR" y el símbolo "€".
3. Comprobar que la Edge Function guarda ambas tasas diariamente.
