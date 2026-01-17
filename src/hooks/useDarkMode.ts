import { useState, useEffect } from "react"

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem("darkMode")
    if (stored !== null) {
      return stored === "true"
    }
    // Fall back to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    // Persist to localStorage
    localStorage.setItem("darkMode", String(isDark))
  }, [isDark])

  const toggle = () => setIsDark(!isDark)

  return { isDark, toggle }
}

