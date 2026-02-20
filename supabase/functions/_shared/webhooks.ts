/**
 * Shared webhook utilities for firing webhooks
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    // Update delivery record
    if (delivery) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: response.ok ? "success" : "failed",
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
        last_error: response.ok ? null : responseBody.substring(0, 500),
        failure_count: response.ok ? 0 : webhook.failure_count + 1,
      })
      .eq("id", webhook.id)

    return {
      success: response.ok,
      statusCode,
      error: response.ok ? undefined : responseBody,
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

/**
 * Get all active webhooks for a specific event type
 */
export async function getWebhooksForEvent(
  supabase: SupabaseClient,
  eventType: string,
  filters?: { feedId?: string; collectionId?: string },
): Promise<Webhook[]> {
  let query = supabase.from("webhooks").select("*").eq("is_active", true).contains("event_types", [eventType]).lt("failure_count", 10) // Don't fire webhooks that have failed too many times

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch webhooks:", error)
    return []
  }

  // Filter by feed_id or collection_id if specified
  return (data || []).filter((webhook: Webhook) => {
    // If webhook has no filters, it matches all
    if (!webhook.feed_id && !webhook.collection_id) return true

    // If webhook has feed filter, check it matches
    if (webhook.feed_id && filters?.feedId) {
      return webhook.feed_id === filters.feedId
    }

    // If webhook has collection filter, check it matches
    if (webhook.collection_id && filters?.collectionId) {
      return webhook.collection_id === filters.collectionId
    }

    return false
  })
}
