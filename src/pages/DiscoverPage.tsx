import { Navigate } from "react-router-dom"

/** @deprecated Use `/explore?tab=feeds` */
export default function DiscoverPage() {
  return <Navigate to="/explore?tab=feeds" replace />
}
