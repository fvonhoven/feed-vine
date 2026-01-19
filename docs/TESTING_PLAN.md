# 🧪 FeedVine Testing Plan

## Overview

This document outlines the testing procedures for FeedVine to ensure all features work correctly before deployment.

---

## 1. Authentication & User Management

### Demo Mode Testing

- [ ] Visit site without Supabase credentials configured
- [ ] Verify demo mode banner appears
- [ ] Confirm demo user is automatically logged in
- [ ] Test that demo mode prevents certain actions (adding feeds, etc.)

### Sign Up Flow

- [ ] Click "Get Started Free" or "Sign In"
- [ ] Create new account with email/password
- [ ] Verify email confirmation (if enabled)
- [ ] Check that user is redirected to dashboard after signup
- [ ] Verify user starts on Free plan

### Sign In Flow

- [ ] Sign in with existing credentials
- [ ] Test "Remember me" functionality
- [ ] Verify redirect to dashboard after login
- [ ] Test sign out functionality

### Password Reset

- [ ] Click "Forgot Password"
- [ ] Enter email and request reset
- [ ] Check email for reset link
- [ ] Complete password reset process
- [ ] Sign in with new password

---

## 2. Subscription & Pricing

### Pricing Page Display

- [ ] Visit `/pricing` page
- [ ] Verify all 4 tiers display correctly (Free, Pro, Plus, Premium)
- [ ] Check monthly/annual toggle works
- [ ] Verify savings percentages are correct:
  - Pro: 17% annual savings
  - Plus: 25% annual savings
  - Premium: 25% annual savings
- [ ] Confirm "Save up to 25%" badge shows on annual toggle

### Current Plan Indication (Logged In)

- [ ] Sign in as a user
- [ ] Visit `/pricing` page
- [ ] Verify current plan shows "CURRENT PLAN" green badge
- [ ] Confirm current plan has green border and ring
- [ ] Check that current plan button says "Current Plan" and is disabled
- [ ] Verify current plan button has green background

### Hover Effects

- [ ] Hover over each pricing card
- [ ] Verify cards scale up slightly
- [ ] Check shadow deepens on hover
- [ ] Confirm border color changes on non-highlighted cards

### Stripe Checkout Flow

- [ ] Click "Get Pro Monthly" (or any paid plan)
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete test payment with Stripe test card: `4242 4242 4242 4242`
- [ ] Verify redirect back to success page
- [ ] Check that subscription is active in database
- [ ] Confirm plan limits are updated

### Plan Limits Enforcement

- [ ] Test Free plan limits (1 feed, 1 category)
- [ ] Try to exceed limits and verify error messages
- [ ] Upgrade to Pro and verify new limits (5 feeds, 3 categories)
- [ ] Test each tier's limits

---

## 3. Feed Management

### Adding Feeds Manually

- [ ] Click "Add Feed" button
- [ ] Enter valid RSS feed URL (e.g., `https://hnrss.org/frontpage`)
- [ ] Verify feed is added successfully
- [ ] Check that articles are fetched automatically
- [ ] Confirm toast notification appears
- [ ] Verify feed appears in sidebar

### Discover Page

- [ ] Navigate to `/discover` page
- [ ] Browse popular feeds by category
- [ ] Use search to filter feeds
- [ ] Click "Add Feed" on a discoverable feed
- [ ] Verify feed is added and articles fetched
- [ ] Check that "Add Feed" buttons are bottom-aligned
- [ ] Test hover effects on feed cards

### Feed Categories

- [ ] Create a new category
- [ ] Assign feed to category
- [ ] Verify category appears in sidebar
- [ ] Test category color picker
- [ ] Filter articles by category
- [ ] Delete category (check feeds remain)

### Feed Collections

- [ ] Create a new collection
- [ ] Add multiple feeds to collection
- [ ] View collection feed (combined articles)
- [ ] Remove feed from collection
- [ ] Delete collection
- [ ] Test collection limits per plan

### Editing Feeds

