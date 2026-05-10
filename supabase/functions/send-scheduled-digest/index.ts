import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { format as dateFormat, subDays, subHours } from "https://esm.sh/date-fns@3"
import { mailerLiteHeaders, mailerLiteTopLevelMessage, readMailerLiteJson } from "../_shared/mailerliteClient.ts"
import { isCronOrServiceAuth, isValidHttpUrl } from "../_shared/security.ts"
import {
  escapeHtml,
  htmlToPlainText,
  plainTextToDigestBodyHtml,
  truncatePlainText,
  DEFAULT_DIGEST_EMAIL_ARTICLE_CHARS,
  wrapDigestEmail,
} from "../_shared/htmlPlain.ts"
import { passesEnglishPrimaryArticle } from "../_shared/detectLanguage.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Match DigestPage snapshot limits for digest_history rows. */
const DIGEST_HISTORY_MD_EXCERPT = 520
const DIGEST_HISTORY_HTML_PLAIN = 1100

function generateHTML(
  title: string,
  articles: Array<{ title: string; url: string; description?: string | null; feed_title: string; published_at: string }>,
  opts?: { historyPlainMax?: number },
): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  const chunks: string[] = []
  chunks.push(
    `<h1 style="font-size:26px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#111;">${escapeHtml(title)}</h1>`,
  )
  chunks.push(`<p style="margin:0 0 22px;color:#888;font-size:14px;">${escapeHtml(date)}</p>`)
  chunks.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 26px;"/>`)

  for (const a of articles) {
    const safeUrl = isValidHttpUrl(a.url) ? a.url : "#"
    chunks.push(
      `<h2 style="font-size:19px;font-weight:600;margin:0 0 12px;line-height:1.35;"><a href="${escapeHtml(safeUrl)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(a.title)}</a></h2>`,
    )
    if (a.description) {
      const plain = htmlToPlainText(a.description)
      const maxPerArticle = opts?.historyPlainMax ?? DEFAULT_DIGEST_EMAIL_ARTICLE_CHARS
      chunks.push(plainTextToDigestBodyHtml(plain, maxPerArticle))
    }
    chunks.push(
      `<p style="margin:14px 0 0;font-size:13px;color:#888;">${escapeHtml(a.feed_title)} · ${escapeHtml(
        dateFormat(new Date(a.published_at), "MMM d"),
      )}</p>`,
    )
    chunks.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0;"/>`)
  }

  return wrapDigestEmail(chunks.join("\n"))
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

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!isCronOrServiceAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
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
        const cutoff = computeCutoff(schedule.schedule)

        // Fetch articles
        let query = supabaseAdmin
          .from("articles")
          .select("id, title, url, description, content, published_at, feed_id, language, feed:feeds(title)")
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

        const { data: fetchedArticles, error: artErr } = await query
        if (artErr) throw artErr

        const articles = (fetchedArticles || []).filter(
          (a: { language?: string | null; title: string; description?: string | null; content?: string | null }) =>
            passesEnglishPrimaryArticle(a.language ?? null, a.title, a.description ?? null, a.content ?? null),
        )

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
        const historyHtml = generateHTML(digestTitle, articleList, { historyPlainMax: DIGEST_HISTORY_HTML_PLAIN })

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
          const mlHeaders = mailerLiteHeaders(integration.api_key as string)
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
              const d = await readMailerLiteJson(resp)
              throw new Error(mailerLiteTopLevelMessage(d))
            }
          }
        }

        // Save to digest history (escape markdown special chars in titles, validate URLs)
        const markdownContent = articleList
          .map(a => {
            const safeUrl = isValidHttpUrl(a.url) ? a.url : "#"
            const safeTitle = a.title.replace(/[\[\]()]/g, " ")
            const desc = a.description
              ? truncatePlainText(htmlToPlainText(a.description), DIGEST_HISTORY_MD_EXCERPT)
              : ""
            return `## [${safeTitle}](${safeUrl})\n\n${desc}\n\n*${a.feed_title} · ${dateFormat(new Date(a.published_at), "MMM d")}*`
          })
          .join("\n\n---\n\n")

        await supabaseAdmin.from("digest_history").insert({
          user_id: schedule.user_id,
          title: digestTitle,
          content_html: historyHtml,
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
