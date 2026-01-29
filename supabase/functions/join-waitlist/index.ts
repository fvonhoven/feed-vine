/**
 * Join Waitlist Edge Function
 * Handles waitlist email submissions with rate limiting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { checkIpRateLimit, addIpRateLimitHeaders, RATE_LIMIT_CONFIGS } from "../_shared/ipRateLimit.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Check IP rate limit (5 requests per 15 minutes)
    const rateLimitResult = await checkIpRateLimit(req, "/join-waitlist", RATE_LIMIT_CONFIGS.auth)

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...addIpRateLimitHeaders({}, rateLimitResult),
          },
        },
      )
    }

    // Parse request body
    const { email } = await req.json()

    // Validate email
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({
          error: "Email is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Insert email into waitlist
    const { error: insertError } = await supabaseClient.from("waitlist").insert({
      email: email.toLowerCase().trim(),
    })

    if (insertError) {
      // Check if it's a duplicate email error
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            message: "You're already on the waitlist! We'll notify you when we launch.",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              ...addIpRateLimitHeaders({}, rateLimitResult),
            },
          },
        )
      }

      console.error("Error inserting into waitlist:", insertError)
      throw insertError
    }

    console.log(`New waitlist signup: ${email}`)

    // Success response
    return new Response(
      JSON.stringify({
        message: "Thanks for joining! We'll notify you when FeedVine launches.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...addIpRateLimitHeaders({}, rateLimitResult),
        },
      },
    )
  } catch (error) {
    console.error("Waitlist error:", error)
    return new Response(
      JSON.stringify({
        error: "An error occurred. Please try again later.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  }
})

