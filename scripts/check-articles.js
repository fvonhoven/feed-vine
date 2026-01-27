#!/usr/bin/env node

/**
 * Check articles in the database to diagnose why only old TechCrunch articles are showing
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

// Read .env file manually
const envFile = readFileSync(".env", "utf-8")
const envVars = {}
envFile.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=")
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim()
  }
})

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function checkArticles() {
  console.log("🔍 Checking articles in database...\n")

  // Get all feeds
  const { data: feeds, error: feedsError } = await supabase.from("feeds").select("id, title, url, status, last_fetched").order("title")

  if (feedsError) {
    console.error("❌ Error fetching feeds:", feedsError)
    return
  }

  console.log(`📚 Found ${feeds.length} feeds:\n`)

  for (const feed of feeds) {
    console.log(`\n📰 ${feed.title}`)
    console.log(`   URL: ${feed.url}`)
    console.log(`   Status: ${feed.status}`)
    console.log(`   Last Fetched: ${feed.last_fetched || "Never"}`)

    // Get article count and date range for this feed
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, published_at, created_at")
      .eq("feed_id", feed.id)
      .order("published_at", { ascending: false })
      .limit(5)

    if (articlesError) {
      console.error(`   ❌ Error fetching articles:`, articlesError)
      continue
    }

    console.log(`   Articles: ${articles.length} (showing latest 5)`)

    if (articles.length > 0) {
      console.log(`   Latest article published: ${articles[0].published_at}`)
      console.log(`   Latest articles:`)
      articles.forEach((article, i) => {
        const pubDate = new Date(article.published_at)
        const daysAgo = Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`     ${i + 1}. ${article.title.substring(0, 60)}...`)
        console.log(`        Published: ${article.published_at} (${daysAgo} days ago)`)
      })
    } else {
      console.log(`   ⚠️  No articles found for this feed`)
    }
  }

  // Get total article count
  const { count, error: countError } = await supabase.from("articles").select("*", { count: "exact", head: true })

  if (!countError) {
    console.log(`\n\n📊 Total articles in database: ${count}`)
  }

  // Get article count by feed
  console.log("\n📊 Article count by feed:")
  for (const feed of feeds) {
    const { count } = await supabase.from("articles").select("*", { count: "exact", head: true }).eq("feed_id", feed.id)

    console.log(`   ${feed.title}: ${count} articles`)
  }

  // Check for recent articles (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentArticles, error: recentError } = await supabase
    .from("articles")
    .select("id, title, published_at, feed:feeds(title)")
    .gte("published_at", sevenDaysAgo.toISOString())
    .order("published_at", { ascending: false })

  if (!recentError) {
    console.log(`\n\n📅 Articles from last 7 days: ${recentArticles.length}`)
    if (recentArticles.length > 0) {
      console.log("Recent articles:")
      recentArticles.slice(0, 10).forEach((article, i) => {
        console.log(`   ${i + 1}. [${article.feed?.title}] ${article.title.substring(0, 50)}...`)
        console.log(`      Published: ${article.published_at}`)
      })
    } else {
      console.log("⚠️  No articles from the last 7 days found!")
    }
  }
}

checkArticles().catch(console.error)
