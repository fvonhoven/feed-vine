# 🔌 FeedVine API Reference

## Overview

The FeedVine API allows you to programmatically manage your RSS feeds, articles, categories, and collections. Build custom integrations, automate workflows, and create powerful applications on top of FeedVine.

**Base URL:** `https://your-project.supabase.co/functions/v1`

**Authentication:** Bearer token (API Key)

**Rate Limits:**

- **Pro Plan:** 100 requests/hour
- **Plus Plan:** 500 requests/hour
- **Premium Plan:** 2,000 requests/hour

---

## Authentication

All API requests require an API key passed in the `Authorization` header:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Getting Your API Key

1. Upgrade to **Premium Plan** (API access is Premium-only)
2. Navigate to **Settings** → **API Keys**
3. Click **Create New API Key**
4. Copy and save your key (you won't see it again!)

### Example Request

```bash
curl -H "Authorization: Bearer sk_live_abc123..." \
  https://your-project.supabase.co/functions/v1/api-v1-feeds
```

---

## Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

---

## Rate Limiting

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1999
X-RateLimit-Reset: 1640000000
```

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

---

## Endpoints

### Feeds

#### List All Feeds

```http
GET /api-v1-feeds
```

**Query Parameters:**

- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 50, max: 100) - Items per page

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/api-v1-feeds?page=1&limit=10"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://example.com/feed.xml",
      "title": "Example Blog",
      "status": "active",
      "last_fetched": "2024-01-15T10:30:00Z",
      "error_message": null,
      "created_at": "2024-01-01T00:00:00Z",
      "category": {
        "id": "uuid",
        "name": "Tech",
        "color": "#3B82F6"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### Get Single Feed

```http
GET /api-v1-feeds/:id
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/api-v1-feeds/uuid-here"
```

#### Create Feed

```http
POST /api-v1-feeds
```

**Request Body:**

```json
{
  "url": "https://example.com/feed.xml",
  "title": "Example Blog",
  "category_id": "uuid-optional"
}
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/feed.xml","title":"Example Blog"}' \
  "https://your-project.supabase.co/functions/v1/api-v1-feeds"
```

#### Delete Feed

```http
DELETE /api-v1-feeds/:id
```

**Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/api-v1-feeds/uuid-here"
```

---

### Articles

#### List Articles

```http
GET /api-v1-articles
```

**Query Parameters:**

- `page` (integer) - Page number
- `limit` (integer) - Items per page
- `feed_id` (uuid) - Filter by feed
- `unread` (boolean) - Show only unread articles
- `saved` (boolean) - Show only saved articles
- `search` (string) - Search in title and description

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/api-v1-articles?unread=true&limit=20"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Article Title",
      "url": "https://example.com/article",
      "description": "Article description...",
      "content": "Full article content...",
      "author": "John Doe",
      "published_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "feed": {
        "id": "uuid",
        "title": "Example Blog",
        "url": "https://example.com/feed.xml"
      },
      "user_article": {
        "is_read": false,
        "is_saved": false,
        "read_at": null,
        "saved_at": null
      }
    }
  ]
}
```

#### Get Single Article

```http
GET /api-v1-articles/:id
```

#### Mark Article as Read/Unread

```http
PATCH /api-v1-articles/:id/read
```

**Request Body:**

```json
{
  "is_read": true
}
```

**Example:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"is_read":true}' \
  "https://your-project.supabase.co/functions/v1/api-v1-articles/uuid-here/read"
```

#### Save/Unsave Article

```http
PATCH /api-v1-articles/:id/save
```

**Request Body:**

```json
{
  "is_saved": true
}
```

---

### Categories

#### List Categories

```http
GET /api-v1-categories
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/api-v1-categories"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tech",
      "color": "#3B82F6",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Category

```http
POST /api-v1-categories
```

**Request Body:**

```json
{
  "name": "Tech",
  "color": "#3B82F6"
}
```

#### Update Category

```http
PATCH /api-v1-categories/:id
```

**Request Body:**

```json
{
  "name": "Technology",
  "color": "#10B981"
}
```

#### Delete Category

```http
DELETE /api-v1-categories/:id
```

---

### Collections

#### List Collections

```http
GET /api-v1-collections
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Collection",
      "slug": "my-collection",
      "description": "Collection description",
      "is_public": true,
      "output_format": "rss",
      "created_at": "2024-01-01T00:00:00Z",
      "sources": [
        {
          "feed": {
            "id": "uuid",
            "title": "Example Blog",
            "url": "https://example.com/feed.xml"
          }
        }
      ]
    }
  ]
}
```

#### Create Collection

```http
POST /api-v1-collections
```

**Request Body:**

```json
{
  "name": "My Collection",
  "slug": "my-collection",
  "description": "Collection description",
  "is_public": true,
  "output_format": "rss",
  "feed_ids": ["uuid1", "uuid2"]
}
```

#### Delete Collection

```http
DELETE /api-v1-collections/:id
```

---

## Error Codes

| Code                  | Description                      |
| --------------------- | -------------------------------- |
| `UNAUTHORIZED`        | Invalid or missing API key       |
| `PREMIUM_REQUIRED`    | API access requires Premium plan |
| `RATE_LIMIT_EXCEEDED` | Too many requests                |
| `NOT_FOUND`           | Resource not found               |
| `VALIDATION_ERROR`    | Invalid request data             |
| `DUPLICATE_FEED`      | Feed URL already exists          |
| `KEY_LIMIT_EXCEEDED`  | Maximum API keys reached         |
| `METHOD_NOT_ALLOWED`  | HTTP method not supported        |

---

## Code Examples

### JavaScript/Node.js

```javascript
const FEEDVINE_API_KEY = "sk_live_your_key_here"
const BASE_URL = "https://your-project.supabase.co/functions/v1"

async function getFeeds() {
  const response = await fetch(`${BASE_URL}/api-v1-feeds`, {
    headers: {
      Authorization: `Bearer ${FEEDVINE_API_KEY}`,
    },
  })

  const result = await response.json()
  return result.data
}

async function createFeed(url, title) {
  const response = await fetch(`${BASE_URL}/api-v1-feeds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FEEDVINE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, title }),
  })

  const result = await response.json()
  return result.data
}
```

### Python

```python
import requests

FEEDVINE_API_KEY = 'sk_live_your_key_here'
BASE_URL = 'https://your-project.supabase.co/functions/v1'

def get_feeds():
    response = requests.get(
        f'{BASE_URL}/api-v1-feeds',
        headers={'Authorization': f'Bearer {FEEDVINE_API_KEY}'}
    )
    return response.json()['data']

def create_feed(url, title):
    response = requests.post(
        f'{BASE_URL}/api-v1-feeds',
        headers={
            'Authorization': f'Bearer {FEEDVINE_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={'url': url, 'title': title}
    )
    return response.json()['data']
```

---

## Best Practices

1. **Store API keys securely** - Never commit keys to version control
2. **Handle rate limits** - Implement exponential backoff
3. **Cache responses** - Reduce API calls where possible
4. **Use pagination** - Don't fetch all data at once
5. **Handle errors gracefully** - Check `success` field in responses
6. **Monitor usage** - Track your API usage in the dashboard

---

## Support

- **Documentation:** https://github.com/yourusername/feedvine/docs
- **Issues:** https://github.com/yourusername/feedvine/issues
- **Email:** support@feedvine.app

---

## Changelog

### v1.0.0 (2024-01-15)

- Initial API release
- Feeds, Articles, Categories, and Collections endpoints
- Rate limiting by plan tier
- API key management
