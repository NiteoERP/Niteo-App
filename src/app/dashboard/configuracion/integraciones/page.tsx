import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import IntegracionesClient from "./IntegracionesClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Integraciones API | Niteo",
  description: "Gestiona las conexiones con Shopify, Encuentra y otras plataformas",
};

export default async function IntegracionesPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Obtener empresa_id del usuario
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", session.user.id)
    .single();

  const empresaId = usuario?.empresa_id;

  if (!empresaId) {
    return <div>No se pudo cargar la información de la empresa.</div>;
  }

  // Cargar integraciones existentes
  const { data: integraciones } = await supabase
    .from("integraciones_api")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("fecha_creacion", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-white">API Niteo e Integraciones</h2>
        <p className="text-sm text-neutral-400">Gestiona conexiones seguras con sistemas de terceros.</p>
      </div>
      <IntegracionesClient initialData={integraciones || []} empresaId={empresaId} />
    </div>
  );
}
