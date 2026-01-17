import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseFeed } from 'https://deno.land/x/rss@0.5.6/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Feed {
  id: string
  url: string
  title: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active feeds
    const { data: feeds, error: feedsError } = await supabaseClient
      .from('feeds')
      .select('id, url, title')
      .eq('status', 'active')

    if (feedsError) throw feedsError

    const results = []

    // Process each feed
    for (const feed of feeds as Feed[]) {
      try {
        console.log(`Fetching feed: ${feed.url}`)
        
        // Fetch RSS feed
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'RSS-Aggregator/1.0',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const xml = await response.text()
        const parsedFeed = await parseFeed(xml)

        // Update feed title if different
        if (parsedFeed.title && parsedFeed.title.value !== feed.title) {
          await supabaseClient
            .from('feeds')
            .update({ title: parsedFeed.title.value })
            .eq('id', feed.id)
        }

        // Insert articles
        const articles = parsedFeed.entries.map((entry: any) => ({
          feed_id: feed.id,
          title: entry.title?.value || 'Untitled',
          url: entry.links?.[0]?.href || entry.id?.value || '',
          description: entry.description?.value || entry.content?.value || null,
          published_at: entry.published || entry.updated || new Date().toISOString(),
          guid: entry.id?.value || entry.links?.[0]?.href || '',
        }))

        // Upsert articles (insert or ignore duplicates)
        const { error: articlesError } = await supabaseClient
          .from('articles')
          .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })

        if (articlesError && !articlesError.message.includes('duplicate')) {
          console.error(`Error inserting articles for feed ${feed.id}:`, articlesError)
        }

        // Update feed status
        await supabaseClient
          .from('feeds')
          .update({
            last_fetched: new Date().toISOString(),
            status: 'active',
            error_message: null,
          })
          .eq('id', feed.id)

        results.push({
          feedId: feed.id,
          success: true,
          articlesCount: articles.length,
        })
      } catch (error) {
        console.error(`Error processing feed ${feed.id}:`, error)
        
        // Update feed with error status
        await supabaseClient
          .from('feeds')
          .update({
            status: 'error',
            error_message: error.message,
          })
          .eq('id', feed.id)

        results.push({
          feedId: feed.id,
          success: false,
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

