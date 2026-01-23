# Cloudflare Setup for FeedVine

## Why Cloudflare?

- ✅ **Free DDoS Protection** - Automatic mitigation of DDoS attacks
- ✅ **CDN** - Faster load times worldwide
- ✅ **WAF** (Web Application Firewall) - Block malicious requests
- ✅ **SSL/TLS** - Free SSL certificates
- ✅ **Rate Limiting** - IP-based rate limiting (paid feature, but basic protection is free)
- ✅ **Bot Protection** - Block malicious bots

## Setup Steps

### Step 1: Sign Up for Cloudflare

1. Go to https://cloudflare.com
2. Sign up for a free account
3. Click "Add a Site"
4. Enter your domain: `feedvine.app`

### Step 2: Update Nameservers

Cloudflare will give you 2 nameservers (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`)

1. Go to your domain registrar (where you bought feedvine.app)
2. Update nameservers to Cloudflare's nameservers
3. Wait 5-60 minutes for DNS propagation

### Step 3: Configure DNS Records

In Cloudflare DNS settings, add these records:

| Type  | Name | Content                          | Proxy Status |
|-------|------|----------------------------------|--------------|
| CNAME | @    | your-netlify-site.netlify.app    | Proxied ✅   |
| CNAME | www  | your-netlify-site.netlify.app    | Proxied ✅   |

**Important**: Make sure "Proxy status" is **Proxied** (orange cloud) for DDoS protection!

### Step 4: Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Go to **Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

### Step 5: Enable Security Features

#### **Firewall Rules (Free)**

Go to **Security** → **WAF** → **Firewall Rules**

Create a rule to block suspicious traffic:

**Rule 1: Block Known Bots**
- Field: `Known Bots`
- Operator: `equals`
- Value: `On`
- Action: `Block`

**Rule 2: Rate Limit Signup/Login**
- Field: `URI Path`
- Operator: `contains`
- Value: `/auth`
- Action: `Challenge` (CAPTCHA)

#### **Security Level**

Go to **Security** → **Settings**
- Set Security Level to **Medium** or **High**

#### **Bot Fight Mode (Free)**

Go to **Security** → **Bots**
- Enable **Bot Fight Mode** (free tier)

### Step 6: Performance Optimization

Go to **Speed** → **Optimization**

Enable:
- ✅ Auto Minify (HTML, CSS, JS)
- ✅ Brotli compression
- ✅ Rocket Loader (optional - may break some JS)

### Step 7: Page Rules (Optional)

Go to **Rules** → **Page Rules**

**Cache Everything:**
- URL: `feedvine.app/*`
- Cache Level: `Cache Everything`
- Edge Cache TTL: `2 hours`

### Step 8: Verify It's Working

1. Go to https://feedvine.app
2. Check that it loads correctly
3. Open DevTools → Network tab
4. Look for `cf-ray` header in responses (confirms Cloudflare is active)

## Testing DDoS Protection

You can test that Cloudflare is protecting you:

```bash
# Check if Cloudflare is active
curl -I https://feedvine.app | grep -i cf-ray

# Should see something like:
# cf-ray: 123456789abcdef-SJC
```

## Monitoring

- **Analytics**: Cloudflare dashboard shows traffic, threats blocked, bandwidth saved
- **Security Events**: See blocked requests in Security → Events

## Cost

- **Free Plan**: Includes DDoS protection, CDN, SSL, basic WAF
- **Pro Plan ($20/mo)**: Advanced WAF, image optimization, mobile optimization
- **Business Plan ($200/mo)**: Custom WAF rules, advanced rate limiting

**Recommendation**: Start with Free plan, upgrade if needed.

## Important Notes

1. **Netlify + Cloudflare**: Works great together
2. **Supabase**: Keep using direct URLs (don't proxy through Cloudflare)
3. **DNS Propagation**: May take up to 24 hours for full propagation
4. **SSL**: Cloudflare provides free SSL automatically

## Troubleshooting

**Issue**: Site not loading after Cloudflare setup
- **Solution**: Check DNS records are correct, wait for propagation

**Issue**: Infinite redirect loop
- **Solution**: Set SSL/TLS mode to "Full (strict)" in Cloudflare

**Issue**: Some features broken
- **Solution**: Disable Rocket Loader or add exceptions

## Next Steps

After Cloudflare is set up:
1. ✅ Monitor Security Events dashboard
2. ✅ Set up email alerts for security events
3. ✅ Review analytics weekly
4. ✅ Adjust security level based on traffic patterns

