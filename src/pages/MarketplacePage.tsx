import { Navigate } from "react-router-dom"

/** @deprecated Use `/explore` (collections tab is default) */
export default function MarketplacePage() {
  return <Navigate to="/explore" replace />
}
