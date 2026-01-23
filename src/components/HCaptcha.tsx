import { useEffect, useRef, useState, memo } from "react"

interface HCaptchaProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: "light" | "dark"
}

declare global {
  interface Window {
    hcaptcha: {
      render: (container: string | HTMLElement, params: any) => string
      reset: (widgetId: string) => void
      execute: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    hcaptchaOnLoad?: () => void
  }
}

// Global flag to prevent multiple renders
let isHCaptchaRendering = false

function HCaptchaComponent({ siteKey, onVerify, onError, onExpire, theme = "light" }: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [containerId] = useState(() => `hcaptcha-${Math.random().toString(36).substring(7)}`)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const renderCaptcha = () => {
      if (!containerRef.current || !window.hcaptcha) {
        return
      }

      if (widgetIdRef.current || isHCaptchaRendering) {
        return
      }

      // Check if this container already has a rendered captcha
      const hasIframe = containerRef.current.querySelector("iframe[src*='hcaptcha']")
      if (hasIframe) {
        return
      }

      // Completely clear the container
      containerRef.current.innerHTML = ""

      // Remove any hcaptcha data attributes
      const attributes = Array.from(containerRef.current.attributes)
      attributes.forEach(attr => {
        if (attr.name.startsWith("data-hcaptcha")) {
          containerRef.current!.removeAttribute(attr.name)
        }
      })

      isHCaptchaRendering = true

      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
        })
      } catch (error: any) {
        // Only log non-duplicate errors
        if (!error?.message?.includes("Only one captcha")) {
          console.error("hCaptcha render error:", error)
        }
      } finally {
        isHCaptchaRendering = false
      }
    }

    // Load script if not already loaded
    const existingScript = document.querySelector('script[src="https://js.hcaptcha.com/1/api.js"]')

    if (!existingScript) {
      const script = document.createElement("script")
      script.src = "https://js.hcaptcha.com/1/api.js"
      script.async = true
      script.defer = true
      script.onload = () => {
        // Small delay to ensure hcaptcha is fully initialized
        timeoutId = setTimeout(renderCaptcha, 100)
      }
      document.head.appendChild(script)
    } else if (window.hcaptcha) {
      // Script already loaded, render with small delay
      timeoutId = setTimeout(renderCaptcha, 100)
    } else {
      // Script exists but not loaded yet
      const handleLoad = () => {
        timeoutId = setTimeout(renderCaptcha, 100)
      }
      existingScript.addEventListener("load", handleLoad)
      return () => {
        existingScript.removeEventListener("load", handleLoad)
        clearTimeout(timeoutId)
      }
    }

    return () => {
      clearTimeout(timeoutId)
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch (error) {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, theme, onVerify, onError, onExpire])

  return <div ref={containerRef} id={containerId} className="h-captcha" />
}

// Memoize the component to prevent unnecessary re-renders
export const HCaptcha = memo(HCaptchaComponent)