- [ ] Edit feed title
- [ ] Change feed category
- [ ] Refresh feed manually
- [ ] Delete feed
- [ ] Verify articles are removed when feed is deleted

---

## 4. Article Reading & Management

### Article List View

- [ ] View all articles in main feed
- [ ] Verify articles display correctly (title, excerpt, date, source)
- [ ] Check article images load properly
- [ ] Test infinite scroll / pagination
- [ ] Verify read/unread status indicators

### Reading Articles

- [ ] Click on article to open
- [ ] Verify article content displays in modal/panel
- [ ] Check that article is marked as read
- [ ] Test "Open in new tab" functionality
- [ ] Close article and verify it stays marked as read

### Article Actions

- [ ] Mark article as read/unread
- [ ] Save article for later (Pro+ feature)
- [ ] View saved articles
- [ ] Unsave article
- [ ] Test keyboard shortcuts (if on Plus+ plan):
  - `j` - Next article
  - `k` - Previous article
  - `m` - Mark as read
  - `s` - Save article
  - `o` - Open article

### Filtering & Search

- [ ] Use basic filters (All, Unread, Saved)
- [ ] Test advanced filters (Plus+ feature)
- [ ] Search articles by keyword
- [ ] Filter by date range
- [ ] Filter by source feed

---

## 5. API Access (Premium Plan)

### API Authentication

- [ ] Upgrade to Premium plan
- [ ] Navigate to API settings
- [ ] Generate API key
- [ ] Copy API key
- [ ] Test API key in request headers

### API Endpoints Testing

```bash
# Test GET /api/feeds
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-domain.com/api/feeds

# Test GET /api/articles
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-domain.com/api/articles

# Test rate limiting (2,000 requests/hour)
# Make multiple requests and verify rate limit headers
```

- [ ] Test all API endpoints with valid API key
- [ ] Verify rate limiting works (2,000 req/hour)
- [ ] Test with invalid API key (should return 401)
- [ ] Check API response formats (JSON)
- [ ] Verify API documentation is accurate

---

## 6. User Interface & Experience

### Landing Page

- [ ] Visit landing page as logged-out user
- [ ] Verify hero section displays correctly
- [ ] Check feature highlights are visible
- [ ] Test pricing section (should show annual pricing)
- [ ] Verify "Save up to 25%" message
- [ ] Click CTA buttons and verify navigation
- [ ] Test responsive design on mobile
- [ ] Check hover effects on pricing cards

### Navigation

- [ ] Test all navigation links
- [ ] Verify active page highlighting
- [ ] Test mobile hamburger menu
- [ ] Check user menu dropdown
- [ ] Verify plan badge shows in user menu

### Dark Mode

- [ ] Toggle dark mode on/off
- [ ] Verify all pages render correctly in dark mode
- [ ] Check contrast and readability
- [ ] Test that preference persists across sessions

### Responsive Design

