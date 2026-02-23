import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // --- Get or generate VAPID public key ---
    if (action === "get-vapid-key") {
      const { data: config } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "vapid_keys")
        .maybeSingle();

      if (config) {
        return jsonResponse({ publicKey: (config.value as any).publicKey });
      }

      // Generate new VAPID keys
      const vapidKeys = webPush.generateVAPIDKeys();
      await supabaseAdmin.from("app_config").insert({
        key: "vapid_keys",
        value: vapidKeys,
      });

      return jsonResponse({ publicKey: vapidKeys.publicKey });
    }

    // --- Subscribe a device ---
    if (action === "subscribe") {
      const { subscription } = body;
      if (!subscription?.endpoint || !subscription?.keys) {
        return jsonResponse({ error: "Invalid subscription" }, 400);
      }

      const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }
      return jsonResponse({ ok: true });
    }

    // --- Send notification to all subscribers (admin only) ---
    if (action === "notify") {
      // Verify admin role
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      // Check admin role
      const { data: hasAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!hasAdmin) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // Get VAPID keys
      const { data: config } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "vapid_keys")
        .single();

      if (!config) {
        return jsonResponse({ error: "VAPID keys not configured" }, 500);
      }

      const vapidKeys = config.value as any;
      webPush.setVapidDetails(
        "mailto:admin@lunchppy.app",
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      // Get all subscriptions
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*");

      if (!subs || subs.length === 0) {
        return jsonResponse({ sent: 0, message: "No subscribers" });
      }

      const title = body.title || "lunchppy";
      const notifBody =
        body.body ||
        "¡El menú del día ya está disponible! Haz tu pedido 🍽️";
      const payload = JSON.stringify({ title, body: notifBody });

      const results = await Promise.allSettled(
        subs.map((sub) =>
          webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
        )
      );

      // Remove expired/invalid subscriptions
      const expiredEndpoints: string[] = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "rejected") {
          expiredEndpoints.push(subs[i].endpoint);
        }
      }

      if (expiredEndpoints.length > 0) {
        for (const endpoint of expiredEndpoints) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", endpoint);
        }
      }

      return jsonResponse({
        sent: results.filter((r) => r.status === "fulfilled").length,
        failed: expiredEndpoints.length,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Push notification error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
