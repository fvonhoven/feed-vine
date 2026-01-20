import { useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if user agreed to terms when signing up
    if (isSignUp && !agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy")
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast.success("Account created! Please check your email to verify.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success("Signed in successfully!")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center mb-6 hover:opacity-80 transition-opacity">
            <svg className="w-24 h-24 text-primary-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 4L4 12L20 20L36 12L20 4Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <span className="text-primary-600 dark:text-primary-400">FeedVine</span>
            </Link>
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">{isSignUp ? "Create your account" : "Sign in to your account"}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm autofill:bg-white autofill:text-gray-900 dark:autofill:bg-gray-800 dark:autofill:text-white"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm autofill:bg-white autofill:text-gray-900 dark:autofill:bg-gray-800 dark:autofill:text-white"
                placeholder="Password"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 rounded cursor-pointer accent-primary-600"
                  style={{ colorScheme: "light" }}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary-600 hover:text-primary-500 underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="text-primary-600 hover:text-primary-500 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (isSignUp && !agreedToTerms)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAgreedToTerms(false) // Reset checkbox when switching modes
              }}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
