import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useAuth } from "../hooks/useAuth"
import { useSubscription } from "../hooks/useSubscription"
import { isDemoMode, supabase } from "../lib/supabase"
import type { BrandProfile, Feed, SourcePolicy, StudioCampaign, StudioCampaignItem } from "../types/database"

type StudioStep = "brand" | "sources" | "create"
type SourceMode = SourcePolicy["use_mode"]

type StudioArticle = {
  id: string
  feed_id: string
  title: string
  url: string
  published_at: string
  feed: Pick<Feed, "id" | "title" | "url">
}

type PolicyDraft = Pick<
  SourcePolicy,
  "use_mode" | "license_name" | "license_url" | "attribution_text" | "commercial_use_allowed" | "adaptation_allowed" | "images_allowed" | "notes"
>

type BrandDraft = Pick<
  BrandProfile,
  | "brand_name"
  | "newsletter_name"
  | "instagram_handle"
  | "tagline"
  | "audience"
  | "voice"
  | "content_focus"
  | "home_url"
  | "primary_color"
  | "accent_color"
>

type DraftResult = {
  campaign: StudioCampaign
  items: StudioCampaignItem[]
  usage: { count: number; limit: number }
}

type SavedDraft = StudioCampaign & {
  items: StudioCampaignItem[]
}

const EMPTY_BRAND: BrandDraft = {
  brand_name: "",
  newsletter_name: "",
  instagram_handle: "",
  tagline: "",
  audience: "",
  voice: "",
  content_focus: "",
  home_url: "",
  primary_color: "#7c3aed",
  accent_color: "#f59e0b",
}

const KLASSIK_PRESET: BrandDraft = {
  brand_name: "KlassikCocktails",
  newsletter_name: "The Klassik Pour",
  instagram_handle: "@klassikcocktails",
  tagline: "Cocktail history, technique, and culture—served with context.",
  audience: "Curious home bartenders, cocktail enthusiasts, and hospitality professionals",
  voice: "Knowledgeable, elegant, warm, and lightly witty; never snobbish or breathless",
  content_focus: "Cocktail history, spirits, bar culture, technique, books, people, and noteworthy openings",
  home_url: "",
  primary_color: "#173f35",
  accent_color: "#c98b42",
}

const DEFAULT_POLICY: PolicyDraft = {
  use_mode: "link_only",
  license_name: "",
  license_url: "",
  attribution_text: "",
  commercial_use_allowed: false,
  adaptation_allowed: false,
  images_allowed: false,
  notes: "",
}

const MODE_COPY: Record<SourceMode, { label: string; detail: string; color: string }> = {
  link_only: {
    label: "Link only",
    detail: "Original commentary plus a link and attribution. No article recap or publisher images.",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  open: {
    label: "Open license",
    detail: "Use only after recording a license that permits commercial adaptation.",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  licensed: {
    label: "Licensed",
    detail: "You have direct permission or a commercial content agreement.",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  blocked: {
    label: "Blocked",
    detail: "Never include content from this feed in Studio drafts.",
    color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
}

function StudioIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4m4-2 1.2 3.4L15.5 8l-3.3 1.6L11 13l-1.2-3.4L6.5 8l3.3-1.6L11 3zm6 8v3m-1.5-1.5h3M17 16l.9 2.1L20 19l-2.1.9L17 22l-.9-2.1L14 19l2.1-.9L17 16z" />
    </svg>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
    </div>
  )
}

function UpgradePrompt() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          <StudioIcon className="h-7 w-7" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">FeedVine Studio</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Turn your feeds into original, attributed newsletter and social drafts with brand voice and source-use guardrails. Available on Creator and above.
        </p>
        <Link to="/pricing" className="inline-flex rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700">
          Upgrade to Creator →
        </Link>
      </div>
    </div>
  )
}

