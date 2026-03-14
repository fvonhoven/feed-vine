import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import { supabase } from "../lib/supabase"
import { fetchAndSaveArticles } from "../lib/rssFetcher"
import { popularFeeds, feedCategories } from "../data/popularFeeds"

import type { PopularFeed } from "../data/popularFeeds"

type Step = "welcome" | "feeds" | "collection" | "done"

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>("welcome")
  const [selectedFeeds, setSelectedFeeds] = useState<PopularFeed[]>([])
  const [opmlFile, setOpmlFile] = useState<File | null>(null)
  const [collectionName, setCollectionName] = useState("")
  const [busy, setBusy] = useState(false)
  const [addedFeedIds, setAddedFeedIds] = useState<string[]>([])

  const toggleFeed = useCallback((feed: PopularFeed) => {
    setSelectedFeeds(prev =>
      prev.some(f => f.url === feed.url)
        ? prev.filter(f => f.url !== feed.url)
        : [...prev, feed],
    )
  }, [])

  const handleAddFeeds = useCallback(async () => {
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      let feedIds: string[] = []

      if (opmlFile) {
        const text = await opmlFile.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, "application/xml")
        const outlines = Array.from(doc.querySelectorAll("outline[xmlUrl]"))
        if (outlines.length === 0) throw new Error("No feeds found in OPML file")

        for (const outline of outlines.slice(0, 50)) {
          const url = outline.getAttribute("xmlUrl") ?? ""
          const title = outline.getAttribute("title") || outline.getAttribute("text") || url
          if (!url) continue
          const { data: existing } = await supabase.from("feeds").select("id").eq("url", url).eq("user_id", user.id).maybeSingle()
          if (existing) { feedIds.push(existing.id); continue }
          const { data: newFeed } = await supabase.from("feeds").insert({ user_id: user.id, url, title, status: "active" as const }).select("id").single()
          if (newFeed) feedIds.push(newFeed.id)
        }
        toast.success(`Imported ${feedIds.length} feeds from OPML`)
      } else {
        for (const feed of selectedFeeds) {
          const { data: existing } = await supabase.from("feeds").select("id").eq("url", feed.url).eq("user_id", user.id).maybeSingle()
          if (existing) { feedIds.push(existing.id); continue }
          const { data: newFeed } = await supabase.from("feeds").insert({ user_id: user.id, url: feed.url, title: feed.title, status: "active" as const }).select("id").single()
          if (newFeed) feedIds.push(newFeed.id)
        }
        toast.success(`Added ${feedIds.length} feeds`)
      }

      setAddedFeedIds(feedIds)

      for (const feed of selectedFeeds) {
        const match = feedIds.find((_, i) => selectedFeeds[i]?.url === feed.url)
        if (match) {
          fetchAndSaveArticles(match, feed.url).catch(() => {})
        }
      }

      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setStep("collection")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add feeds")
    } finally {
      setBusy(false)
    }
  }, [opmlFile, selectedFeeds, queryClient])

  const handleCreateCollection = useCallback(async () => {
    if (!collectionName.trim() || addedFeedIds.length === 0) {
      setStep("done")
      return
    }
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const slug = collectionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const { data: collection, error } = await supabase
        .from("feed_collections")
        .insert({ user_id: user.id, name: collectionName.trim(), slug, is_public: true })
        .select("id")
        .single()
      if (error) throw error

      const sources = addedFeedIds.map(feedId => ({ collection_id: collection.id, feed_id: feedId }))
      await supabase.from("feed_collection_sources").insert(sources)

      queryClient.invalidateQueries({ queryKey: ["collections"] })
      toast.success(`Collection "${collectionName.trim()}" created!`)
      setStep("done")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create collection")
    } finally {
      setBusy(false)
    }
  }, [collectionName, addedFeedIds, queryClient])

  const handleFinish = useCallback(async () => {
    setBusy(true)
    try {
      await supabase.auth.updateUser({ data: { onboarding_complete: true } })
    } catch {
      // non-critical
    }
    navigate("/", { replace: true })
  }, [navigate])

  const stepIndex = step === "welcome" ? 0 : step === "feeds" ? 1 : step === "collection" ? 2 : 3
  const totalSteps = 4

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Step {stepIndex + 1} of {totalSteps}
        </p>
      </div>

      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-10">
        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <img src="/favicon.svg" alt="" className="mx-auto h-16 w-16" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to FeedVine</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Your smart RSS aggregator. Let's get you set up in under a minute.
            </p>
            <button
              onClick={() => setStep("feeds")}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={handleFinish}
              disabled={busy}
              className="block mx-auto mt-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step: Pick feeds */}
        {step === "feeds" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add your first feeds</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Pick from popular feeds below, or import an OPML file from another reader.
              </p>
            </div>

            {/* OPML import toggle */}
            <div>
              <label
                htmlFor="opml-upload"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                Import OPML file instead
              </label>
              <input
                id="opml-upload"
                type="file"
                accept=".opml,.xml"
                className="hidden"
                onChange={e => { setOpmlFile(e.target.files?.[0] ?? null); setSelectedFeeds([]) }}
              />
              {opmlFile && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Selected: {opmlFile.name}{" "}
                  <button onClick={() => setOpmlFile(null)} className="text-red-500 hover:underline">remove</button>
                </p>
              )}
            </div>

            {!opmlFile && (
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                {feedCategories.map(cat => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{cat}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {popularFeeds.filter(f => f.category === cat).map(feed => {
                        const isSelected = selectedFeeds.some(f => f.url === feed.url)
                        return (
                          <button
                            key={feed.url}
                            onClick={() => toggleFeed(feed)}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{feed.title}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{feed.description}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep("welcome")}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Back
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleFinish}
                  disabled={busy}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleAddFeeds}
                  disabled={busy || (!opmlFile && selectedFeeds.length === 0)}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  {busy ? "Adding..." : opmlFile ? "Import" : `Add ${selectedFeeds.length} feed${selectedFeeds.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Create collection */}
        {step === "collection" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create a collection</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Group your feeds into a collection you can share via RSS or list on the marketplace.
                Your collection will be <span className="font-medium text-gray-700 dark:text-gray-300">public</span> — you can change this later in Collections.
              </p>
            </div>

            <input
              type="text"
              value={collectionName}
              onChange={e => setCollectionName(e.target.value)}
              placeholder="e.g. Daily Tech Reads"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { setStep("done") }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Skip
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={busy || !collectionName.trim()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
              >
                {busy ? "Creating..." : "Create Collection"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-emerald-600 dark:text-emerald-400">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You're all set!</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Your feeds are being fetched in the background. Head to the home page to start reading.
            </p>
            <button
              onClick={handleFinish}
              disabled={busy}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
            >
              Go to FeedVine
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
