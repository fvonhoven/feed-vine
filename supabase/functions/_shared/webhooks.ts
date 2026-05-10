/**
 * Shared webhook delivery (`fireWebhook`, etc.).
 *
 * Bundled by: `fetch-rss`, `dispatch-collection-webhooks`. After any change here, redeploy:
 *   supabase functions deploy fetch-rss
 *   supabase functions deploy dispatch-collection-webhooks
 *
 * “Send Test” in the app uses the separate `test-webhook` function, not this module.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { isValidHttpUrl } from "./security.ts"

export interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

export interface Webhook {
  id: string
  user_id: string
  name: string
  url: string
  secret?: string | null
  event_types: string[]
  collection_id?: string | null
  feed_id?: string | null
  is_active: boolean
  failure_count: number
  last_triggered_at?: string | null
  last_status_code?: number | null
  last_error?: string | null
}

/**
 * Create HMAC signature for webhook payload
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Fire a webhook with the given payload
 */
export async function fireWebhook(
  supabase: SupabaseClient,
  webhook: Webhook,
  payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload)

  // Create delivery record
  const { data: delivery, error: deliveryError } = await supabase
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhook.id,
      event_type: payload.event,
      payload: payload,
      status: "pending",
    })
    .select()
    .single()

  if (deliveryError) {
    console.error("Failed to create delivery record:", deliveryError)
  }

  if (!isValidHttpUrl(webhook.url)) {
    const errMsg = "Invalid webhook URL"
    if (delivery) {
      await supabase.from("webhook_deliveries").update({ status: "failed", error_message: errMsg, delivered_at: new Date().toISOString() }).eq("id", delivery.id)
    }
    await supabase.from("webhooks").update({ last_error: errMsg, failure_count: webhook.failure_count + 1 }).eq("id", webhook.id)
    return { success: false, error: errMsg }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "FeedVine-Webhook/1.0",
      "X-FeedVine-Event": payload.event,
      "X-FeedVine-Delivery": delivery?.id || "unknown",
    }

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = await createSignature(payloadString, webhook.secret)
      headers["X-FeedVine-Signature"] = `sha256=${signature}`
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
    })

    const statusCode = response.status
    const responseBody = await response.text().catch(() => "")
    const ok2xx = statusCode >= 200 && statusCode < 300

    // Update delivery record
    if (delivery) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: ok2xx ? "success" : "failed",
          status_code: statusCode,
          response_body: responseBody.substring(0, 1000), // Limit response body size
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
    }

    // Update webhook status
    await supabase
      .from("webhooks")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
        last_error: ok2xx ? null : responseBody.substring(0, 500),
        failure_count: ok2xx ? 0 : webhook.failure_count + 1,
      })
      .eq("id", webhook.id)

    return {
      success: ok2xx,
      statusCode,
      error: ok2xx ? undefined : responseBody,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Update delivery record with error
    if (delivery) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: "failed",
          error_message: errorMessage,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
    }

    // Update webhook with error
    await supabase
      .from("webhooks")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_error: errorMessage,
        failure_count: webhook.failure_count + 1,
      })
      .eq("id", webhook.id)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

export type WebhookEventFilters = {
  /** Only webhooks owned by this user (feed/collection owner) are eligible */
  webhookOwnerUserId: string
  feedId?: string
  collectionId?: string
}

/**
 * Get active webhooks for an event, scoped to the feed/collection owner's account.
 */
export async function getWebhooksForEvent(
  supabase: SupabaseClient,
  eventType: string,
  filters: WebhookEventFilters,
): Promise<Webhook[]> {
  if (!filters.webhookOwnerUserId) {
    return []
  }

  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("is_active", true)
    .eq("user_id", filters.webhookOwnerUserId)
    .contains("event_types", [eventType])
    .lt("failure_count", 10)

  if (error) {
    console.error("Failed to fetch webhooks:", error)
    return []
  }

  return (data || []).filter((webhook: Webhook) => {
    if (!webhook.feed_id && !webhook.collection_id) return true

    if (webhook.feed_id && filters.feedId) {
      return webhook.feed_id === filters.feedId
    }

    if (webhook.collection_id && filters.collectionId) {
      return webhook.collection_id === filters.collectionId
    }

    return false
  })
}

/**
 * collection_updated: owner’s webhooks (scoped by feed/collection filters) plus any subscriber
 * webhooks that target this collection_id (e.g. team members with collection-specific hooks).
 */
export async function getWebhooksForCollectionUpdated(
  supabase: SupabaseClient,
  collectionId: string,
  collectionOwnerUserId: string,
): Promise<Webhook[]> {
  const ownerHooks = await getWebhooksForEvent(supabase, "collection_updated", {
    webhookOwnerUserId: collectionOwnerUserId,
    collectionId,
  })

  const { data: subscriberHooks, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("is_active", true)
    .contains("event_types", ["collection_updated"])
    .eq("collection_id", collectionId)
    .lt("failure_count", 10)

  if (error) {
    console.error("Failed to fetch collection-scoped webhooks:", error)
    return ownerHooks
  }

  const seen = new Set(ownerHooks.map(w => w.id))
  const merged = [...ownerHooks]
  for (const row of subscriberHooks || []) {
    const w = row as Webhook
    if (!seen.has(w.id)) {
      seen.add(w.id)
      merged.push(w)
    }
  }
  return merged
}
