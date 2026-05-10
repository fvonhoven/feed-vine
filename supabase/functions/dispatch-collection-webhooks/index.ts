/**
 * Fires `collection_updated` user webhooks after a collection or its sources change.
 * Caller must be authenticated and able to read the collection (RLS).
 *
 * Deploy: supabase functions deploy dispatch-collection-webhooks
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: { collectionId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const collectionId = body.collectionId
  if (!collectionId || typeof collectionId !== "string") {
    return new Response(JSON.stringify({ error: "Missing collectionId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: collection, error: colErr } = await userClient
    .from("feed_collections")
    .select("id, user_id, name, slug, description, is_public, marketplace_listed, tags, output_format, team_id")
    .eq("id", collectionId)
    .maybeSingle()

  if (colErr || !collection) {
    return new Response(JSON.stringify({ error: "Collection not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const serviceClient = createClient(supabaseUrl, serviceKey)
  const { getWebhooksForCollectionUpdated, fireWebhook } = await import("../_shared/webhooks.ts")
  const webhooks = await getWebhooksForCollectionUpdated(serviceClient, collection.id, collection.user_id)

  const payload = {
    event: "collection_updated",
    timestamp: new Date().toISOString(),
    data: {
      collection: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        is_public: collection.is_public,
        marketplace_listed: collection.marketplace_listed,
        tags: collection.tags,
        output_format: collection.output_format,
        team_id: collection.team_id,
      },
    },
  }

  for (const webhook of webhooks) {
    fireWebhook(serviceClient, webhook, payload)
      .then(result => {
        if (!result.success) console.error(`collection_updated webhook ${webhook.id}:`, result.error)
      })
      .catch(err => console.error(`collection_updated webhook ${webhook.id}:`, err))
  }

  return new Response(JSON.stringify({ success: true, webhookCount: webhooks.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
