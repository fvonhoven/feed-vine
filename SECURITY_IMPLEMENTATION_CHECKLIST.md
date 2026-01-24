# 🔐 Security Implementation Checklist

A comprehensive guide to implement enterprise-level security for web applications at $0/month cost.

**Target Security Score: 9/10**

---

## 📋 Quick Reference

### Tech Stack Template

- **Frontend**: React/Vue/Next.js/etc
- **Backend**: Supabase/Firebase/Node.js/etc
- **Hosting**: Netlify/Vercel/etc
- **Database**: PostgreSQL/MySQL/etc
- **CDN/Security**: Cloudflare (Free tier)

---

## ✅ Implementation Checklist

### 1. Security Headers (30 minutes)

**Goal**: Protect against XSS, clickjacking, MIME sniffing

**Files to Create/Edit**:

- [ ] `netlify.toml` (Netlify) or `vercel.json` (Vercel)

**Headers to Add**:

- [ ] Content-Security-Policy (CSP)
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] X-XSS-Protection
- [ ] Referrer-Policy
- [ ] Permissions-Policy

**Example (netlify.toml)**:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' [YOUR_DOMAINS];
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' [YOUR_API_DOMAINS];
      frame-src [YOUR_IFRAME_DOMAINS];
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    """
```

**Domains to Include in CSP**:

- [ ] Stripe: `https://js.stripe.com`, `https://api.stripe.com`
- [ ] Analytics: `https://www.clarity.ms`, `https://scripts.clarity.ms`
- [ ] hCaptcha: `https://js.hcaptcha.com`, `https://*.hcaptcha.com`
- [ ] Your backend: `https://*.supabase.co` or your API domain

**Testing**:

- [ ] Run: `curl -I https://yoursite.com | grep -E "X-Frame-Options|Content-Security-Policy"`
- [ ] Check browser console for CSP violations
- [ ] Test on https://securityheaders.com/

---

### 2. hCaptcha Bot Protection (45 minutes)

**Goal**: Prevent automated bot signups/logins

**Steps**:

- [ ] Sign up at https://dashboard.hcaptcha.com/
- [ ] Create a new site
- [ ] Get site key (starts with numbers/letters)
- [ ] Add to environment variables: `VITE_HCAPTCHA_SITE_KEY` (Vite) or `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` (Next.js)

**Files to Create**:

- [ ] `src/components/HCaptcha.tsx` (or `.jsx`)

**Key Implementation Details**:

- [ ] Use `React.memo()` to prevent re-renders
- [ ] Use `useCallback()` for callback functions
- [ ] Handle React Strict Mode (double renders)
- [ ] Clean up on unmount with `window.hcaptcha.remove()`
- [ ] Add error handling for duplicate renders

**Integration**:

- [ ] Add to signup form
- [ ] Disable submit button until CAPTCHA completed
- [ ] Clear CAPTCHA token after successful submission

**Environment Variables**:

```bash
# .env
VITE_HCAPTCHA_SITE_KEY=your-site-key-here
```

**Hosting Platform**:

- [ ] Add environment variable to Netlify/Vercel dashboard
- [ ] Redeploy after adding

**Testing**:

- [ ] Complete CAPTCHA and submit form
- [ ] Verify no "flashing" when typing in other fields
- [ ] Check browser console for errors

---

### 3. IP-based Rate Limiting (60 minutes)

**Goal**: Prevent API abuse and brute force attacks

**Database Migration** (PostgreSQL/Supabase):

- [ ] Create `ip_rate_limits` table
- [ ] Add indexes on `ip_address` and `created_at`
- [ ] Enable RLS policies

**Middleware** (Edge Functions/API Routes):

- [ ] Create rate limit middleware
- [ ] Detect Cloudflare IP headers (`CF-Connecting-IP`)
- [ ] Implement sliding window algorithm
- [ ] Auto-cleanup old records

**Configuration**:

- [ ] Set limits per endpoint (e.g., 10 requests/minute for signup)
- [ ] Return 429 status code when limit exceeded
- [ ] Add helpful error messages

**Testing**:

- [ ] Make multiple rapid requests
- [ ] Verify 429 response after limit
- [ ] Check database for rate limit records

---

### 4. Cloudflare Setup (30 minutes)

**Goal**: DDoS protection, CDN, WAF, bot protection

#### Step 1: Add Site to Cloudflare

- [ ] Sign up at https://dash.cloudflare.com/
- [ ] Click "Add a Site"
- [ ] Enter your domain
- [ ] Select Free plan

#### Step 2: Update Nameservers

- [ ] Copy Cloudflare nameservers (e.g., `ns1.cloudflare.com`)
- [ ] Go to your domain registrar (Namecheap, GoDaddy, etc.)
- [ ] Replace existing nameservers with Cloudflare's
- [ ] Wait for DNS propagation (5 min - 48 hours)
- [ ] Check status: https://www.whatsmydns.net/

#### Step 3: DNS Records

- [ ] Add A record: `@` → Your hosting IP (Proxied ✅)
- [ ] Add CNAME: `www` → Your hosting domain (Proxied ✅)
- [ ] Keep MX, TXT, NS records as "DNS only"

**Find Your Hosting IP**:

- Netlify: Usually `75.2.60.5` or check Domain Settings
- Vercel: Check project settings or use `dig yourdomain.com`

#### Step 4: SSL/TLS Settings

- [ ] Go to SSL/TLS → Overview
- [ ] Set encryption mode: **Full (strict)**
- [ ] Go to SSL/TLS → Edge Certificates
- [ ] Enable "Always Use HTTPS"
- [ ] Enable "Automatic HTTPS Rewrites"
- [ ] Enable "Opportunistic Encryption"

#### Step 5: Security Settings

- [ ] Go to Security → Settings
- [ ] Security Level: **Automated** (default - leave as is)
- [ ] Click "General" tab:
  - [ ] Enable "Browser Integrity Check"
  - [ ] Enable "Privacy Pass Support" (if available)
- [ ] Click "DDoS attacks" tab:
  - [ ] Verify "HTTP DDoS Attack Protection" is ON
- [ ] Scroll down to find "Bot Fight Mode"
  - [ ] Enable "Bot Fight Mode" (Free) or "Super Bot Fight Mode" (Paid)

#### Step 6: Performance Settings (Optional)

- [ ] Go to Speed → Optimization
- [ ] Enable "Auto Minify" (HTML, CSS, JS)
- [ ] Enable "Brotli" compression
- [ ] Enable "Early Hints"
- [ ] Test "Rocket Loader" (may break some sites - test first)

#### Step 7: Caching

- [ ] Go to Caching → Configuration
- [ ] Set "Browser Cache TTL": 4 hours (or higher)
- [ ] Enable "Always Online"

**Testing**:

- [ ] Visit `http://yoursite.com` - should redirect to HTTPS
- [ ] Check response headers: `curl -I https://yoursite.com | grep -i cf-ray`
- [ ] Verify site loads correctly
- [ ] Test from different locations: https://www.webpagetest.org/

---

### 5. Database Security (45 minutes)

**Goal**: Prevent unauthorized data access

#### Row Level Security (RLS) - PostgreSQL/Supabase

- [ ] Enable RLS on all tables: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Create policies for SELECT, INSERT, UPDATE, DELETE
- [ ] Use `auth.uid()` to restrict access to user's own data

**Example Policies**:

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Triggers for Auto-Creation

- [ ] Create trigger to auto-create user records on signup
- [ ] Add error handling: `EXCEPTION WHEN OTHERS THEN`
- [ ] Use `SECURITY DEFINER` for elevated permissions
- [ ] Add `ON CONFLICT DO NOTHING` to prevent duplicates

**Example**:

```sql
CREATE OR REPLACE FUNCTION create_user_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

#### API Security

- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Validate all user inputs
- [ ] Sanitize data before database insertion
- [ ] Use prepared statements

**Testing**:

- [ ] Try accessing another user's data
- [ ] Verify RLS blocks unauthorized access
- [ ] Test signup flow creates all necessary records

---

### 6. UX Improvements (15 minutes)

**Goal**: Better user experience after security actions

#### After Signup

- [ ] Clear form fields
- [ ] Clear CAPTCHA token
- [ ] Show success message (6+ seconds)
- [ ] Auto-switch to login tab (after 2 seconds)

#### After Login

- [ ] Redirect to dashboard
- [ ] Show welcome message
- [ ] Clear any error states

#### Email Verification

- [ ] Update Supabase Site URL to production domain
- [ ] Add redirect URLs for localhost (development)
- [ ] Test confirmation email links

**Supabase Configuration**:

- [ ] Go to Authentication → URL Configuration
- [ ] Set Site URL: `https://yoursite.com`
- [ ] Add Redirect URLs: `https://yoursite.com/**`, `http://localhost:3000/**`

---

## 🧪 Testing Checklist

### Security Headers

- [ ] https://securityheaders.com/ - Grade A or A+
- [ ] https://observatory.mozilla.org/ - Score 90+
- [ ] Browser DevTools → Network → Check response headers

### hCaptcha

- [ ] CAPTCHA appears on signup
- [ ] Submit button disabled until completed
- [ ] No flashing when typing in form
- [ ] Form clears after successful signup

### Rate Limiting

- [ ] Make 10+ rapid requests to API
- [ ] Verify 429 response
- [ ] Check error message is helpful

### Cloudflare

- [ ] HTTP redirects to HTTPS
- [ ] Response headers include `cf-ray`
- [ ] Site loads from multiple locations
- [ ] Check DNS propagation: https://www.whatsmydns.net/

### Database Security

- [ ] Cannot access other users' data
- [ ] Signup creates all necessary records
- [ ] RLS policies block unauthorized queries

---

## 📊 Security Score Breakdown

| Category             | Before | After | Target  |
| -------------------- | ------ | ----- | ------- |
| **Overall Security** | 4-5/10 | 9/10  | 9/10 ✅ |
| **DDoS Protection**  | 2/10   | 9/10  | 9/10 ✅ |
| **Bot Protection**   | 3/10   | 9/10  | 9/10 ✅ |
| **XSS Protection**   | 6/10   | 9/10  | 9/10 ✅ |
| **SQL Injection**    | 8/10   | 9/10  | 9/10 ✅ |
| **Rate Limiting**    | 5/10   | 9/10  | 9/10 ✅ |

**Cost**: $0/month 💰

---

## 🚀 AI Prompt for Implementation

Use this prompt with AI assistants (ChatGPT, Claude, etc.):

```
I need to implement comprehensive security measures for my web application. Please help me:

1. Security Headers - Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and other
   security headers to protect against XSS, clickjacking, and MIME sniffing attacks.

2. hCaptcha Integration - Implement hCaptcha on signup/login forms to prevent bot signups.
   Create a reusable React component that handles:
   - React Strict Mode compatibility
   - Proper cleanup on unmount
   - Memoization to prevent unnecessary re-renders
   - Error handling

3. IP-based Rate Limiting - Create database tables and middleware for IP-based rate
   limiting on API endpoints to prevent abuse.

4. Cloudflare Setup - Guide me through setting up Cloudflare for:
   - DDoS protection
   - CDN/caching
   - WAF (Web Application Firewall)
   - Bot protection
   - SSL/TLS configuration

5. Database Security - Ensure proper Row Level Security (RLS) policies and triggers are
   in place.

6. UX Improvements - After successful signup, clear the form and provide good user feedback.

My tech stack is:
- Frontend: [React/Vue/Next.js/etc]
- Backend: [Supabase/Firebase/Node.js/etc]
- Hosting: [Netlify/Vercel/etc]
- Database: [PostgreSQL/MySQL/etc]

Please provide step-by-step implementation with code examples, and help me achieve a
security score of 9/10 or higher while keeping costs at $0/month.
```

---

## 📚 Additional Resources

### Documentation

- Cloudflare Docs: https://developers.cloudflare.com/
- hCaptcha Docs: https://docs.hcaptcha.com/
- OWASP Security Guide: https://owasp.org/www-project-web-security-testing-guide/
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

### Testing Tools

- Security Headers: https://securityheaders.com/
- Mozilla Observatory: https://observatory.mozilla.org/
- SSL Labs: https://www.ssllabs.com/ssltest/
- DNS Propagation: https://www.whatsmydns.net/
- WebPageTest: https://www.webpagetest.org/

### Monitoring

- Cloudflare Analytics: Built-in dashboard
- Supabase Logs: Database query logs
- Browser DevTools: Network tab, Console

---

## 🎯 Quick Start (30-Minute Version)

If you're short on time, prioritize these:

1. **Security Headers** (10 min) - Add to `netlify.toml` or `vercel.json`
2. **Cloudflare DNS + SSL** (10 min) - Point DNS, enable SSL
3. **hCaptcha on Signup** (10 min) - Basic implementation

This gets you to ~7/10 security. Add the rest later for 9/10.

---

## ✅ Final Verification

Before going live:

- [ ] All checklist items completed
- [ ] Security score 9/10 or higher
- [ ] All tests passing
- [ ] No console errors
- [ ] Email verification works
- [ ] Signup/login flow smooth
- [ ] Site loads fast globally
- [ ] HTTPS working everywhere
- [ ] Cloudflare proxy active

---

**🎉 Congratulations! You now have enterprise-level security at $0/month!**

---

## 📝 Notes

- Save this checklist for future projects
- Update CSP domains as you add new services
- Review security settings quarterly
- Monitor Cloudflare analytics for attacks
- Keep dependencies updated

---

**Version**: 1.0
**Last Updated**: 2026-01-24
**Based on**: FeedVine Security Implementation
