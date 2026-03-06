import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { format as dateFormat, subDays, subHours } from "https://esm.sh/date-fns@3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function generateHTML(
  title: string,
  articles: Array<{ title: string; url: string; description?: string | null; feed_title: string; published_at: string }>,
): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let html = `<h1 style="font-family:sans-serif;color:#111;">${title}</h1>\n`
  html += `<p style="color:#888;font-size:14px;">${date}</p>\n<hr>\n`
  for (const a of articles) {
    html += `<h2 style="font-family:sans-serif;"><a href="${a.url}" style="color:#0070f3;text-decoration:none;">${a.title}</a></h2>\n`
    if (a.description) {
      const stripped = a.description
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim()
      html += `<p style="color:#444;line-height:1.6;">${stripped}</p>\n`
    }
    html += `<p style="color:#888;font-size:12px;">${a.feed_title} · ${dateFormat(new Date(a.published_at), "MMM d")}</p>\n<hr>\n`
  }
  return html
}

function computeNextRunAt(schedule: string): string {
  const now = new Date()
  const hourIntervals: Record<string, number> = { hourly: 1, every_6h: 6, every_12h: 12 }
  const dayMap: Record<string, number> = { weekly_monday: 1, weekly_wednesday: 3, weekly_friday: 5 }

  if (hourIntervals[schedule]) {
    const next = new Date(now.getTime() + hourIntervals[schedule] * 3600_000)
    next.setUTCMinutes(0, 0, 0)
    return next.toISOString()
  }

  if (schedule === "daily") {
    const next = new Date(now)
    next.setUTCHours(9, 0, 0, 0)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString()
  }

  const targetDay = dayMap[schedule]
  const next = new Date(now)
  next.setUTCHours(9, 0, 0, 0)
  const currentDay = next.getUTCDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  if (daysUntil === 0) daysUntil = 7
  next.setUTCDate(next.getUTCDate() + daysUntil)
  return next.toISOString()
}

function computeCutoff(schedule: string): string {
  const hourIntervals: Record<string, number> = { hourly: 1, every_6h: 6, every_12h: 12 }
  if (hourIntervals[schedule]) {
    return new Date(Date.now() - hourIntervals[schedule] * 3600_000).toISOString()
  }
  if (schedule === "daily") return subHours(new Date(), 24).toISOString()
  return subDays(new Date(), 7).toISOString()
}

function isInQuietHours(
  prefs: { quiet_hours_start: number | null; quiet_hours_end: number | null; quiet_hours_timezone: string } | null
): boolean {
  if (!prefs || prefs.quiet_hours_start === null || prefs.quiet_hours_end === null) return false
  const nowUTC = new Date()
  const tzOffset = getTimezoneOffsetHours(prefs.quiet_hours_timezone)
  const localHour = (nowUTC.getUTCHours() + tzOffset + 24) % 24
  const start = prefs.quiet_hours_start
  const end = prefs.quiet_hours_end
  if (start <= end) return localHour >= start && localHour < end
  return localHour >= start || localHour < end
}