export default function StudioPage() {
  const { user } = useAuth()
  const { hasFeature, getLimit, isLoading: subscriptionLoading } = useSubscription()
  const queryClient = useQueryClient()
  const canUseStudio = hasFeature("studio")
  const [step, setStep] = useState<StudioStep>("brand")
  const [brandDraft, setBrandDraft] = useState<BrandDraft>(EMPTY_BRAND)
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, PolicyDraft>>({})
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([])
  const [generatedDraft, setGeneratedDraft] = useState<DraftResult | null>(null)

  const brandQuery = useQuery({
    queryKey: ["studio-brand", user?.id],
    enabled: !!user && canUseStudio && !isDemoMode,
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_profiles").select("*").order("created_at").limit(1).maybeSingle()
      if (error) throw error
      return data as BrandProfile | null
    },
  })

  const sourcesQuery = useQuery({
    queryKey: ["studio-sources", user?.id],
    enabled: !!user && canUseStudio && !isDemoMode,
    queryFn: async () => {
      const [feedsResult, policiesResult] = await Promise.all([
        supabase.from("feeds").select("*").order("title"),
        supabase.from("source_policies").select("*").order("created_at"),
      ])
      if (feedsResult.error) throw feedsResult.error
      if (policiesResult.error) throw policiesResult.error
      return { feeds: feedsResult.data as Feed[], policies: policiesResult.data as SourcePolicy[] }
    },
  })

  const articlesQuery = useQuery({
    queryKey: ["studio-articles", user?.id],
    enabled: !!user && canUseStudio && !isDemoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, feed_id, title, url, published_at, feed:feeds!inner(id, title, url, user_id)")
        .eq("feed.user_id", user!.id)
        .order("published_at", { ascending: false })
        .limit(60)
      if (error) throw error
      return data as unknown as StudioArticle[]
    },
  })

  const draftsQuery = useQuery({
    queryKey: ["studio-drafts", user?.id],
    enabled: !!user && canUseStudio && !isDemoMode,
    queryFn: async () => {
      const { data: campaigns, error: campaignsError } = await supabase
        .from("studio_campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(20)
      if (campaignsError) throw campaignsError
      if (!campaigns.length) return [] as SavedDraft[]

      const campaignIds = campaigns.map(campaign => campaign.id)
      const { data: items, error: itemsError } = await supabase
        .from("studio_campaign_items")
        .select("*")
        .in("campaign_id", campaignIds)
        .order("position")
      if (itemsError) throw itemsError

      return (campaigns as StudioCampaign[]).map(campaign => ({
        ...campaign,
        items: (items as StudioCampaignItem[]).filter(item => item.campaign_id === campaign.id),
      }))
    },
  })

  const usageQuery = useQuery({
    queryKey: ["studio-usage", user?.id, new Date().toISOString().slice(0, 7)],
    enabled: !!user && canUseStudio && !isDemoMode,
    queryFn: async () => {
      const month = `${new Date().toISOString().slice(0, 7)}-01`
      const { data, error } = await supabase
        .from("studio_generation_usage")
        .select("count")
        .eq("user_id", user!.id)
        .eq("month", month)
        .maybeSingle()
      if (error) throw error
      return data?.count ?? 0
    },
  })

  useEffect(() => {
    if (!brandQuery.data) return
    const { brand_name, newsletter_name, instagram_handle, tagline, audience, voice, content_focus, home_url, primary_color, accent_color } = brandQuery.data
    setBrandDraft({ brand_name, newsletter_name, instagram_handle, tagline, audience, voice, content_focus, home_url, primary_color, accent_color })
  }, [brandQuery.data])

  useEffect(() => {
    if (!sourcesQuery.data) return
    const next: Record<string, PolicyDraft> = {}
    for (const feed of sourcesQuery.data.feeds) {
      const policy = sourcesQuery.data.policies.find(item => item.feed_id === feed.id)
      next[feed.id] = policy
        ? {
            use_mode: policy.use_mode,
            license_name: policy.license_name,
            license_url: policy.license_url,
            attribution_text: policy.attribution_text,
            commercial_use_allowed: policy.commercial_use_allowed,
            adaptation_allowed: policy.adaptation_allowed,
            images_allowed: policy.images_allowed,
            notes: policy.notes,
          }
        : { ...DEFAULT_POLICY }
    }
    setPolicyDrafts(next)
  }, [sourcesQuery.data])

  const saveBrand = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save a brand")
      if (!brandDraft.brand_name.trim() || !brandDraft.newsletter_name.trim()) throw new Error("Brand and newsletter names are required")
      const payload = {
        ...brandDraft,
        brand_name: brandDraft.brand_name.trim(),
        newsletter_name: brandDraft.newsletter_name.trim(),
        instagram_handle: brandDraft.instagram_handle?.trim() || null,
        tagline: brandDraft.tagline?.trim() || null,
        home_url: brandDraft.home_url?.trim() || null,
        user_id: user.id,
      }
      const result = brandQuery.data
        ? await supabase.from("brand_profiles").update(payload).eq("id", brandQuery.data.id).select("*").single()
        : await supabase.from("brand_profiles").insert(payload).select("*").single()
      if (result.error) throw result.error
      return result.data as BrandProfile
    },
    onSuccess: brand => {
      queryClient.setQueryData(["studio-brand", user?.id], brand)
      toast.success("Brand profile saved")
      setStep("sources")
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not save brand"),
  })

  const savePolicies = useMutation({
    mutationFn: async () => {
      if (!user || !sourcesQuery.data) throw new Error("Sources are not ready")
      const rows = sourcesQuery.data.feeds.map(feed => ({
        user_id: user.id,
        feed_id: feed.id,
        ...policyDrafts[feed.id],
        license_name: policyDrafts[feed.id]?.license_name?.trim() || null,
        license_url: policyDrafts[feed.id]?.license_url?.trim() || null,
        attribution_text: policyDrafts[feed.id]?.attribution_text?.trim() || null,
        notes: policyDrafts[feed.id]?.notes?.trim() || null,
        reviewed_at: new Date().toISOString(),
      }))
      const { data, error } = await supabase.from("source_policies").upsert(rows, { onConflict: "user_id,feed_id" }).select("*")
      if (error) throw error
      return data as SourcePolicy[]
    },
    onSuccess: policies => {
      queryClient.setQueryData(["studio-sources", user?.id], { feeds: sourcesQuery.data?.feeds ?? [], policies })
      toast.success("Source rules saved")
      setStep("create")
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not save source rules"),
  })

  const generateDraft = useMutation({
    mutationFn: async () => {
      if (!brandQuery.data) throw new Error("Save a brand profile first")
      if (selectedArticleIds.length < 1) throw new Error("Choose at least one article")
      const { data, error } = await supabase.functions.invoke("generate-studio-draft", {
        body: { brandProfileId: brandQuery.data.id, articleIds: selectedArticleIds },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as DraftResult
    },
    onSuccess: draft => {
      setGeneratedDraft(draft)
      queryClient.invalidateQueries({ queryKey: ["studio-drafts", user?.id] })
      queryClient.setQueryData(["studio-usage", user?.id, new Date().toISOString().slice(0, 7)], draft.usage.count)
      toast.success("Draft generated — review before approval")
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not generate draft"),
  })

  const persistDraft = useMutation({
    mutationFn: async (status: "draft" | "approved") => {
      if (!generatedDraft) throw new Error("No draft to save")
      const { error: campaignError } = await supabase
        .from("studio_campaigns")
        .update({
          newsletter_intro: generatedDraft.campaign.newsletter_intro,
          instagram_caption: generatedDraft.campaign.instagram_caption,
          status,
        })
        .eq("id", generatedDraft.campaign.id)
      if (campaignError) throw campaignError

      const results = await Promise.all(
        generatedDraft.items.map(item =>
          supabase.from("studio_campaign_items").update({ headline: item.headline, commentary: item.commentary }).eq("id", item.id),
        ),
      )
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error
      return status
    },
    onSuccess: status => {
      setGeneratedDraft(current => (current ? { ...current, campaign: { ...current.campaign, status } } : current))
      queryClient.invalidateQueries({ queryKey: ["studio-drafts", user?.id] })
      toast.success(status === "approved" ? "Draft approved and ready to copy" : "Draft changes saved")
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not save draft"),
  })

  const duplicateDraft = useMutation({
    mutationFn: async (source: SavedDraft) => {
      if (!user) throw new Error("Sign in to duplicate a draft")
      const { data: campaign, error: campaignError } = await supabase
        .from("studio_campaigns")
        .insert({
          user_id: user.id,
          brand_profile_id: source.brand_profile_id,
          name: `${source.name} (copy)`,
          status: "draft",
          newsletter_intro: source.newsletter_intro,
          instagram_caption: source.instagram_caption,
        })
        .select("*")
        .single()
      if (campaignError) throw campaignError

      const copies = source.items.map(item => ({
        campaign_id: campaign.id,
        article_id: item.article_id,
        position: item.position,
        source_mode: item.source_mode,
        source_title: item.source_title,
        source_url: item.source_url,
        attribution: item.attribution,
        headline: item.headline,
        commentary: item.commentary,
        guardrail_status: item.guardrail_status,
      }))
      const { data: items, error: itemsError } = await supabase.from("studio_campaign_items").insert(copies).select("*").order("position")
      if (itemsError) {
        await supabase.from("studio_campaigns").delete().eq("id", campaign.id)
        throw itemsError
      }
      return { campaign: campaign as StudioCampaign, items: items as StudioCampaignItem[] }
    },
    onSuccess: result => {
      const draft = {
        ...result,
        usage: { count: usageQuery.data ?? 0, limit: getLimit("maxStudioGenerations") },
      }
      setGeneratedDraft(draft)
      setSelectedArticleIds(result.items.flatMap(item => (item.article_id ? [item.article_id] : [])))
      queryClient.invalidateQueries({ queryKey: ["studio-drafts", user?.id] })
      toast.success("Draft duplicated")
      requestAnimationFrame(() => document.getElementById("studio-draft-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not duplicate draft"),
  })

  const deleteDraft = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.from("studio_campaigns").delete().eq("id", campaignId)
      if (error) throw error
      return campaignId
    },
    onSuccess: campaignId => {
      if (generatedDraft?.campaign.id === campaignId) setGeneratedDraft(null)
      queryClient.invalidateQueries({ queryKey: ["studio-drafts", user?.id] })
      toast.success("Draft deleted")
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not delete draft"),
  })

  const policyByFeed = useMemo(
    () => new Map((sourcesQuery.data?.policies ?? []).map(policy => [policy.feed_id, policy])),
    [sourcesQuery.data?.policies],
  )
  const eligibleArticles = useMemo(
    () => (articlesQuery.data ?? []).filter(article => policyByFeed.get(article.feed_id)?.use_mode !== "blocked"),
    [articlesQuery.data, policyByFeed],
  )

  const newsletterText = useMemo(() => {
    if (!generatedDraft) return ""
    return [
      generatedDraft.campaign.name,
      "",
      generatedDraft.campaign.newsletter_intro,
      "",
      ...generatedDraft.items.flatMap(item => [item.headline, item.commentary, `${item.attribution} — ${item.source_url}`, ""]),
    ].join("\n")
  }, [generatedDraft])

  const instagramText = useMemo(() => {
    if (!generatedDraft) return ""
    const sources = generatedDraft.items.map(item => `${item.attribution}: ${item.source_url}`)
    return [generatedDraft.campaign.instagram_caption, "", "Sources:", ...sources].join("\n")
  }, [generatedDraft])

  const copyApproved = async (value: string, label: string) => {
    if (generatedDraft?.campaign.status !== "approved") {
      toast.error("Approve the draft before exporting it")
      return
    }
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  const openDraft = (draft: SavedDraft) => {
    setGeneratedDraft({
      campaign: draft,
      items: draft.items,
      usage: { count: usageQuery.data ?? 0, limit: getLimit("maxStudioGenerations") },
    })
    setSelectedArticleIds(draft.items.flatMap(item => (item.article_id ? [item.article_id] : [])))
    requestAnimationFrame(() => document.getElementById("studio-draft-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  if (subscriptionLoading) return <LoadingState />
  if (!canUseStudio || isDemoMode) return <UpgradePrompt />

  const steps: Array<{ id: StudioStep; label: string; number: number }> = [
    { id: "brand", label: "Brand", number: 1 },
    { id: "sources", label: "Source rules", number: 2 },
    { id: "create", label: "Create", number: 3 },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <StudioIcon />
            FeedVine Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Feeds in. Original campaigns out.</h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
            Build newsletter and Instagram drafts in your voice while keeping every source linked, attributed, and governed by an explicit usage rule.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Editorial guardrails reduce risk; they are not legal clearance. Review every draft before publishing.
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {steps.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              step === item.id ? "bg-white text-primary-700 shadow-sm dark:bg-gray-700 dark:text-primary-300" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs">{item.number}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {brandQuery.isLoading || sourcesQuery.isLoading ? (
        <LoadingState />
      ) : step === "brand" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Set the editorial identity</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Studio uses this profile for tone and positioning, not just cosmetic branding.</p>
            </div>
            <button
              type="button"
              onClick={() => setBrandDraft(KLASSIK_PRESET)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Use KlassikCocktails preset
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <BrandField label="Brand name" required value={brandDraft.brand_name} onChange={value => setBrandDraft(draft => ({ ...draft, brand_name: value }))} />
            <BrandField label="Newsletter name" required value={brandDraft.newsletter_name} onChange={value => setBrandDraft(draft => ({ ...draft, newsletter_name: value }))} />
            <BrandField label="Instagram handle" value={brandDraft.instagram_handle ?? ""} placeholder="@yourbrand" onChange={value => setBrandDraft(draft => ({ ...draft, instagram_handle: value }))} />
            <BrandField label="Website" value={brandDraft.home_url ?? ""} placeholder="https://…" onChange={value => setBrandDraft(draft => ({ ...draft, home_url: value }))} />
            <div className="md:col-span-2">
              <BrandField label="Tagline" value={brandDraft.tagline ?? ""} onChange={value => setBrandDraft(draft => ({ ...draft, tagline: value }))} />
            </div>
            <BrandArea label="Audience" value={brandDraft.audience} onChange={value => setBrandDraft(draft => ({ ...draft, audience: value }))} />
            <BrandArea label="Voice" value={brandDraft.voice} onChange={value => setBrandDraft(draft => ({ ...draft, voice: value }))} />
            <div className="md:col-span-2">
              <BrandArea label="Content focus" value={brandDraft.content_focus} onChange={value => setBrandDraft(draft => ({ ...draft, content_focus: value }))} />
            </div>
            <ColorField label="Primary color" value={brandDraft.primary_color} onChange={value => setBrandDraft(draft => ({ ...draft, primary_color: value }))} />
            <ColorField label="Accent color" value={brandDraft.accent_color} onChange={value => setBrandDraft(draft => ({ ...draft, accent_color: value }))} />
          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={() => saveBrand.mutate()} disabled={saveBrand.isPending} className="rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saveBrand.isPending ? "Saving…" : "Save and review sources →"}
            </button>
          </div>
        </section>
      ) : step === "sources" ? (
        <section>
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
            New feeds default to <strong>Link only</strong>. Open-license or licensed modes only unlock deeper synthesis when both commercial use and adaptations are explicitly allowed.
          </div>
          {!sourcesQuery.data?.feeds.length ? (
            <EmptySources />
          ) : (
            <div className="space-y-4">
              {sourcesQuery.data.feeds.map(feed => {
                const draft = policyDrafts[feed.id] ?? DEFAULT_POLICY
                const mode = MODE_COPY[draft.use_mode]
                return (
                  <article key={feed.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900 dark:text-white">{feed.title}</h3>
                        <a href={feed.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400">
                          {feed.url}
                        </a>
                      </div>
                      <div className="w-full lg:w-56">
                        <select
                          aria-label={`Usage mode for ${feed.title}`}
                          value={draft.use_mode}
                          onChange={event => updatePolicy(setPolicyDrafts, feed.id, { use_mode: event.target.value as SourceMode })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="link_only">Link only</option>
                          <option value="open">Open license</option>
                          <option value="licensed">Licensed / permission</option>
                          <option value="blocked">Blocked</option>
                        </select>
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${mode.color}`}>{mode.label}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{mode.detail}</p>

                    {draft.use_mode !== "blocked" && (
                      <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 dark:border-gray-700 md:grid-cols-2">
                        <BrandField label="Attribution override" value={draft.attribution_text ?? ""} placeholder={`Source: ${feed.title}`} onChange={value => updatePolicy(setPolicyDrafts, feed.id, { attribution_text: value })} />
                        <BrandField label="License or permission URL" value={draft.license_url ?? ""} placeholder="Optional for link-only" onChange={value => updatePolicy(setPolicyDrafts, feed.id, { license_url: value })} />
                        {(draft.use_mode === "open" || draft.use_mode === "licensed") && (
                          <>
                            <BrandField label="License / agreement name" value={draft.license_name ?? ""} placeholder="CC BY 4.0, partner agreement…" onChange={value => updatePolicy(setPolicyDrafts, feed.id, { license_name: value })} />
                            <div className="flex flex-wrap items-end gap-4 pb-2 text-sm text-gray-700 dark:text-gray-300">
                              <PolicyCheckbox checked={draft.commercial_use_allowed} label="Commercial use" onChange={checked => updatePolicy(setPolicyDrafts, feed.id, { commercial_use_allowed: checked })} />
                              <PolicyCheckbox checked={draft.adaptation_allowed} label="Adaptations" onChange={checked => updatePolicy(setPolicyDrafts, feed.id, { adaptation_allowed: checked })} />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => savePolicies.mutate()} disabled={savePolicies.isPending || !sourcesQuery.data?.feeds.length} className="rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {savePolicies.isPending ? "Saving…" : "Save rules and create →"}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <DraftLibrary
            drafts={draftsQuery.data ?? []}
            activeDraftId={generatedDraft?.campaign.id ?? null}
            loading={draftsQuery.isLoading}
            duplicatingId={duplicateDraft.isPending ? duplicateDraft.variables?.id ?? null : null}
            deletingId={deleteDraft.isPending ? deleteDraft.variables ?? null : null}
            onNew={() => {
              setGeneratedDraft(null)
              setSelectedArticleIds([])
            }}
            onOpen={openDraft}
            onDuplicate={draft => duplicateDraft.mutate(draft)}
            onDelete={draft => {
              if (window.confirm(`Delete “${draft.name}”? This cannot be undone.`)) deleteDraft.mutate(draft.id)
            }}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Choose the editorial mix</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select up to 10 recent articles. Blocked sources are hidden.</p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{selectedArticleIds.length}/10</span>
            </div>

            {articlesQuery.isLoading ? (
              <LoadingState />
            ) : eligibleArticles.length === 0 ? (
              <EmptySources message="No eligible recent articles found. Add feeds, fetch articles, or change a source rule." />
            ) : (
              <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {eligibleArticles.map(article => {
                  const selected = selectedArticleIds.includes(article.id)
                  const policy = policyByFeed.get(article.feed_id)
                  const effectiveMode =
                    (policy?.use_mode === "open" || policy?.use_mode === "licensed") && policy.commercial_use_allowed && policy.adaptation_allowed
                      ? policy.use_mode
                      : "link_only"
                  return (
                    <label key={article.id} className={`block cursor-pointer rounded-xl border p-4 transition-colors ${selected ? "border-primary-400 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/40" : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"}`}>
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedArticleIds(ids =>
                              selected ? ids.filter(id => id !== article.id) : ids.length < 10 ? [...ids, article.id] : ids,
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-medium leading-snug ${selected ? "text-primary-900 dark:text-gray-50" : "text-gray-900 dark:text-gray-100"}`}>{article.title}</h3>
                          <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${selected ? "text-primary-800 dark:text-primary-100" : "text-gray-500 dark:text-gray-400"}`}>
                            <span>{article.feed.title}</span>
                            <span>•</span>
                            <span>{new Date(article.published_at).toLocaleDateString()}</span>
                            <span className={`rounded-full px-2 py-0.5 ${MODE_COPY[effectiveMode].color}`}>{MODE_COPY[effectiveMode].label}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => generateDraft.mutate()}
              disabled={generateDraft.isPending || selectedArticleIds.length === 0 || !brandQuery.data}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <StudioIcon />
              {generateDraft.isPending ? "Writing with guardrails…" : "Generate newsletter + Instagram draft"}
            </button>
            </div>

            <div id="studio-draft-editor" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {!generatedDraft ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"><StudioIcon className="h-6 w-6" /></div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Your reviewable draft appears here</h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">Generated copy stays in draft status. Edit it, review the linked originals, then approve before copying.</p>
              </div>
            ) : (
              <DraftEditor
                draft={generatedDraft}
                setDraft={setGeneratedDraft}
                newsletterText={newsletterText}
                instagramText={instagramText}
                saving={persistDraft.isPending}
                onSave={() => persistDraft.mutate("draft")}
                onApprove={() => persistDraft.mutate("approved")}
                onCopyNewsletter={() => copyApproved(newsletterText, "Newsletter")}
                onCopyInstagram={() => copyApproved(instagramText, "Instagram caption")}
              />
            )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function DraftLibrary({
  drafts,
  activeDraftId,
  loading,
  duplicatingId,
  deletingId,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  drafts: SavedDraft[]
  activeDraftId: string | null
  loading: boolean
  duplicatingId: string | null
  deletingId: string | null
  onNew: () => void
  onOpen: (draft: SavedDraft) => void
  onDuplicate: (draft: SavedDraft) => void
  onDelete: (draft: SavedDraft) => void
}) {
  const statusStyle: Record<StudioCampaign["status"], string> = {
    draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    exported: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent drafts</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Reopen saved work or start a fresh campaign. Showing the 20 most recently updated.</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
        >
          <span className="text-lg leading-none">+</span>
          New draft
        </button>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(index => <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />)}
        </div>
      ) : drafts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-5 py-7 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          No saved campaigns yet. Your first generated draft will appear here automatically.
        </div>
      ) : (
        <div className="mt-5 grid max-h-80 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map(draft => {
            const active = draft.id === activeDraftId
            return (
              <article
                key={draft.id}
                className={`rounded-xl border p-4 transition-colors ${
                  active
                    ? "border-primary-400 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/40"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <button type="button" onClick={() => onOpen(draft)} className="block w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`line-clamp-2 font-medium leading-snug ${active ? "text-primary-900 dark:text-gray-50" : "text-gray-900 dark:text-gray-100"}`}>{draft.name}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyle[draft.status]}`}>{draft.status}</span>
                  </div>
                  <div className={`mt-3 flex items-center gap-2 text-xs ${active ? "text-primary-800 dark:text-primary-100" : "text-gray-600 dark:text-gray-300"}`}>
                    <span>{draft.items.length} article{draft.items.length === 1 ? "" : "s"}</span>
                    <span>•</span>
                    <span>{new Date(draft.updated_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                </button>
                <div className={`mt-4 flex items-center gap-3 border-t pt-3 ${active ? "border-primary-200 dark:border-primary-800" : "border-gray-200 dark:border-gray-700"}`}>
                  <button type="button" onClick={() => onOpen(draft)} className="text-xs font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-200 dark:hover:text-white">
                    {active ? "Open" : "Edit"}
                  </button>
                  <button type="button" onClick={() => onDuplicate(draft)} disabled={duplicatingId === draft.id} className="text-xs font-medium text-gray-700 hover:text-gray-950 disabled:opacity-50 dark:text-gray-200 dark:hover:text-white">
                    {duplicatingId === draft.id ? "Duplicating…" : "Duplicate"}
                  </button>
                  <button type="button" onClick={() => onDelete(draft)} disabled={deletingId === draft.id} className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-300 dark:hover:text-red-200">
                    {deletingId === draft.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function updatePolicy(
  setter: React.Dispatch<React.SetStateAction<Record<string, PolicyDraft>>>,
  feedId: string,
  patch: Partial<PolicyDraft>,
) {
  setter(current => ({ ...current, [feedId]: { ...(current[feedId] ?? DEFAULT_POLICY), ...patch } }))
}

function BrandField({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
    </label>
  )
}

function BrandArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      <textarea rows={3} value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 block w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      <span className="mt-1.5 flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
        <input type="color" value={value} onChange={event => onChange(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" />
        <input value={value} onChange={event => onChange(event.target.value)} pattern="#[0-9a-fA-F]{6}" className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm text-gray-900 focus:ring-0 dark:text-white" />
      </span>
    </label>
  )
}

function PolicyCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
      {label}
    </label>
  )
}

function EmptySources({ message = "Add at least one RSS feed before configuring Studio sources." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
      <Link to="/feeds" className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">Manage feeds →</Link>
    </div>
  )
}

function DraftEditor({
  draft,
  setDraft,
  newsletterText,
  instagramText,
  saving,
  onSave,
  onApprove,
  onCopyNewsletter,
  onCopyInstagram,
}: {
  draft: DraftResult
  setDraft: React.Dispatch<React.SetStateAction<DraftResult | null>>
  newsletterText: string
  instagramText: string
  saving: boolean
  onSave: () => void
  onApprove: () => void
  onCopyNewsletter: () => void
  onCopyInstagram: () => void
}) {
  const approved = draft.campaign.status === "approved"
  const replacedCount = draft.items.filter(item => item.guardrail_status === "replaced").length
  const updateCampaign = (patch: Partial<StudioCampaign>) => setDraft(current => (current ? { ...current, campaign: { ...current.campaign, ...patch, status: "draft" } } : current))
  const updateItem = (itemId: string, patch: Partial<StudioCampaignItem>) =>
    setDraft(current =>
      current
        ? { ...current, campaign: { ...current.campaign, status: "draft" }, items: current.items.map(item => (item.id === itemId ? { ...item, ...patch } : item)) }
        : current,
    )

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Review draft</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Generation {draft.usage.limit === -1 ? `${draft.usage.count} this month` : `${draft.usage.count}/${draft.usage.limit} this month`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${approved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
          {approved ? "Approved" : "Needs review"}
        </span>
      </div>

      {replacedCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {replacedCount} item{replacedCount === 1 ? " was" : "s were"} replaced with conservative copy after the overlap check. Rewrite for specificity after reading the original.
        </div>
      )}

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Newsletter intro
        <textarea rows={4} value={draft.campaign.newsletter_intro} onChange={event => updateCampaign({ newsletter_intro: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </label>

      <div className="mt-5 space-y-4">
        {draft.items.map(item => (
          <article key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <input value={item.headline} onChange={event => updateItem(item.id, { headline: event.target.value })} className="w-full border-0 bg-transparent p-0 font-semibold text-gray-900 focus:ring-0 dark:text-white" />
            <textarea rows={3} value={item.commentary} onChange={event => updateItem(item.id, { commentary: event.target.value })} className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">{item.attribution} ↗</a>
          </article>
        ))}
      </div>

      <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Instagram caption
        <textarea rows={7} value={draft.campaign.instagram_caption} onChange={event => updateCampaign({ instagram_caption: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onSave} disabled={saving} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Save draft</button>
        <button type="button" onClick={onApprove} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
        <button type="button" onClick={onCopyNewsletter} disabled={!approved} title={!approved ? "Approve first" : newsletterText} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">Copy newsletter</button>
        <button type="button" onClick={onCopyInstagram} disabled={!approved} title={!approved ? "Approve first" : instagramText} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">Copy Instagram</button>
      </div>
    </div>
  )
}
