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
          published_at: string
          guid: string
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
          published_at: string
          guid: string
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
          published_at?: string
          guid?: string
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
          name: string
          slug: string
          description: string | null
          is_public: boolean
          output_format: "rss" | "json" | "both"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          description?: string | null
          is_public?: boolean
          output_format?: "rss" | "json" | "both"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          description?: string | null
          is_public?: boolean
          output_format?: "rss" | "json" | "both"
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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

export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Feed = Database["public"]["Tables"]["feeds"]["Row"]
export type Article = Database["public"]["Tables"]["articles"]["Row"]
export type UserArticle = Database["public"]["Tables"]["user_articles"]["Row"]
export type FeedCollection = Database["public"]["Tables"]["feed_collections"]["Row"]
export type FeedCollectionSource = Database["public"]["Tables"]["feed_collection_sources"]["Row"]

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

// Subscription types (for Stripe integration)
export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_id: "free" | "pro" | "plus" | "premium"
  status: "active" | "canceled" | "past_due" | "trialing"
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