function getTimezoneOffsetHours(tz: string): number {
  try {
    const now = new Date()
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" })
    const tzStr = now.toLocaleString("en-US", { timeZone: tz })
    return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3600_000
  } catch {
    return 0
  }
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Find all active schedules that are due
    const now = new Date().toISOString()
    const { data: schedules, error: schedErr } = await supabaseAdmin
      .from("scheduled_digests")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now)

    if (schedErr) throw schedErr
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const schedule of schedules) {
      try {
        // Check quiet hours for this user
        const { data: prefs } = await supabaseAdmin
          .from("user_preferences")
          .select("quiet_hours_start, quiet_hours_end, quiet_hours_timezone")
          .eq("user_id", schedule.user_id)
          .maybeSingle()

        if (isInQuietHours(prefs)) {
          results.push({ id: schedule.id, success: true, error: "skipped: quiet hours" })
          continue
        }

        const cutoff = computeCutoff(schedule.schedule)

        // Fetch articles
        let query = supabaseAdmin
          .from("articles")
          .select("id, title, url, description, published_at, feed_id, feed:feeds(title)")
          .gte("published_at", cutoff)
          .order("published_at", { ascending: false })
          .limit(schedule.max_articles)

        if (schedule.collection_id) {
          const { data: sources } = await supabaseAdmin.from("feed_collection_sources").select("feed_id").eq("collection_id", schedule.collection_id)
          if (sources && sources.length > 0) {
            query = query.in(
              "feed_id",
              sources.map((s: { feed_id: string }) => s.feed_id),
            )
          }
        }

        const { data: articles, error: artErr } = await query
        if (artErr) throw artErr

        if (!articles || articles.length === 0) {
          // No articles — skip but update next_run_at
          await supabaseAdmin
            .from("scheduled_digests")
            .update({ next_run_at: computeNextRunAt(schedule.schedule) })
            .eq("id", schedule.id)
          results.push({ id: schedule.id, success: true })
          continue
        }

        const articleList = articles.map(
          (a: { title: string; url: string; description?: string | null; feed: { title: string } | null; published_at: string }) => ({
            title: a.title,
            url: a.url,
            description: a.description,
            feed_title: (a.feed as { title: string } | null)?.title ?? "",
            published_at: a.published_at,
          }),
        )

        // Build title from template
        const digestTitle = schedule.digest_title_template.replace("{name}", schedule.name).replace("{date}", dateFormat(new Date(), "MMM d, yyyy"))

        const contentHtml = generateHTML(digestTitle, articleList)

        // Look up integration credentials directly (service role bypasses RLS)
        const { data: integration, error: intErr } = await supabaseAdmin
          .from("user_integrations")
          .select("api_key, publication_id")
          .eq("user_id", schedule.user_id)
          .eq("provider", schedule.platform)
          .single()

        if (intErr || !integration) throw new Error(`No ${schedule.platform} integration found for user`)

        if (schedule.platform === "beehiiv") {
          if (!integration.publication_id) throw new Error("Beehiiv Publication ID not configured")
          const resp = await fetch(`https://api.beehiiv.com/v2/publications/${integration.publication_id}/posts`, {
            method: "POST",
            headers: { Authorization: `Bearer ${integration.api_key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title: digestTitle, content_html: contentHtml, status: "draft", platform: "web" }),
          })
          const data = await resp.json()
          if (!resp.ok) throw new Error(data?.errors?.[0]?.message || data?.message || "Beehiiv API error")
        } else {
          // mailerlite
          let fromEmail = ""
          let fromName = "Newsletter"
          try {
            const meta = integration.publication_id ? JSON.parse(integration.publication_id) : {}
            fromEmail = meta.from_email || ""
            fromName = meta.from_name || "Newsletter"
          } catch {
            fromEmail = integration.publication_id || ""
          }
          if (!fromEmail) throw new Error("MailerLite sender email not configured")
          const mlHeaders = { Authorization: `Bearer ${integration.api_key}`, "Content-Type": "application/json", Accept: "application/json" }
          const payload = {
            name: digestTitle,
            type: "regular",
            emails: [{ subject: digestTitle, from_name: fromName, from: fromEmail, content: contentHtml }],
          }
          let resp = await fetch("https://connect.mailerlite.com/api/campaigns", {
            method: "POST",
            headers: mlHeaders,
            body: JSON.stringify(payload),
          })
          if (!resp.ok) {
            // retry without content (plan restriction)
            const fallback = { name: digestTitle, type: "regular", emails: [{ subject: digestTitle, from_name: fromName, from: fromEmail }] }
            resp = await fetch("https://connect.mailerlite.com/api/campaigns", { method: "POST", headers: mlHeaders, body: JSON.stringify(fallback) })
            if (!resp.ok) {
              const d = await resp.json()
              throw new Error(d?.message || "MailerLite API error")
            }
          }
        }

        // Save to digest history
        const markdownContent = articleList
          .map(a => `## [${a.title}](${a.url})\n\n${a.description ? a.description.replace(/<[^>]*>/g, "").trim() : ""}\n\n*${a.feed_title} · ${dateFormat(new Date(a.published_at), "MMM d")}*`)
          .join("\n\n---\n\n")

        await supabaseAdmin.from("digest_history").insert({
          user_id: schedule.user_id,
          title: digestTitle,
          content_html: contentHtml,
          content_markdown: `# ${digestTitle}\n\n---\n\n${markdownContent}`,
          article_count: articleList.length,
          article_ids: articles.map((a: { id: string }) => a.id),
          source: schedule.collection_id ? "collection" : "all_feeds",
          collection_id: schedule.collection_id,
          destination: schedule.platform,
        })

        // Update last_run_at and next_run_at
        await supabaseAdmin
          .from("scheduled_digests")
          .update({
            last_run_at: now,
            next_run_at: computeNextRunAt(schedule.schedule),
          })
          .eq("id", schedule.id)

        results.push({ id: schedule.id, success: true })
      } catch (err) {
        console.error(`Failed schedule ${schedule.id}:`, err)
        results.push({ id: schedule.id, success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("send-scheduled-digest error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
