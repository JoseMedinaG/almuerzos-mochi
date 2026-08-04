import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, customer_phone, payment_method, menu_id, daily_menus!inner(date)")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return jsonResponse({ error: "order not found" }, 404);

    const menuDate = (order as any).daily_menus?.date as string;

    const { data: configs } = await supabaseAdmin
      .from("app_config")
      .select("key, value")
      .in("key", ["nequi_raffle_winner", "pickup_winners"]);

    const nequiCfg = configs?.find((c) => c.key === "nequi_raffle_winner")?.value as
      | { name: string; phone?: string; date?: string }
      | undefined;
    const pickupCfg = configs?.find((c) => c.key === "pickup_winners")?.value as
      | { names: string[]; date?: string }
      | undefined;

    const messages: string[] = [];
    const result: Record<string, unknown> = {};

    // --- Pickup re-raffle: only current pickup winners + the new person ---
    if (pickupCfg?.date === menuDate && pickupCfg.names?.length) {
      const pool = Array.from(new Set([...pickupCfg.names, order.customer_name]));
      const count = pickupCfg.names.length;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, count);

      await supabaseAdmin
        .from("app_config")
        .upsert({ key: "pickup_winners", value: { names: winners, date: menuDate } }, { onConflict: "key" });

      result.pickupWinners = winners;
      messages.push(
        `Nuevo sorteo por pedido tardío: ${winners.join(" y ")} ${winners.length > 1 ? "van" : "va"} a recoger.`
      );
    }

    // --- Nequi re-raffle: only if the new order pays with Nequi ---
    if (order.payment_method === "nequi" && nequiCfg?.date === menuDate && nequiCfg.name) {
      const pool = [
        { name: nequiCfg.name, phone: nequiCfg.phone ?? null },
        { name: order.customer_name, phone: order.customer_phone ?? null },
      ].filter((p, i, a) => a.findIndex((x) => x.name === p.name) === i);

      const winner = pick(pool);

      await supabaseAdmin
        .from("app_config")
        .upsert(
          { key: "nequi_raffle_winner", value: { name: winner.name, phone: winner.phone, date: menuDate } },
          { onConflict: "key" }
        );

      result.nequiWinner = winner.name;
      messages.push(`Nuevo sorteo Nequi por pedido tardío: paga ${winner.name}.`);
    }

    if (messages.length) {
      try {
        await supabaseAdmin.functions.invoke("push-notifications", {
          body: { action: "notify", title: "Sorteo actualizado 🎲", body: messages.join(" ") },
        });
      } catch {
        // best-effort
      }
    }

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
