#!/usr/bin/env node

/**
 * Test CronNarc Ping for FeedVine RSS Fetch
 * This script tests that the fetch-rss function successfully pings CronNarc
 */

const SUPABASE_URL = 'https://jrjotduzvzbslnbhswxo.supabase.co'
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fetch-rss`
const CRONNARC_PING_URL = 'https://cronnarc.com/api/ping/feedvine-rss-fetch-1768922436574'

// Get anon key from environment or command line
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.argv[2]

console.log('🧪 Testing CronNarc Ping for FeedVine RSS Fetch')
console.log('================================================\n')

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY not provided\n')
  console.error('Usage:')
  console.error('  node test-cronnarc-ping.js YOUR_ANON_KEY')
  console.error('  OR')
  console.error('  export SUPABASE_ANON_KEY=your-anon-key && node test-cronnarc-ping.js\n')
  process.exit(1)
}

console.log(`📍 Function URL: ${FUNCTION_URL}`)
console.log(`📍 CronNarc Ping URL: ${CRONNARC_PING_URL}\n`)

async function testDirectPing() {
  console.log('Step 1: Testing direct ping to CronNarc...')
  try {
    const response = await fetch(CRONNARC_PING_URL)
    const text = await response.text()
    
    if (response.ok) {
      console.log(`✅ Direct ping successful (HTTP ${response.status})`)
      console.log(`   Response: ${text}`)
    } else {
      console.log(`⚠️  Direct ping returned HTTP ${response.status}`)
      console.log(`   Response: ${text}`)
    }
  } catch (error) {
    console.error(`❌ Direct ping failed: ${error.message}`)
  }
  console.log('')
}

async function testFetchRssFunction() {
  console.log('Step 2: Calling fetch-rss Edge Function...')
  console.log('(This will fetch all RSS feeds and ping CronNarc)\n')
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Function executed successfully (HTTP ${response.status})\n`)
      console.log('Response:')
      console.log(JSON.stringify(data, null, 2))
      return true
    } else {
      console.error(`❌ Function failed (HTTP ${response.status})\n`)
      console.error('Response:')
      console.error(JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.error(`❌ Function call failed: ${error.message}`)
    return false
  }
}

async function verifyPing() {
  console.log('\nStep 3: Verifying CronNarc received the ping...')
  console.log('(Waiting 2 seconds...)')
  
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    const response = await fetch(CRONNARC_PING_URL)
    const text = await response.text()
    
    if (response.ok) {
      console.log(`✅ CronNarc ping verified (HTTP ${response.status})`)
      console.log(`   Response: ${text}`)
    } else {
      console.log(`⚠️  Verification returned HTTP ${response.status}`)
      console.log(`   Response: ${text}`)
    }
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`)
  }
}

async function main() {
  await testDirectPing()
  const success = await testFetchRssFunction()
  
  if (success) {
    await verifyPing()
  }
  
  console.log('\n================================================')
  console.log('✅ Test Complete!\n')
  console.log('Next steps:')
  console.log('1. Check your CronNarc dashboard at https://cronnarc.com')
  console.log('2. Verify the "feedvine-rss-fetch" monitor shows recent activity')
  console.log('3. The cron job will automatically ping every hour\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

