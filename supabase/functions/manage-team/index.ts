import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const err = (msg: string, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status })

const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

const SEAT_LIMITS: Record<string, number> = {
  team: 5,
  team_pro: 15,
  team_business: 30,
}

/**
 * Check whether a team has room for another member.
 * Looks up the team owner's plan and compares current member count against the cap.
 */
async function checkSeatLimit(
  sb: ReturnType<typeof createClient>,
  teamId: string,
): Promise<{ allowed: boolean; message: string }> {
  const { data: team } = await sb.from("teams").select("owner_id").eq("id", teamId).single()
  if (!team) return { allowed: false, message: "Team not found" }

  const { data: sub } = await sb.from("subscriptions").select("plan_id").eq("user_id", team.owner_id).single()
  const planId = sub?.plan_id ?? ""
  const maxSeats = SEAT_LIMITS[planId]
  if (maxSeats === undefined) return { allowed: false, message: "Team owner does not have a valid Team plan" }

  const { count } = await sb.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId)
  if ((count ?? 0) >= maxSeats) {
    return { allowed: false, message: `Team is at its ${maxSeats}-seat limit. Upgrade to add more members.` }
  }
  return { allowed: true, message: "" }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const authHeader = req.headers.get("Authorization") ?? ""

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser()
    if (authErr || !user) return err("Unauthorized", 401)

    const sb = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const { action } = body

    // Team plan check ("get" and "accept" are exempt so every user can
    // check for pending invites / existing membership without a team plan)
    if (action !== "accept" && action !== "get") {
      const { data: sub } = await sb.from("subscriptions").select("plan_id").eq("user_id", user.id).single()
      const teamPlanIds = ["team", "team_pro", "team_business"]
      if (!teamPlanIds.includes(sub?.plan_id ?? "")) return err("Team Workspaces require a Team plan", 403)
    }

    if (action === "create") {
      const { name } = body
      if (!name?.trim()) return err("Team name is required")
      const { data: team, error: tErr } = await sb.from("teams").insert({ name: name.trim(), owner_id: user.id }).select().single()
      if (tErr) return err(tErr.message)
      await sb.from("team_members").insert({ team_id: team.id, user_id: user.id, role: "owner" })
      return ok({ team })
    }

    if (action === "get") {
      // Get team where user is a member
      const { data: membership } = await sb.from("team_members").select("team_id, role").eq("user_id", user.id).single()
      // Get pending invites for the user's email
      const { data: userData } = await sb.auth.admin.getUserById(user.id)
      const userEmail = userData?.user?.email ?? ""
      const { data: pendingInvites } = await sb.from("team_invites").select("*, teams(name)").eq("email", userEmail).eq("status", "pending")

      if (!membership) return ok({ team: null, members: [], invites: [], pendingInvites: pendingInvites ?? [] })

      const [{ data: team }, { data: members }, { data: invites }] = await Promise.all([
        sb.from("teams").select("*").eq("id", membership.team_id).single(),
        sb.from("team_members").select("*, user:user_id(email:raw_user_meta_data->email)").eq("team_id", membership.team_id),
        sb.from("team_invites").select("*").eq("team_id", membership.team_id).eq("status", "pending"),
      ])
      return ok({ team, members, invites, pendingInvites: [], myRole: membership.role })
    }

    if (action === "update") {
      const { team_id, name } = body
      const { data: m } = await sb.from("team_members").select("role").eq("team_id", team_id).eq("user_id", user.id).single()
      if (!m || !["owner", "admin"].includes(m.role)) return err("Only owner/admin can rename the team", 403)
      const { data: team, error: uErr } = await sb
        .from("teams")
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq("id", team_id)
        .select()
        .single()
      if (uErr) return err(uErr.message)
      return ok({ team })
    }

    if (action === "invite") {
      const { team_id, email, role = "member" } = body
      if (!email?.trim()) return err("Email is required")
      const { data: m } = await sb.from("team_members").select("role").eq("team_id", team_id).eq("user_id", user.id).single()
      if (!m || !["owner", "admin"].includes(m.role)) return err("Only owner/admin can invite members", 403)

      const seatCheck = await checkSeatLimit(sb, team_id)
      if (!seatCheck.allowed) return err(seatCheck.message, 403)

      const { data: invite, error: iErr } = await sb
        .from("team_invites")
        .upsert({ team_id, invited_by: user.id, email: email.trim().toLowerCase(), role }, { onConflict: "team_id,email" })
        .select()
        .single()
      if (iErr) return err(iErr.message)
      return ok({ invite })
    }

    if (action === "accept") {
      const { token } = body
      const { data: invite, error: iErr } = await sb.from("team_invites").select("*").eq("token", token).eq("status", "pending").single()
      if (iErr || !invite) return err("Invalid or expired invite")
      if (new Date(invite.expires_at) < new Date()) {
        await sb.from("team_invites").update({ status: "expired" }).eq("id", invite.id)
        return err("This invite has expired")
      }

      const seatCheck = await checkSeatLimit(sb, invite.team_id)
      if (!seatCheck.allowed) return err(seatCheck.message, 403)

      await Promise.all([
        sb.from("team_members").upsert({ team_id: invite.team_id, user_id: user.id, role: invite.role }, { onConflict: "team_id,user_id" }),
        sb.from("team_invites").update({ status: "accepted" }).eq("id", invite.id),
      ])
      return ok({ success: true, team_id: invite.team_id })
    }

    if (action === "remove-member") {
      const { team_id, member_user_id } = body
      const { data: m } = await sb.from("team_members").select("role").eq("team_id", team_id).eq("user_id", user.id).single()
      if (!m || !["owner", "admin"].includes(m.role)) return err("Only owner/admin can remove members", 403)
      const { data: target } = await sb.from("team_members").select("role").eq("team_id", team_id).eq("user_id", member_user_id).single()
      if (target?.role === "owner") return err("Cannot remove the team owner")
      await sb.from("team_members").delete().eq("team_id", team_id).eq("user_id", member_user_id)
      return ok({ success: true })
    }

    if (action === "leave") {
      const { data: m } = await sb.from("team_members").select("team_id, role").eq("user_id", user.id).single()
      if (!m) return err("You are not in a team")
      if (m.role === "owner") return err("Owner must delete the team or transfer ownership before leaving")
      await sb.from("team_members").delete().eq("team_id", m.team_id).eq("user_id", user.id)
      return ok({ success: true })
    }

    if (action === "delete") {
      const { team_id } = body
      const { data: team } = await sb.from("teams").select("owner_id").eq("id", team_id).single()
      if (team?.owner_id !== user.id) return err("Only the team owner can delete the team", 403)
      await sb.from("teams").delete().eq("id", team_id)
      return ok({ success: true })
    }

    if (action === "cancel-invite") {
      const { invite_id, team_id } = body
      const { data: m } = await sb.from("team_members").select("role").eq("team_id", team_id).eq("user_id", user.id).single()
      if (!m || !["owner", "admin"].includes(m.role)) return err("Only owner/admin can cancel invites", 403)
      await sb.from("team_invites").delete().eq("id", invite_id)
      return ok({ success: true })
    }

    return err("Unknown action")
  } catch (e) {
    console.error("manage-team error:", e)
    return err("Internal server error", 500)
  }
})
