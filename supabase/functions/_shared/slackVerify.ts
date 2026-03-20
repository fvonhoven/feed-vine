/**
 * Verify Slack request signature (X-Slack-Signature)
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(
  signingSecret: string,
  signature: string | null,
  timestamp: string | null,
  rawBody: string
): Promise<boolean> {
  if (!signature || !timestamp || !signingSecret) return false

  const sig = signature.startsWith("v0=") ? signature.slice(3) : signature
  if (sig.length !== 64 || !/^[a-f0-9]+$/i.test(sig)) return false

  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > 300) return false

  const base = `v0:${timestamp}:${rawBody}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base))
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return computed === sig.toLowerCase()
}