- [ ] Test on mobile (320px - 480px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (1280px+)
- [ ] Verify all features work on touch devices
- [ ] Check that modals/dialogs are mobile-friendly

---

## 7. Performance & Loading

### Initial Load

- [ ] Measure time to first contentful paint
- [ ] Check bundle size (should be optimized)
- [ ] Verify lazy loading of images
- [ ] Test with slow 3G connection

### Data Fetching

- [ ] Verify loading states show during data fetch
- [ ] Check that errors are handled gracefully
- [ ] Test retry logic on failed requests
- [ ] Verify caching works (React Query)

### RSS Feed Fetching

- [ ] Add feed and monitor fetch time
- [ ] Test with slow-responding RSS feeds
- [ ] Verify timeout handling
- [ ] Check error messages for invalid feeds

---

## 8. Error Handling & Edge Cases

### Invalid Inputs

- [ ] Try adding invalid RSS feed URL
- [ ] Test with malformed feed XML
- [ ] Enter invalid email format in signup
- [ ] Test with very long feed titles/descriptions

### Network Errors

- [ ] Disconnect internet and test offline behavior
- [ ] Verify error messages are user-friendly
- [ ] Test retry mechanisms
- [ ] Check that app doesn't crash on network errors

### Plan Limit Enforcement

- [ ] Try to add more feeds than plan allows
- [ ] Attempt to create more categories than allowed
- [ ] Test collection limits
- [ ] Verify upgrade prompts appear

### Concurrent Actions

- [ ] Add multiple feeds simultaneously
- [ ] Mark multiple articles as read quickly
- [ ] Test race conditions in state updates

---

## 9. Data Persistence & Sync

### Local Storage

- [ ] Verify dark mode preference persists
- [ ] Check that read status syncs across tabs
- [ ] Test that filters/settings are remembered

### Database Sync

- [ ] Make changes in one browser tab
- [ ] Verify changes appear in another tab
- [ ] Test real-time updates (if implemented)
- [ ] Check data consistency after refresh

---

## 10. Security Testing

### Authentication Security

- [ ] Verify JWT tokens expire correctly
- [ ] Test that protected routes require auth
- [ ] Check that users can't access other users' data
- [ ] Test CSRF protection

### API Security

- [ ] Verify API keys are properly hashed
- [ ] Test that API keys can be revoked
- [ ] Check rate limiting prevents abuse
- [ ] Verify CORS settings are correct

### Input Sanitization

- [ ] Test XSS prevention in feed titles
- [ ] Verify SQL injection protection
- [ ] Check that user inputs are sanitized

---

## 11. Legal & Compliance Pages

### Terms of Service

- [ ] Navigate to `/terms` page
- [ ] Verify content displays correctly
- [ ] Check all sections are present
- [ ] Test links within terms page

### Privacy Policy

- [ ] Navigate to `/privacy` page
- [ ] Verify privacy policy is complete
- [ ] Check data collection disclosures
- [ ] Test links within privacy page

---

## 12. Stripe Integration

### Webhook Testing

- [ ] Use Stripe CLI to test webhooks locally
- [ ] Test `checkout.session.completed` event
- [ ] Test `customer.subscription.updated` event
- [ ] Test `customer.subscription.deleted` event
- [ ] Verify subscription status updates in database

### Subscription Management

- [ ] Upgrade from Free to Pro
- [ ] Upgrade from Pro to Plus
- [ ] Upgrade from Plus to Premium
- [ ] Downgrade from Premium to Plus
- [ ] Cancel subscription
- [ ] Verify access continues until period end

---

## 13. Browser Compatibility

Test on the following browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 14. Accessibility

### Keyboard Navigation

- [ ] Navigate entire site using only keyboard
- [ ] Verify tab order is logical
- [ ] Check that focus indicators are visible
- [ ] Test keyboard shortcuts work

### Screen Reader Testing

- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Verify alt text on images
- [ ] Check ARIA labels are present
- [ ] Test form field labels

### Color Contrast

- [ ] Verify WCAG AA compliance
- [ ] Test with color blindness simulators
- [ ] Check text readability in both themes

---

## Test Data

### Test RSS Feeds

```
Hacker News: https://hnrss.org/frontpage
TechCrunch: https://techcrunch.com/feed/
The Verge: https://www.theverge.com/rss/index.xml
Reddit Programming: https://www.reddit.com/r/programming/.rss
```

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

---

## Bug Reporting Template

When you find a bug, document it with:

- **Title**: Brief description
- **Steps to Reproduce**: Numbered steps
- **Expected Result**: What should happen
- **Actual Result**: What actually happened
- **Browser/Device**: Environment details
- **Screenshots**: If applicable
- **Severity**: Critical / High / Medium / Low

---

## Sign-Off Checklist

Before launching to production:

- [ ] All critical bugs fixed
- [ ] All features tested and working
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Accessibility standards met
- [ ] Legal pages reviewed
- [ ] Stripe integration tested in production mode
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and logging configured
- [ ] Documentation updated

---

## Notes

- Test in both **demo mode** and **production mode** with real Supabase credentials
- Use **Stripe test mode** for all payment testing
- Document any issues in GitHub Issues or your project management tool
- Retest after fixes are deployed
- Consider automated testing for critical paths (future enhancement)
