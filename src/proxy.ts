import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // 1. Validar Variables de Entorno
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Faltan variables de entorno de Supabase');
    // Continuar sin bloquear para no dar 500, pero la app fallará en el cliente
    return NextResponse.next();
  }

  // 2. Configurar Supabase SSR Middleware
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rutas públicas y APIs sin autenticación de usuario (evita consulta innecesaria a Supabase)
  if (
    request.nextUrl.pathname.startsWith('/catalogo') ||
    request.nextUrl.pathname.startsWith('/terms') ||
    request.nextUrl.pathname.startsWith('/privacidad') ||
    request.nextUrl.pathname.startsWith('/cookies') ||
    request.nextUrl.pathname.startsWith('/reembolsos') ||
    request.nextUrl.pathname.startsWith('/novedades') ||
    request.nextUrl.pathname.startsWith('/api/webhooks') ||
    request.nextUrl.pathname.startsWith('/api/sync-bcv') ||
    request.nextUrl.pathname.startsWith('/api/vincular') ||
    request.nextUrl.pathname.startsWith('/api/v1')
  ) {
    return supabaseResponse;
  }

  // 3. Verificar Sesión Activa
  const { data: { user } } = await supabase.auth.getUser();

  // Si el usuario ya está autenticado y visita /login o /register, u otras rutas base
  if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    if (request.nextUrl.searchParams.has('add_account')) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Proteger rutas /dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Si no hay usuario, forzar al login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Permitir acceso a la ruta de billing siempre, para evitar loop infinito
    if (request.nextUrl.pathname.startsWith('/dashboard/billing')) {
      return supabaseResponse;
    }

    // 4. LEER PERFIL DIRECTAMENTE DEL JWT Y BASE DE DATOS
    try {
      let empresa_id = user.app_metadata?.empresa_id;
      let rol = user.app_metadata?.user_role as string | undefined;
      let permisos: string[] = user.app_metadata?.permisos ?? [];

      // Si falta empresa_id, rol o permisos, consultar perfiles para tener datos frescos
      if (!empresa_id || !rol || permisos.length === 0) {
        const { data: pDb } = await supabase
          .from('perfiles')
          .select('empresa_id, rol, permisos')
          .eq('id', user.id)
          .maybeSingle();
        if (pDb) {
          empresa_id = empresa_id || pDb.empresa_id;
          rol        = pDb.rol || rol;
          if (Array.isArray(pDb.permisos) && pDb.permisos.length > 0) {
            permisos = pDb.permisos;
          }
        }
      }

      const profile = empresa_id ? { empresa_id, rol: rol || 'CAJERO', permisos } : null;

      // Si el perfil no existe (sin empresa_id), verificar si es SUPERADMIN antes de mandar a onboarding
      if (!profile) {
        // El SUPERADMIN (niteomaster) no tiene empresa — va al panel /admin, nunca al onboarding
        if (rol === 'SUPERADMIN') {
          if (!request.nextUrl.pathname.startsWith('/admin')) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin';
            return NextResponse.redirect(url);
          }
          return supabaseResponse;
        }
        if (!request.nextUrl.pathname.startsWith('/onboarding')) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
        return supabaseResponse;
      }

      // Evitar loop infinito en onboarding si ya tienen perfil
      if (request.nextUrl.pathname.startsWith('/onboarding')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      if (profile) {
        // 5. Validación de Suscripción — leer plan, estado y fecha de vencimiento
        const { data: sub } = await supabase
          .from('suscripciones_empresas')
          .select('plan, estado, fecha_vencimiento')
          .eq('empresa_id', profile.empresa_id)
          .maybeSingle();
        const plan   = (sub?.plan  || '').toUpperCase();
        const estado = (sub?.estado || 'ACTIVA').toUpperCase();

        const isLifetime = plan === 'LIFETIME';

        // Verificar si la fecha de vencimiento ya pasó (independiente del estado en DB)
        const ahora = new Date();
        const fechaVenc = sub?.fecha_vencimiento ? new Date(sub.fecha_vencimiento) : null;
        const haVencido = fechaVenc ? fechaVenc < ahora : false;

        // Estado activo: sin suscripción (trial inicial), activa/activo, o no ha vencido
        const isActiva = !sub
          || estado === 'ACTIVA'
          || estado === 'ACTIVO'
          || estado === 'TRIAL'
          || !haVencido;

        if (!isLifetime && !isActiva) {
          // Verificar gracia silenciosa: pago reportado en los últimos 5 días
          let enGracia = false;
          try {
            const { data: pagoPendiente } = await supabase
              .from('suscripciones_pagos')
              .select('fecha_registro')
              .eq('empresa_id', profile.empresa_id)
              .eq('estado', 'pendiente_aprobacion')
              .order('fecha_registro', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pagoPendiente?.fecha_registro) {
              const diasDesdePago = Math.floor(
                (ahora.getTime() - new Date(pagoPendiente.fecha_registro).getTime()) / 86400000
              );
              enGracia = diasDesdePago <= 5;
            }
          } catch { /* ignorar error — no bloquear por esto */ }

          // Con gracia activa: acceso completo
          if (enGracia) {
            // Continúa normalmente
          } else {
            // SIN gracia: solo permitir rutas mínimas de POS
            // ventas, terminal, caja → para que pueda seguir facturando
            // billing → para que pueda pagar
            // dashboard home → para no quedar atrapado
            const rutasPOS = [
              '/dashboard/ventas',
              '/dashboard/terminal',
              '/dashboard/caja',
              '/dashboard/mesas',
              '/dashboard/billing',
            ];
            const esPOS   = rutasPOS.some(r => request.nextUrl.pathname.startsWith(r));
            const esHome  = request.nextUrl.pathname === '/dashboard';

            if (!esPOS && !esHome) {
              const url = request.nextUrl.clone();
              url.pathname = '/dashboard/billing';
              return NextResponse.redirect(url);
            }
          }
        }

        // 6. HARDENING DE ROLES EN FRONTEND
        const protectedAdminRoutes = ['/dashboard/gastos', '/dashboard/finanzas', '/dashboard/cierre'];
        const isTryingToAccessAdminRoute = protectedAdminRoutes.some(route =>
          request.nextUrl.pathname.startsWith(route)
        );

        // La jerarquía exige MASTER o GERENTE
        if (isTryingToAccessAdminRoute && (profile.rol === 'CAJERO' || profile.rol === 'COMPRADOR' || profile.rol === 'MESERO')) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }

        // BLOQUEO ESTRICTO SOLO PARA MESEROS PUROS
        // Si el usuario es MESERO y NO tiene otros módulos asignados, se le mantiene en /dashboard/mesas
        const permisosActivos = profile.permisos || [];
        const tieneOtrosPermisos = permisosActivos.some(p => p !== 'mesas' && p !== 'ver_todas_compras');
        const esMeseroPuro = (profile.rol === 'MESERO' && !tieneOtrosPermisos) ||
                             (permisosActivos.length === 1 && permisosActivos[0] === 'mesas' && profile.rol !== 'GERENTE' && profile.rol !== 'MASTER' && profile.rol !== 'SUPERADMIN');

        if (esMeseroPuro) {
          if (request.nextUrl.pathname !== '/dashboard/mesas' && !request.nextUrl.pathname.startsWith('/dashboard/mesas/')) {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard/mesas';
            return NextResponse.redirect(url);
          }
        }

        // 7. Redireccionar desde /dashboard a la página por defecto del rol SOLO si tiene un solo módulo
        if (request.nextUrl.pathname === '/dashboard' && profile.rol !== 'MASTER' && profile.rol !== 'SUPERADMIN') {
          if (!profile.permisos.includes('dashboard')) {
            // Si el usuario solo tiene 1 módulo asignado, lo llevamos directo a ese módulo.
            // Si tiene múltiples módulos asignados, le permitimos ver el "Panel de Operaciones" en /dashboard.
            const modulosOperativos = profile.permisos.filter(p => p !== 'ver_todas_compras');
            if (modulosOperativos.length === 1) {
              const url = request.nextUrl.clone();
              const unico = modulosOperativos[0];
              if (unico === 'pos')                                    url.pathname = '/dashboard/ventas';
              else if (unico === 'caja' || unico === 'finanzas')      url.pathname = '/dashboard/caja';
              else if (unico === 'inventario')                        url.pathname = '/dashboard/inventario';
              else if (unico === 'compras')                           url.pathname = '/dashboard/compras';
              else if (unico === 'reportes')                          url.pathname = '/dashboard/informes';
              else if (unico === 'clientes')                          url.pathname = '/dashboard/clientes';
              else if (unico === 'creditos')                          url.pathname = '/dashboard/creditos';
              else if (unico === 'equipo' || unico === 'usuarios')    url.pathname = '/dashboard/equipo';
              else if (unico === 'mesas')                             url.pathname = '/dashboard/mesas';

              if (url.pathname !== '/dashboard') {
                return NextResponse.redirect(url);
              }
            } else if (modulosOperativos.length === 0 && profile.rol === 'MESERO') {
              const url = request.nextUrl.clone();
              url.pathname = '/dashboard/mesas';
              return NextResponse.redirect(url);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error no controlado en middleware:', err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Ignorar estáticos de Next.js, imágenes, iconos y rutas API que no requieren autenticación:
     * - /api/webhooks/*
     * - /api/sync-bcv
     * - /api/vincular
     * - /api/v1/*
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/sync-bcv|api/vincular|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|otf)$).*)',
  ],
};
