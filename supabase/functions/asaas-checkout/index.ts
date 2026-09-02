
// Edge Function: asaas-checkout - CORRIGIDA
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE = Deno.env.get("ASAAS_BASE") || "https://www.asaas.com/api/v3";
const PLANO_PRECOS: any = { basico: { mensal: 29.90, anual: 299.00 }, completo: { mensal: 79.90, anual: 799.00 } };
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(authHeader!);
    if (!user) throw new Error("Nao autenticado");
    const { plano, ciclo, cpfCnpj, nome, email } = await req.json();
    const cpfLimpo = cpfCnpj.replace(/\D/g,"");
    const { data: empresa } = await supabase.from("empresas").select("*").eq("user_id", user.id).maybeSingle();
    if (!empresa) throw new Error("Empresa nao encontrada");
    let customerId = null;
    const buscaResp = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfLimpo}`, { headers: { access_token: ASAAS_API_KEY } });
    const buscaData = await buscaResp.json();
    if (buscaData.data && buscaData.data.length > 0) {
      customerId = buscaData.data[0].id;
    } else {
      const criarResp = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
        body: JSON.stringify({ name: nome || empresa.nome_empresa || "Cliente Estelar", cpfCnpj: cpfLimpo, email: email || user.email, notificationDisabled: false })
      });
      const criarData = await criarResp.json();
      if (!criarResp.ok) return Response.json({ error: "Erro ao criar cliente no Asaas", detalhe: criarData }, { status: 400 });
      customerId = criarData.id;
    }
    const valor = PLANO_PRECOS[plano]?.[ciclo] || PLANO_PRECOS.basico.mensal;
    const cicloAsaas = ciclo === "anual" ? "YEARLY" : "MONTHLY";
    const subResp = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
      body: JSON.stringify({ customer: customerId, billingType: "PIX", value: valor, nextDueDate: new Date(Date.now()+86400000).toISOString().split("T")[0], cycle: cicloAsaas, description: `Cosmos Pro - ${plano} ${ciclo}`, externalReference: empresa.id })
    });
    const subData = await subResp.json();
    if (!subResp.ok) return Response.json({ error: "Erro ao criar assinatura", detalhe: subData }, { status: 400 });
    const invoiceUrl = subData.checkoutUrl || `https://www.asaas.com/i/${subData.id}` || subData.invoiceUrl;
    await supabase.from("empresas").update({ plano, ciclo_cobranca: ciclo, assinatura_status: "pendente", asaas_customer_id: customerId, asaas_subscription_id: subData.id }).eq("id", empresa.id);
    return Response.json({ invoiceUrl, subscriptionId: subData.id, customerId });
  } catch (e:any) {
    console.error(e);
    return Response.json({ error: e.message, detalhe: e.stack }, { status: 500 });
  }
});
