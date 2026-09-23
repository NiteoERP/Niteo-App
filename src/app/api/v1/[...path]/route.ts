import { NextRequest } from "next/server";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join("/");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetUrl = `${supabaseUrl}/functions/v1/api-niteo/${path}${req.nextUrl.search}`;

  // Extraer credenciales que envía Encuentra o Shopify
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization") || "";

  const options: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "x-api-key": apiKey,
    },
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    options.body = await req.text();
  }

  // Petición desde tu servidor Vercel/Next.js hacia Supabase
  const response = await fetch(targetUrl, options);
  const data = await response.text();
  
  // Devolvemos la respuesta al cliente, limpiando los headers para que no diga "Supabase"
  return new Response(data, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
