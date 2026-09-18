import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Unauthorized" }, 401)

    const { confirmation } = await req.json()
    if (confirmation !== "DELETE MY ACCOUNT") return json({ error: "Confirmation phrase does not match" }, 400)

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    })
    if (!userResponse.ok) return json({ error: "Unauthorized" }, 401)
    const user = await userResponse.json()
    if (!user?.id) return json({ error: "Unauthorized" }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (subscription?.stripe_subscription_id) {
      const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY") ?? ""}` },
      })
      if (!stripeResponse.ok && stripeResponse.status !== 404) {
        console.error("Could not cancel subscription before account deletion", await stripeResponse.text())
        return json({ error: "Could not cancel the active subscription. Contact support." }, 502)
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    return json({ success: true })
  } catch (error) {
    console.error("delete-account error", error)
    return json({ error: error instanceof Error ? error.message : "Could not delete account" }, 500)
  }
})
