# Testing hCaptcha Integration

## Current Status

- ✅ hCaptcha component created
- ✅ Site key added to `.env`: `61527780-e412-4598-8530-795cd968009c`
- ✅ Component integrated into AuthPage
- ✅ Dev server running at http://localhost:3000/

## Issue: White Screen

The "white screen" you're seeing when checking the terms box is likely the hCaptcha iframe loading.

### What to Check:

1. **Open Browser DevTools** (F12 or Cmd+Option+I)
2. **Go to Console tab**
3. **Look for errors** related to:
   - hCaptcha
   - CORS
   - Script loading
   - CSP (Content Security Policy)

### Common Issues:

#### Issue 1: hCaptcha iframe is white/blank
**Cause**: Normal loading state
**Solution**: Wait 1-2 seconds for it to fully load

#### Issue 2: Console error: "Refused to frame..."
**Cause**: CSP blocking hCaptcha
**Solution**: Already fixed in `netlify.toml` (will work in production)

#### Issue 3: Console error: "Invalid site key"
**Cause**: Wrong site key
**Solution**: Verify key in hCaptcha dashboard matches `.env`

#### Issue 4: Console error: "hcaptcha is not defined"
**Cause**: Script not loaded
**Solution**: Check network tab for failed script loads

## Testing Steps:

### Step 1: Visit Signup Page
```
http://localhost:3000/auth
```

### Step 2: Click "Sign up" tab

### Step 3: Fill in form
- Email: test@example.com
- Password: password123
- ✅ Check "I agree to terms"

### Step 4: Wait for hCaptcha
- You should see a checkbox or challenge
- If you see a white box, wait 2-3 seconds

### Step 5: Complete CAPTCHA
- Click the checkbox
- Complete any challenge if shown

### Step 6: Try to submit
- Button should be disabled until CAPTCHA is complete
- After CAPTCHA, button should be enabled

## Expected Behavior:

### Before CAPTCHA:
- Sign up button is **disabled**
- Gray/dimmed appearance

### After CAPTCHA:
- Sign up button is **enabled**
- Blue/primary color

## Debugging:

### Check if hCaptcha script loaded:
Open Console and type:
```javascript
window.hcaptcha
```

Should return an object with methods like `render`, `reset`, etc.

### Check if widget rendered:
```javascript
document.querySelector('.h-captcha')
```

Should return the hCaptcha container div.

### Check for iframe:
```javascript
document.querySelector('iframe[src*="hcaptcha"]')
```

Should return the hCaptcha iframe.

## Temporary Workaround (for testing):

If hCaptcha is causing issues, you can temporarily use the test key that always passes:

In `.env`, change:
```bash
VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

This is hCaptcha's official test key that always passes without user interaction.

## Production Deployment:

Once you deploy to Netlify:
1. CSP headers will be applied (allowing hCaptcha)
2. hCaptcha should work perfectly
3. Remember to add the site key to Netlify environment variables

## Next Steps:

1. Check browser console for errors
2. Share any error messages you see
3. Try the test key if needed
4. Deploy to production to test with real CSP headers

