export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      feeds: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          url: string
          title: string
          last_fetched: string | null
          status: "active" | "error"
          error_message: string | null
          full_text_enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          url: string
          title: string
          last_fetched?: string | null
          status?: "active" | "error"
          error_message?: string | null
          full_text_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          url?: string
          title?: string
          last_fetched?: string | null
          status?: "active" | "error"
          error_message?: string | null
          full_text_enabled?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeds_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          id: string
          feed_id: string
          title: string
          url: string
          description: string | null
          content: string | null
          author: string | null
          category: string | null
          published_at: string
          guid: string
          ai_summary: string | null
          ai_summary_generated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          feed_id: string
          title: string
          url: string
          description?: string | null
          content?: string | null
          author?: string | null
          category?: string | null
          published_at: string
          guid: string
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          feed_id?: string
          title?: string
          url?: string
          description?: string | null
          content?: string | null
          author?: string | null
          category?: string | null
          published_at?: string
          guid?: string
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_feed_id_fkey"
            columns: ["feed_id"]
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_articles: {
        Row: {
          id: string
          user_id: string
          article_id: string
          is_read: boolean
          is_saved: boolean
          read_at: string | null
          saved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          article_id: string
          is_read?: boolean
          is_saved?: boolean
          read_at?: string | null
          saved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          article_id?: string
          is_read?: boolean
          is_saved?: boolean
          read_at?: string | null
          saved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_articles_article_id_fkey"
            columns: ["article_id"]
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_collections: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          name: string
          slug: string
          description: string | null
          is_public: boolean
          output_format: "rss" | "json" | "both"
          marketplace_listed: boolean
          is_featured: boolean
          tags: string[] | null
          subscribers_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          name: string
          slug: string
          description?: string | null
          is_public?: boolean
          output_format?: "rss" | "json" | "both"
          marketplace_listed?: boolean
          is_featured?: boolean
          tags?: string[] | null
          subscribers_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          is_public?: boolean
          output_format?: "rss" | "json" | "both"
          marketplace_listed?: boolean
          is_featured?: boolean
          tags?: string[] | null
          subscribers_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_collections_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_collection_sources: {
        Row: {
          id: string
          collection_id: string
          feed_id: string
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          feed_id: string
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          feed_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_collection_sources_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "feed_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_collection_sources_feed_id_fkey"
            columns: ["feed_id"]
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_id: "free" | "pro" | "plus" | "premium" | "team" | "team_pro" | "team_business"
          status: "active" | "canceled" | "past_due" | "trialing"
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_id?: "free" | "pro" | "plus" | "premium" | "team" | "team_pro" | "team_business"
          status?: "active" | "canceled" | "past_due" | "trialing"
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_id?: "free" | "pro" | "plus" | "premium" | "team" | "team_pro" | "team_business"
          status?: "active" | "canceled" | "past_due" | "trialing"
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_subscriptions: {
        Row: {
          id: string
          subscriber_id: string
          collection_id: string
          created_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          collection_id: string
          created_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          collection_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_subscriptions_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "feed_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_key: string
          publication_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_key: string
          publication_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_key?: string
          publication_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_filters: {
        Row: {
          id: string
          user_id: string
          feed_id: string | null
          filter_type: "include" | "exclude"
          keywords: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feed_id?: string | null
          filter_type: "include" | "exclude"
          keywords?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feed_id?: string | null
          filter_type?: "include" | "exclude"
          keywords?: string[]
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_filters_feed_id_fkey"
            columns: ["feed_id"]
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_digests: {
        Row: {
          id: string
          user_id: string
          name: string
          schedule: "hourly" | "every_6h" | "every_12h" | "daily" | "weekly_monday" | "weekly_wednesday" | "weekly_friday"
          collection_id: string | null
          platform: "beehiiv" | "mailerlite"
          max_articles: number
          digest_title_template: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          schedule: "hourly" | "every_6h" | "every_12h" | "daily" | "weekly_monday" | "weekly_wednesday" | "weekly_friday"
          collection_id?: string | null
          platform: "beehiiv" | "mailerlite"
          max_articles?: number
          digest_title_template?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          schedule?: "hourly" | "every_6h" | "every_12h" | "daily" | "weekly_monday" | "weekly_wednesday" | "weekly_friday"
          collection_id?: string | null
          platform?: "beehiiv" | "mailerlite"
          max_articles?: number
          digest_title_template?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_digests_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "feed_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          quiet_hours_start: number | null
          quiet_hours_end: number | null
          quiet_hours_timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          quiet_hours_start?: number | null
          quiet_hours_end?: number | null
          quiet_hours_timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          quiet_hours_start?: number | null
          quiet_hours_end?: number | null
          quiet_hours_timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: "owner" | "admin" | "member"
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role: "owner" | "admin" | "member"
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: "owner" | "admin" | "member"
          joined_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          id: string
          team_id: string
          invited_by: string
          email: string
          role: "admin" | "member"
          token: string
          status: "pending" | "accepted" | "expired"
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          invited_by: string
          email: string
          role?: "admin" | "member"
          token?: string
          status?: "pending" | "accepted" | "expired"
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          invited_by?: string
          email?: string
          role?: "admin" | "member"
          token?: string
          status?: "pending" | "accepted" | "expired"
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_history: {
        Row: {
          id: string
          user_id: string
          title: string
          content_html: string | null
          content_markdown: string | null
          article_count: number
          article_ids: string[]
          source: "all_feeds" | "collection"
          collection_id: string | null
          destination: "clipboard" | "beehiiv" | "mailerlite"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content_html?: string | null
          content_markdown?: string | null
          article_count?: number
          article_ids?: string[]
          source?: "all_feeds" | "collection"
          collection_id?: string | null
          destination?: "clipboard" | "beehiiv" | "mailerlite"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content_html?: string | null
          content_markdown?: string | null
          article_count?: number
          article_ids?: string[]
          source?: "all_feeds" | "collection"
          collection_id?: string | null
          destination?: "clipboard" | "beehiiv" | "mailerlite"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_history_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "feed_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_installations: {
        Row: {
          id: string
          team_id: string
          slack_workspace_id: string
          slack_workspace_name: string | null
          slack_bot_token: string
          installed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          slack_workspace_id: string
          slack_workspace_name?: string | null
          slack_bot_token: string
          installed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          slack_workspace_id?: string
          slack_workspace_name?: string | null
          slack_bot_token?: string
          installed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_installations_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_subscriptions: {
        Row: {
          id: string
          installation_id: string
          channel_id: string
          channel_name: string | null
          feed_id: string | null
          collection_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          installation_id: string
          channel_id: string
          channel_name?: string | null
          feed_id?: string | null
          collection_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          installation_id?: string
          channel_id?: string
          channel_name?: string | null
          feed_id?: string | null
          collection_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_subscriptions_installation_id_fkey"
            columns: ["installation_id"]
            referencedRelation: "slack_installations"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_installations: {
        Row: {
          id: string
          team_id: string
          guild_id: string
          guild_name: string | null
          discord_bot_token: string
          installed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          guild_id: string
          guild_name?: string | null
          discord_bot_token: string
          installed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          guild_id?: string
          guild_name?: string | null
          discord_bot_token?: string
          installed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_installations_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_subscriptions: {
        Row: {
          id: string
          installation_id: string
          channel_id: string
          channel_name: string | null
          feed_id: string | null
          collection_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          installation_id: string
          channel_id: string
          channel_name?: string | null
          feed_id?: string | null
          collection_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          installation_id?: string
          channel_id?: string
          channel_name?: string | null
          feed_id?: string | null
          collection_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_subscriptions_installation_id_fkey"
            columns: ["installation_id"]
            referencedRelation: "discord_installations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summary_usage: {
        Row: {
          id: string
          user_id: string
          month: string
          count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type DigestHistory = Database["public"]["Tables"]["digest_history"]["Row"]
export type Team = Database["public"]["Tables"]["teams"]["Row"]
export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"]
export type TeamInvite = Database["public"]["Tables"]["team_invites"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type FeedFilter = Database["public"]["Tables"]["feed_filters"]["Row"]
export type ScheduledDigest = Database["public"]["Tables"]["scheduled_digests"]["Row"]
export type Feed = Database["public"]["Tables"]["feeds"]["Row"]
export type Article = Database["public"]["Tables"]["articles"]["Row"]
export type UserArticle = Database["public"]["Tables"]["user_articles"]["Row"]
export type FeedCollection = Database["public"]["Tables"]["feed_collections"]["Row"]
export type FeedCollectionSource = Database["public"]["Tables"]["feed_collection_sources"]["Row"]
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]
export type MarketplaceSubscription = Database["public"]["Tables"]["marketplace_subscriptions"]["Row"]
export type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"]

export type ArticleWithFeed = Article & {
  feed: Pick<Feed, "title" | "url">
}

export type ArticleWithStatus = ArticleWithFeed & {
  user_article?: Pick<UserArticle, "is_read" | "is_saved"> | null
}

export type FeedWithCategory = Feed & {
  category?: Pick<Category, "name" | "color"> | null
}

export type FeedCollectionWithSources = FeedCollection & {
  sources?: Array<{
    feed: Pick<Feed, "id" | "title" | "url">
  }>
}

export type MarketplaceCollection = FeedCollection & {
  feed_count?: number
  creator_name?: string
  creator_email?: string
  is_featured?: boolean
  sources?: Array<{
    feed: Pick<Feed, "id" | "title" | "url">
  }>
}

// Slack integration types
export interface SlackInstallation {
  id: string
  team_id: string
  slack_workspace_id: string
  slack_workspace_name: string | null
  slack_bot_token: string
  installed_by: string | null
  created_at: string
}

export interface SlackSubscription {
  id: string
  installation_id: string
  channel_id: string
  channel_name: string | null
  feed_id: string | null
  collection_id: string | null
  is_active: boolean
  created_at: string
}

// Discord integration types
export interface DiscordInstallation {
  id: string
  team_id: string
  guild_id: string
  guild_name: string | null
  discord_bot_token: string
  installed_by: string | null
  created_at: string
}

export interface DiscordSubscription {
  id: string
  installation_id: string
  channel_id: string
  channel_name: string | null
  feed_id: string | null
  collection_id: string | null
  is_active: boolean
  created_at: string
}

// Webhook types for Zapier/Make integration
export type WebhookEventType = "new_article" | "feed_error" | "collection_updated"

export interface Webhook {
  id: string
  user_id: string
  name: string
  url: string
  secret?: string | null
  event_types: WebhookEventType[]
  collection_id?: string | null
  feed_id?: string | null
  is_active: boolean
  last_triggered_at?: string | null
  last_status_code?: number | null
  last_error?: string | null
  failure_count: number
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  status: "pending" | "success" | "failed"
  status_code?: number | null
  response_body?: string | null
  error_message?: string | null
  created_at: string
  delivered_at?: string | null
  retry_count: number
}
