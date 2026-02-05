# FeedVine QA Testing Plan

**Version:** 1.0  
**Last Updated:** 2026-02-05  
**Application:** FeedVine - RSS Feed Aggregator & API Platform  
**Production URL:** https://feedvine.app

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Authentication Testing](#2-authentication-testing)
3. [Feed Management Testing](#3-feed-management-testing)
4. [Article Reading & Interaction](#4-article-reading--interaction)
5. [Filtering & Search](#5-filtering--search)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [Categories Management](#7-categories-management)
8. [Collections Management](#8-collections-management)
9. [Settings & Export](#9-settings--export)
10. [API Keys Management](#10-api-keys-management)
11. [Subscription & Billing](#11-subscription--billing)
12. [Mobile Responsive Testing](#12-mobile-responsive-testing)
13. [Performance Testing](#13-performance-testing)
14. [Security Testing](#14-security-testing)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)
16. [Browser Compatibility](#16-browser-compatibility)

---

## 1. Test Environment Setup

### Prerequisites

- [ ] Access to FeedVine production environment (https://feedvine.app)
- [ ] Access to FeedVine staging/localhost environment (if applicable)
- [ ] Test email accounts for signup testing
- [ ] Test credit card numbers for Stripe testing (4242 4242 4242 4242)
- [ ] Multiple browser access (Chrome, Firefox, Safari, Edge)
- [ ] Mobile devices or emulators (iOS Safari, Android Chrome)

### Test Accounts

| Account Type | Email                    | Purpose                    |
| ------------ | ------------------------ | -------------------------- |
| Free User    | test-free@example.com    | Test free tier limitations |
| Pro User     | test-pro@example.com     | Test Pro features          |
| Plus User    | test-plus@example.com    | Test Plus features         |
| Premium User | test-premium@example.com | Test Premium/API features  |

---

## 2. Authentication Testing

### 2.1 Sign Up Flow

| Test Case   | Steps                                             | Expected Result                                       | Status |
| ----------- | ------------------------------------------------- | ----------------------------------------------------- | ------ |
| TC-AUTH-001 | Navigate to /auth, click "Sign up" toggle         | Sign up form displayed with email and password fields | ☐      |
| TC-AUTH-002 | Enter valid email and password (8+ chars), submit | Success message "Account created! Please sign in."    | ☐      |
| TC-AUTH-003 | Try signup with invalid email format              | Error message displayed                               | ☐      |
| TC-AUTH-004 | Try signup with password < 6 characters           | Error message about password requirements             | ☐      |
| TC-AUTH-005 | Try signup with existing email                    | Error message about existing account                  | ☐      |
| TC-AUTH-006 | Verify email confirmation (if enabled)            | Confirmation email received                           | ☐      |

### 2.2 Sign In Flow

| Test Case   | Steps                              | Expected Result                        | Status |
| ----------- | ---------------------------------- | -------------------------------------- | ------ |
| TC-AUTH-010 | Enter valid credentials and submit | Redirected to home page, success toast | ☐      |
| TC-AUTH-011 | Enter invalid email                | Error message displayed                | ☐      |
| TC-AUTH-012 | Enter wrong password               | Error message displayed                | ☐      |
| TC-AUTH-013 | Leave fields empty and submit      | Validation error shown                 | ☐      |

### 2.3 Sign Out Flow

| Test Case   | Steps                                      | Expected Result                          | Status |
| ----------- | ------------------------------------------ | ---------------------------------------- | ------ |
| TC-AUTH-020 | Click user menu, select "Sign Out"         | Redirected to auth page, session cleared | ☐      |
| TC-AUTH-021 | Try accessing protected route after logout | Redirected to auth or landing page       | ☐      |

### 2.4 Demo Mode

| Test Case   | Steps                                      | Expected Result                            | Status |
| ----------- | ------------------------------------------ | ------------------------------------------ | ------ |
| TC-AUTH-030 | Click "Try Demo Mode" on landing/auth page | App loads with mock data, no auth required | ☐      |
| TC-AUTH-031 | Try to add feed in demo mode               | Error message about demo limitations       | ☐      |
| TC-AUTH-032 | Try to create collection in demo mode      | Error message about demo limitations       | ☐      |

---

## 3. Feed Management Testing

### 3.1 Add Feed

| Test Case   | Steps                                               | Expected Result                           | Status |
| ----------- | --------------------------------------------------- | ----------------------------------------- | ------ |
| TC-FEED-001 | Navigate to Feeds page, enter valid RSS URL, submit | Feed added, articles fetched              | ☐      |
| TC-FEED-002 | Add feed with invalid URL                           | Error message displayed                   | ☐      |
| TC-FEED-003 | Add feed with non-RSS URL                           | Error message about invalid feed          | ☐      |
| TC-FEED-004 | Add duplicate feed URL                              | Error or warning about duplicate          | ☐      |
| TC-FEED-005 | Verify feed limit for free tier                     | Cannot exceed limit, upgrade prompt shown | ☐      |

**Test RSS Feeds:**

- Valid: `https://techcrunch.com/feed/`
- Valid: `https://feeds.arstechnica.com/arstechnica/index`
- Invalid: `https://google.com`

### 3.2 Edit Feed

| Test Case   | Steps                                     | Expected Result                       | Status |
| ----------- | ----------------------------------------- | ------------------------------------- | ------ |
| TC-FEED-010 | Click edit on existing feed, change title | Title updated, success toast          | ☐      |
| TC-FEED-011 | Change feed URL to valid new URL          | URL updated, new articles fetched     | ☐      |
| TC-FEED-012 | Change feed URL to invalid URL            | Error message, original URL preserved | ☐      |
| TC-FEED-013 | Cancel edit without saving                | Original values preserved             | ☐      |

### 3.3 Delete Feed

| Test Case   | Steps                              | Expected Result                             | Status |
| ----------- | ---------------------------------- | ------------------------------------------- | ------ |
| TC-FEED-020 | Click delete on feed, confirm      | Feed removed from list                      | ☐      |
| TC-FEED-021 | Cancel delete confirmation         | Feed remains in list                        | ☐      |
| TC-FEED-022 | Verify associated articles removed | Articles from deleted feed no longer appear | ☐      |

### 3.4 Refresh Feed

| Test Case   | Steps                                 | Expected Result                            | Status |
| ----------- | ------------------------------------- | ------------------------------------------ | ------ |
| TC-FEED-030 | Click refresh on individual feed      | Loading spinner, new articles fetched      | ☐      |
| TC-FEED-031 | Click "Refresh All Feeds" button      | All feeds refreshed, article count updated | ☐      |
| TC-FEED-032 | Verify duplicate articles not created | No duplicate entries after refresh         | ☐      |

---

## 4. Article Reading & Interaction

### 4.1 View Articles

| Test Case  | Steps                                                          | Expected Result                           | Status |
| ---------- | -------------------------------------------------------------- | ----------------------------------------- | ------ |
| TC-ART-001 | Navigate to Home page                                          | Article list displayed, most recent first | ☐      |
| TC-ART-002 | Verify article card displays: title, source, date, description | All elements visible and correct          | ☐      |
| TC-ART-003 | Verify category badge displayed                                | AI-assigned category shown                | ☐      |
| TC-ART-004 | Click article title                                            | Opens article in new tab                  | ☐      |

### 4.2 Read/Unread Status

| Test Case  | Steps                                          | Expected Result                            | Status |
| ---------- | ---------------------------------------------- | ------------------------------------------ | ------ |
| TC-ART-010 | Click article link to open                     | Article marked as read (dimmed appearance) | ☐      |
| TC-ART-011 | Click checkmark button on unread article       | Article marked as read                     | ☐      |
| TC-ART-012 | Click checkmark button on read article         | Article marked as unread                   | ☐      |
| TC-ART-013 | Verify read status persists after page refresh | Read articles remain read                  | ☐      |

### 4.3 Save/Bookmark Articles

| Test Case  | Steps                                  | Expected Result                         | Status |
| ---------- | -------------------------------------- | --------------------------------------- | ------ |
| TC-ART-020 | Click bookmark icon on unsaved article | Article saved, icon filled, toast shown | ☐      |
| TC-ART-021 | Click bookmark icon on saved article   | Article unsaved, icon unfilled          | ☐      |
| TC-ART-022 | Navigate to Saved page                 | All bookmarked articles displayed       | ☐      |
| TC-ART-023 | Unsave from Saved page                 | Article removed from Saved page         | ☐      |

---

## 5. Filtering & Search

### 5.1 Keyword Search

| Test Case   | Steps                          | Expected Result                                | Status |
| ----------- | ------------------------------ | ---------------------------------------------- | ------ |
| TC-FILT-001 | Enter keyword in search box    | Articles filtered by title/description/content | ☐      |
| TC-FILT-002 | Search for non-existent term   | "No articles found" message                    | ☐      |
| TC-FILT-003 | Clear search field             | All articles displayed                         | ☐      |
| TC-FILT-004 | Search with special characters | Proper escaping, no errors                     | ☐      |

### 5.2 Feed Filter

| Test Case   | Steps                              | Expected Result                    | Status |
| ----------- | ---------------------------------- | ---------------------------------- | ------ |
| TC-FILT-010 | Select specific feed from dropdown | Only articles from that feed shown | ☐      |
| TC-FILT-011 | Select "All Feeds"                 | All articles displayed             | ☐      |

### 5.3 Date Range Filter

| Test Case   | Steps                  | Expected Result                       | Status |
| ----------- | ---------------------- | ------------------------------------- | ------ |
| TC-FILT-020 | Select "Last 24 hours" | Only articles from last 24h shown     | ☐      |
| TC-FILT-021 | Select "Last Week"     | Only articles from last 7 days shown  | ☐      |
| TC-FILT-022 | Select "Last Month"    | Only articles from last 30 days shown | ☐      |
| TC-FILT-023 | Select "All Time"      | All articles shown regardless of date | ☐      |

### 5.4 Unread Filter

| Test Case   | Steps                               | Expected Result                | Status |
| ----------- | ----------------------------------- | ------------------------------ | ------ |
| TC-FILT-030 | Toggle "Unread Only" on             | Only unread articles displayed | ☐      |
| TC-FILT-031 | Toggle "Unread Only" off            | All articles displayed         | ☐      |
| TC-FILT-032 | Mark article as read with filter on | Article disappears from list   | ☐      |

### 5.5 Combined Filters

| Test Case   | Steps                             | Expected Result                | Status |
| ----------- | --------------------------------- | ------------------------------ | ------ |
| TC-FILT-040 | Apply keyword + feed + date range | Correctly filtered results     | ☐      |
| TC-FILT-041 | Apply all filters, then clear one | Remaining filters still active | ☐      |

---

## 6. Keyboard Shortcuts

**Test on Home Page (Articles view)**

| Test Case  | Shortcut | Steps                     | Expected Result                           | Status |
| ---------- | -------- | ------------------------- | ----------------------------------------- | ------ |
| TC-KEY-001 | `j`      | Press 'j' key             | Select next article, scroll into view     | ☐      |
| TC-KEY-002 | `k`      | Press 'k' key             | Select previous article, scroll into view | ☐      |
| TC-KEY-003 | `m`      | Select article, press 'm' | Toggle read/unread status                 | ☐      |
| TC-KEY-004 | `s`      | Select article, press 's' | Toggle save/unsave status                 | ☐      |
| TC-KEY-005 | `r`      | Press 'r' key             | Refresh articles                          | ☐      |
| TC-KEY-006 | `u`      | Press 'u' key             | Toggle unread-only filter                 | ☐      |
| TC-KEY-007 | `/`      | Press '/' key             | Focus search input field                  | ☐      |
| TC-KEY-008 | `?`      | Press '?' key             | Open keyboard shortcuts help modal        | ☐      |
| TC-KEY-009 | `Esc`    | Open modal, press 'Esc'   | Close modal                               | ☐      |
| TC-KEY-010 | Any key  | Type in search input      | Shortcuts disabled in input fields        | ☐      |

---

## 7. Categories Management

### 7.1 Create Category

| Test Case  | Steps                                                  | Expected Result                   | Status |
| ---------- | ------------------------------------------------------ | --------------------------------- | ------ |
| TC-CAT-001 | On Feeds page, enter category name, pick color, submit | Category created, appears in list | ☐      |
| TC-CAT-002 | Create category with empty name                        | Error message or button disabled  | ☐      |
| TC-CAT-003 | Create category with duplicate name                    | Error message about duplicate     | ☐      |

### 7.2 Edit Category

| Test Case  | Steps                                     | Expected Result           | Status |
| ---------- | ----------------------------------------- | ------------------------- | ------ |
| TC-CAT-010 | Click edit on category, change name/color | Category updated          | ☐      |
| TC-CAT-011 | Cancel category edit                      | Original values preserved | ☐      |

### 7.3 Delete Category

| Test Case  | Steps                                            | Expected Result                   | Status |
| ---------- | ------------------------------------------------ | --------------------------------- | ------ |
| TC-CAT-020 | Click delete on category, confirm                | Category removed                  | ☐      |
| TC-CAT-021 | Verify feeds uncategorized after category delete | Feeds remain but without category | ☐      |

### 7.4 Assign Feed to Category

| Test Case  | Steps                              | Expected Result            | Status |
| ---------- | ---------------------------------- | -------------------------- | ------ |
| TC-CAT-030 | Select category from feed dropdown | Feed assigned to category  | ☐      |
| TC-CAT-031 | Change feed category               | Feed moved to new category | ☐      |
| TC-CAT-032 | Set feed category to "None"        | Feed becomes uncategorized | ☐      |

---

## 8. Collections Management

### 8.1 Create Collection

| Test Case   | Steps                                         | Expected Result                        | Status |
| ----------- | --------------------------------------------- | -------------------------------------- | ------ |
| TC-COLL-001 | Click "Create Collection", fill form, submit  | Collection created                     | ☐      |
| TC-COLL-002 | Create collection with name and description   | All fields saved correctly             | ☐      |
| TC-COLL-003 | Create public collection                      | Collection accessible via public URL   | ☐      |
| TC-COLL-004 | Create private collection                     | Collection not accessible without auth | ☐      |
| TC-COLL-005 | Verify collection limit for subscription tier | Cannot exceed limit, upgrade prompt    | ☐      |

### 8.2 Add Feeds to Collection

| Test Case   | Steps                                 | Expected Result                  | Status |
| ----------- | ------------------------------------- | -------------------------------- | ------ |
| TC-COLL-010 | Select feeds when creating collection | Feeds associated with collection | ☐      |
| TC-COLL-011 | Add feed to existing collection       | Feed added to collection sources | ☐      |
| TC-COLL-012 | Remove feed from collection           | Feed removed from collection     | ☐      |

### 8.3 Edit Collection

| Test Case   | Steps                            | Expected Result            | Status |
| ----------- | -------------------------------- | -------------------------- | ------ |
| TC-COLL-020 | Edit collection name/description | Changes saved              | ☐      |
| TC-COLL-021 | Toggle public/private            | Visibility changed         | ☐      |
| TC-COLL-022 | Toggle marketplace listing       | Marketplace status updated | ☐      |
| TC-COLL-023 | Add/edit tags                    | Tags saved correctly       | ☐      |

### 8.4 Delete Collection

| Test Case   | Steps                                       | Expected Result                 | Status |
| ----------- | ------------------------------------------- | ------------------------------- | ------ |
| TC-COLL-030 | Delete collection, confirm                  | Collection removed              | ☐      |
| TC-COLL-031 | Verify feeds remain after collection delete | Feeds still exist in Feeds page | ☐      |

### 8.5 Collection Export

| Test Case   | Steps                              | Expected Result         | Status |
| ----------- | ---------------------------------- | ----------------------- | ------ |
| TC-COLL-040 | Copy RSS feed URL for collection   | Valid RSS URL copied    | ☐      |
| TC-COLL-041 | Open collection RSS URL in browser | Valid RSS/XML displayed | ☐      |
| TC-COLL-042 | Copy JSON feed URL for collection  | Valid JSON endpoint URL | ☐      |
| TC-COLL-043 | Fetch collection JSON endpoint     | Valid JSON response     | ☐      |

---

## 9. Settings & Export

### 9.1 RSS Export

| Test Case  | Steps                          | Expected Result          | Status |
| ---------- | ------------------------------ | ------------------------ | ------ |
| TC-SET-001 | Click "Download RSS Feed"      | XML file downloaded      | ☐      |
| TC-SET-002 | Verify downloaded RSS is valid | Valid RSS/XML format     | ☐      |
| TC-SET-003 | Click "Copy Feed URL"          | URL copied to clipboard  | ☐      |
| TC-SET-004 | Open copied feed URL           | Valid RSS feed displayed | ☐      |

### 9.2 Subscription Display

| Test Case  | Steps                          | Expected Result                    | Status |
| ---------- | ------------------------------ | ---------------------------------- | ------ |
| TC-SET-010 | View current subscription plan | Correct plan displayed             | ☐      |
| TC-SET-011 | View usage limits              | Limits match current plan          | ☐      |
| TC-SET-012 | View billing period end date   | Correct date shown (if subscribed) | ☐      |

### 9.3 Billing Portal Access

| Test Case  | Steps                           | Expected Result                     | Status |
| ---------- | ------------------------------- | ----------------------------------- | ------ |
| TC-SET-020 | Click "Manage Billing" button   | Redirected to Stripe billing portal | ☐      |
| TC-SET-021 | Update payment method in portal | Changes saved in Stripe             | ☐      |
| TC-SET-022 | View invoice history            | Invoices displayed                  | ☐      |

---

## 10. API Keys Management

**Note: API Keys feature requires Premium subscription**

### 10.1 Access Control

| Test Case  | Steps                                | Expected Result               | Status |
| ---------- | ------------------------------------ | ----------------------------- | ------ |
| TC-API-001 | Access API Keys page as Free user    | Upgrade prompt displayed      | ☐      |
| TC-API-002 | Access API Keys page as Pro user     | Upgrade prompt displayed      | ☐      |
| TC-API-003 | Access API Keys page as Premium user | API Keys management available | ☐      |

### 10.2 Create API Key

| Test Case  | Steps                                          | Expected Result                      | Status |
| ---------- | ---------------------------------------------- | ------------------------------------ | ------ |
| TC-API-010 | Click "Create New API Key", enter name, submit | Key created, full key displayed once | ☐      |
| TC-API-011 | Try to create key with empty name              | Error or button disabled             | ☐      |
| TC-API-012 | Verify key format (starts with fv\_)           | Correct format displayed             | ☐      |
| TC-API-013 | Copy newly created key                         | Key copied to clipboard              | ☐      |

### 10.3 View API Keys

| Test Case  | Steps                                    | Expected Result                   | Status |
| ---------- | ---------------------------------------- | --------------------------------- | ------ |
| TC-API-020 | View list of API keys                    | Keys displayed with masked values | ☐      |
| TC-API-021 | Verify key shows name and last used date | Correct metadata displayed        | ☐      |

### 10.4 Revoke API Key

| Test Case  | Steps                            | Expected Result           | Status |
| ---------- | -------------------------------- | ------------------------- | ------ |
| TC-API-030 | Click revoke on API key, confirm | Key removed from list     | ☐      |
| TC-API-031 | Try to use revoked key           | 401 Unauthorized response | ☐      |

### 10.5 API Usage

| Test Case  | Steps                             | Expected Result                | Status |
| ---------- | --------------------------------- | ------------------------------ | ------ |
| TC-API-040 | Make API request with valid key   | 200 OK response with data      | ☐      |
| TC-API-041 | Make API request with invalid key | 401 Unauthorized response      | ☐      |
| TC-API-042 | Exceed rate limit                 | 429 Too Many Requests response | ☐      |

---

## 11. Subscription & Billing

### 11.1 Pricing Page

| Test Case  | Steps                           | Expected Result                                  | Status |
| ---------- | ------------------------------- | ------------------------------------------------ | ------ |
| TC-SUB-001 | Navigate to Pricing page        | All 4 tiers displayed (Free, Pro, Plus, Premium) | ☐      |
| TC-SUB-002 | Toggle monthly/annual billing   | Prices update correctly                          | ☐      |
| TC-SUB-003 | Verify annual savings displayed | Correct discount shown (~25% off)                | ☐      |
| TC-SUB-004 | View feature comparison         | All features listed per tier                     | ☐      |

### 11.2 Subscribe Flow

| Test Case  | Steps                                   | Expected Result                            | Status |
| ---------- | --------------------------------------- | ------------------------------------------ | ------ |
| TC-SUB-010 | Click subscribe on Pro plan             | Redirected to Stripe checkout              | ☐      |
| TC-SUB-011 | Complete Stripe checkout with test card | Redirected back with success, plan updated | ☐      |
| TC-SUB-012 | Cancel Stripe checkout                  | Redirected back, plan unchanged            | ☐      |
| TC-SUB-013 | Verify new limits after upgrade         | Limits match new plan                      | ☐      |

**Test Card Number:** `4242 4242 4242 4242` (any future date, any CVC)

### 11.3 Plan Upgrade/Downgrade

| Test Case  | Steps                                   | Expected Result                                | Status |
| ---------- | --------------------------------------- | ---------------------------------------------- | ------ |
| TC-SUB-020 | Upgrade from Pro to Plus                | Immediate upgrade, prorated charge             | ☐      |
| TC-SUB-021 | Downgrade from Plus to Pro              | Scheduled for end of billing period            | ☐      |
| TC-SUB-022 | Cancel subscription (downgrade to Free) | Scheduled for end of billing period            | ☐      |
| TC-SUB-023 | Verify downgrade confirmation message   | Clear messaging about when change takes effect | ☐      |

### 11.4 Plan Limits

| Test Case  | Steps                            | Expected Result                | Status |
| ---------- | -------------------------------- | ------------------------------ | ------ |
| TC-SUB-030 | Free: Try to exceed 5 feed limit | Error with upgrade prompt      | ☐      |
| TC-SUB-031 | Free: Try to create collection   | Error with upgrade prompt      | ☐      |
| TC-SUB-032 | Pro: Verify 50 feed limit        | Can add up to 50 feeds         | ☐      |
| TC-SUB-033 | Pro: Verify 5 collection limit   | Can create up to 5 collections | ☐      |
| TC-SUB-034 | Plus: Verify 200 feed limit      | Correct limit enforced         | ☐      |
| TC-SUB-035 | Premium: Verify unlimited        | No limits on feeds/collections | ☐      |

---

## 12. Mobile Responsive Testing

### 12.1 Layout Testing

| Test Case  | Device/Viewport  | Steps                    | Expected Result                        | Status |
| ---------- | ---------------- | ------------------------ | -------------------------------------- | ------ |
| TC-MOB-001 | Mobile (375px)   | Load Home page           | Sidebar hidden, hamburger menu visible | ☐      |
| TC-MOB-002 | Mobile (375px)   | Click hamburger menu     | Sidebar slides in as overlay           | ☐      |
| TC-MOB-003 | Mobile (375px)   | Navigate via mobile menu | Page loads, menu closes                | ☐      |
| TC-MOB-004 | Tablet (768px)   | Load Home page           | Responsive layout, content readable    | ☐      |
| TC-MOB-005 | Desktop (1280px) | Load Home page           | Full sidebar visible, 2-column layout  | ☐      |

### 12.2 Touch Interactions

| Test Case  | Steps                            | Expected Result       | Status |
| ---------- | -------------------------------- | --------------------- | ------ |
| TC-MOB-010 | Tap article to open              | Opens in new tab      | ☐      |
| TC-MOB-011 | Tap read/unread toggle           | Status changes        | ☐      |
| TC-MOB-012 | Tap save button                  | Article saved/unsaved | ☐      |
| TC-MOB-013 | Scroll article list              | Smooth scrolling      | ☐      |
| TC-MOB-014 | Swipe to dismiss (if applicable) | Expected behavior     | ☐      |

### 12.3 Form Inputs on Mobile

| Test Case  | Steps                | Expected Result                               | Status |
| ---------- | -------------------- | --------------------------------------------- | ------ |
| TC-MOB-020 | Add feed on mobile   | Keyboard opens, URL input works               | ☐      |
| TC-MOB-021 | Search on mobile     | Keyboard opens, search works                  | ☐      |
| TC-MOB-022 | Login form on mobile | All fields accessible, keyboard doesn't cover | ☐      |

### 12.4 Specific Pages on Mobile

| Test Case  | Page        | Steps              | Expected Result                             | Status |
| ---------- | ----------- | ------------------ | ------------------------------------------- | ------ |
| TC-MOB-030 | Feeds       | View feeds list    | Cards stack vertically, buttons accessible  | ☐      |
| TC-MOB-031 | Pricing     | View pricing tiers | Cards stack vertically, all content visible | ☐      |
| TC-MOB-032 | Settings    | View settings      | All sections accessible                     | ☐      |
| TC-MOB-033 | Collections | View collections   | Cards readable, actions accessible          | ☐      |

---

## 13. Performance Testing

### 13.1 Page Load Times

| Test Case   | Steps                             | Expected Result           | Status |
| ----------- | --------------------------------- | ------------------------- | ------ |
| TC-PERF-001 | Load Home page with 100+ articles | Page loads in < 3 seconds | ☐      |
| TC-PERF-002 | Load Feeds page with 20+ feeds    | Page loads in < 2 seconds | ☐      |
| TC-PERF-003 | Initial app load (cold start)     | App ready in < 5 seconds  | ☐      |
| TC-PERF-004 | Navigation between pages          | Instant/near-instant      | ☐      |

### 13.2 Interaction Response Times

| Test Case   | Steps                  | Expected Result         | Status |
| ----------- | ---------------------- | ----------------------- | ------ |
| TC-PERF-010 | Toggle read status     | UI updates immediately  | ☐      |
| TC-PERF-011 | Save article           | UI updates immediately  | ☐      |
| TC-PERF-012 | Search/filter articles | Results show in < 500ms | ☐      |
| TC-PERF-013 | Keyboard navigation    | Instant response        | ☐      |

### 13.3 Large Data Handling

| Test Case   | Steps                     | Expected Result                 | Status |
| ----------- | ------------------------- | ------------------------------- | ------ |
| TC-PERF-020 | User with 50+ feeds       | No noticeable slowdown          | ☐      |
| TC-PERF-021 | User with 1000+ articles  | Pagination/virtualization works | ☐      |
| TC-PERF-022 | Rapid consecutive actions | No UI freeze                    | ☐      |

---

## 14. Security Testing

### 14.1 Authentication Security

| Test Case  | Steps                               | Expected Result                               | Status |
| ---------- | ----------------------------------- | --------------------------------------------- | ------ |
| TC-SEC-001 | Access protected route without auth | Redirected to auth page                       | ☐      |
| TC-SEC-002 | Inspect JWT token in storage        | Token is properly stored                      | ☐      |
| TC-SEC-003 | Token expiration handling           | User prompted to re-login                     | ☐      |
| TC-SEC-004 | Logout clears session               | Token removed, cannot access protected routes | ☐      |

### 14.2 Data Isolation (Row Level Security)

| Test Case  | Steps                                    | Expected Result               | Status |
| ---------- | ---------------------------------------- | ----------------------------- | ------ |
| TC-SEC-010 | User A tries to access User B's feeds    | Access denied or empty result | ☐      |
| TC-SEC-011 | User A tries to access User B's articles | Access denied or empty result | ☐      |
| TC-SEC-012 | User A tries to delete User B's feed     | Operation fails               | ☐      |

### 14.3 API Security

| Test Case  | Steps                           | Expected Result           | Status |
| ---------- | ------------------------------- | ------------------------- | ------ |
| TC-SEC-020 | API request without auth header | 401 Unauthorized          | ☐      |
| TC-SEC-021 | API request with invalid key    | 401 Unauthorized          | ☐      |
| TC-SEC-022 | Rate limiting enforced          | 429 after exceeding limit | ☐      |

### 14.4 Input Validation

| Test Case  | Steps                   | Expected Result                      | Status |
| ---------- | ----------------------- | ------------------------------------ | ------ |
| TC-SEC-030 | XSS attempt in feed URL | Input sanitized, no script execution | ☐      |
| TC-SEC-031 | SQL injection in search | Input sanitized, no injection        | ☐      |
| TC-SEC-032 | Very long input strings | Handled gracefully, no crash         | ☐      |

---

## 15. Edge Cases & Error Handling

### 15.1 Network Errors

| Test Case   | Steps                         | Expected Result               | Status |
| ----------- | ----------------------------- | ----------------------------- | ------ |
| TC-EDGE-001 | Load app with no internet     | Appropriate error message     | ☐      |
| TC-EDGE-002 | Lose connection during action | Error toast, data preserved   | ☐      |
| TC-EDGE-003 | API timeout                   | Timeout message, retry option | ☐      |

### 15.2 Empty States

| Test Case   | Steps                    | Expected Result                               | Status |
| ----------- | ------------------------ | --------------------------------------------- | ------ |
| TC-EDGE-010 | New user with no feeds   | Empty state with "Add your first feed" prompt | ☐      |
| TC-EDGE-011 | No articles match filter | "No articles found" message                   | ☐      |
| TC-EDGE-012 | No saved articles        | Empty saved page with message                 | ☐      |
| TC-EDGE-013 | No collections           | Empty collections with create prompt          | ☐      |

### 15.3 Invalid Data

| Test Case   | Steps                         | Expected Result                 | Status |
| ----------- | ----------------------------- | ------------------------------- | ------ |
| TC-EDGE-020 | Feed with no articles         | Feed shows with zero count      | ☐      |
| TC-EDGE-021 | Article with missing fields   | Graceful display with fallbacks | ☐      |
| TC-EDGE-022 | Feed that becomes unavailable | Error indicator, retry option   | ☐      |

### 15.4 Concurrent Actions

| Test Case   | Steps                         | Expected Result                        | Status |
| ----------- | ----------------------------- | -------------------------------------- | ------ |
| TC-EDGE-030 | Double-click action buttons   | Single action performed, no errors     | ☐      |
| TC-EDGE-031 | Rapid filter changes          | Final filter applied correctly         | ☐      |
| TC-EDGE-032 | Navigate while action pending | Action completes or cancels gracefully | ☐      |

### 15.5 Session Edge Cases

| Test Case   | Steps                             | Expected Result                   | Status |
| ----------- | --------------------------------- | --------------------------------- | ------ |
| TC-EDGE-040 | Session expires during use        | Graceful redirect to login        | ☐      |
| TC-EDGE-041 | Multiple tabs open                | Sync or appropriate behavior      | ☐      |
| TC-EDGE-042 | Login in one tab, other tab stale | Second tab updates on interaction | ☐      |

---

## 16. Browser Compatibility

### 16.1 Desktop Browsers

| Test Case      | Browser | Version  | Steps           | Expected Result    | Status |
| -------------- | ------- | -------- | --------------- | ------------------ | ------ |
| TC-BROWSER-001 | Chrome  | Latest   | Full test suite | All features work  | ☐      |
| TC-BROWSER-002 | Firefox | Latest   | Full test suite | All features work  | ☐      |
| TC-BROWSER-003 | Safari  | Latest   | Full test suite | All features work  | ☐      |
| TC-BROWSER-004 | Edge    | Latest   | Full test suite | All features work  | ☐      |
| TC-BROWSER-005 | Chrome  | Latest-1 | Core features   | Core features work | ☐      |

### 16.2 Mobile Browsers

| Test Case      | Browser          | Device    | Steps             | Expected Result    | Status |
| -------------- | ---------------- | --------- | ----------------- | ------------------ | ------ |
| TC-BROWSER-010 | Safari           | iPhone 14 | Mobile test suite | All features work  | ☐      |
| TC-BROWSER-011 | Safari           | iPad      | Tablet test suite | All features work  | ☐      |
| TC-BROWSER-012 | Chrome           | Android   | Mobile test suite | All features work  | ☐      |
| TC-BROWSER-013 | Samsung Internet | Android   | Core features     | Core features work | ☐      |

### 16.3 Accessibility

| Test Case   | Steps                               | Expected Result           | Status |
| ----------- | ----------------------------------- | ------------------------- | ------ |
| TC-A11Y-001 | Tab through page elements           | Logical tab order         | ☐      |
| TC-A11Y-002 | Screen reader test (VoiceOver/NVDA) | Elements properly labeled | ☐      |
| TC-A11Y-003 | High contrast mode                  | Content remains readable  | ☐      |
| TC-A11Y-004 | Keyboard-only navigation            | All features accessible   | ☐      |
| TC-A11Y-005 | Zoom to 200%                        | Layout doesn't break      | ☐      |

---

## Appendix A: Test Data Requirements

### Required Test Feeds

| Feed Name   | URL                                            | Purpose               |
| ----------- | ---------------------------------------------- | --------------------- |
| TechCrunch  | https://techcrunch.com/feed/                   | High-volume tech feed |
| The Verge   | https://www.theverge.com/rss/index.xml         | Mixed content feed    |
| Hacker News | https://hnrss.org/newest                       | High-frequency feed   |
| NASA        | https://www.nasa.gov/rss/dyn/breaking_news.rss | Low-volume feed       |

### Test Stripe Cards

| Card Number         | Purpose            |
| ------------------- | ------------------ |
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0341 | Card declined      |
| 4000 0000 0000 9995 | Insufficient funds |

---

## Appendix B: Reporting Template

### Bug Report Format

```
**Bug ID:** [TC-XXX-000]-[YYYYMMDD]-[N]
**Severity:** Critical/High/Medium/Low
**Test Case:** TC-XXX-000
**Environment:** Browser/Device/OS

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Screenshots/Videos:**

**Additional Notes:**
```

### Test Run Summary

```
**Date:** YYYY-MM-DD
**Tester:** Name
**Environment:** Browser/Device/OS
**Build Version:**

**Results:**
- Total Test Cases: XXX
- Passed: XXX (XX%)
- Failed: XXX (XX%)
- Blocked: XXX
- Not Executed: XXX

**Critical Issues:**
-

**Notes:**
-
```

---

## Appendix C: Feature-Subscription Matrix

| Feature          | Free   | Pro     | Plus    | Premium   |
| ---------------- | ------ | ------- | ------- | --------- |
| Feed Limit       | 5      | 50      | 200     | Unlimited |
| Collections      | ❌     | 5       | 20      | Unlimited |
| Article History  | 7 days | 30 days | 90 days | Unlimited |
| API Access       | ❌     | ❌      | ❌      | ✅        |
| API Rate Limit   | N/A    | N/A     | N/A     | 2,000/hr  |
| RSS Export       | ❌     | ✅      | ✅      | ✅        |
| Categories       | ❌     | ✅      | ✅      | ✅        |
| Priority Support | ❌     | ❌      | ✅      | ✅        |

---

_End of QA Testing Plan_
