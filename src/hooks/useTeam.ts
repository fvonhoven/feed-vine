import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { useAuth } from "./useAuth"
import toast from "react-hot-toast"
import type { Team, TeamMember, TeamInvite } from "../types/database"

interface TeamData {
  team: Team | null
  members: (TeamMember & { user?: { email?: string } })[]
  invites: TeamInvite[]
  pendingInvites: (TeamInvite & { teams?: { name: string } })[]
  myRole: "owner" | "admin" | "member" | null
}

async function invokeTeam(action: string, body: Record<string, unknown> = {}): Promise<TeamData & { success?: boolean; team_id?: string }> {
  const { data, error } = await supabase.functions.invoke("manage-team", { body: { action, ...body } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export function useTeam() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["team", user?.id],
    queryFn: () => invokeTeam("get") as Promise<TeamData>,
    enabled: !!user,
    staleTime: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team", user?.id] })

  const createTeam = useMutation({
    mutationFn: (name: string) => invokeTeam("create", { name }),
    onSuccess: () => { invalidate(); toast.success("Team created!") },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateTeam = useMutation({
    mutationFn: ({ team_id, name }: { team_id: string; name: string }) => invokeTeam("update", { team_id, name }),
    onSuccess: () => { invalidate(); toast.success("Team name updated!") },
    onError: (e: Error) => toast.error(e.message),
  })

  const inviteMember = useMutation({
    mutationFn: ({ team_id, email, role }: { team_id: string; email: string; role?: string }) =>
      invokeTeam("invite", { team_id, email, role }),
    onSuccess: () => { invalidate(); toast.success("Invite sent!") },
    onError: (e: Error) => toast.error(e.message),
  })

  const acceptInvite = useMutation({
    mutationFn: (token: string) => invokeTeam("accept", { token }),
    onSuccess: () => { invalidate(); toast.success("You've joined the team!") },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMember = useMutation({
    mutationFn: ({ team_id, member_user_id }: { team_id: string; member_user_id: string }) =>
      invokeTeam("remove-member", { team_id, member_user_id }),
    onSuccess: () => { invalidate(); toast.success("Member removed") },
    onError: (e: Error) => toast.error(e.message),
  })

  const leaveTeam = useMutation({
    mutationFn: () => invokeTeam("leave"),
    onSuccess: () => { invalidate(); toast.success("You've left the team") },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteTeam = useMutation({
    mutationFn: (team_id: string) => invokeTeam("delete", { team_id }),
    onSuccess: () => { invalidate(); toast.success("Team deleted") },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelInvite = useMutation({
    mutationFn: ({ invite_id, team_id }: { invite_id: string; team_id: string }) =>
      invokeTeam("cancel-invite", { invite_id, team_id }),
    onSuccess: () => { invalidate(); toast.success("Invite cancelled") },
    onError: (e: Error) => toast.error(e.message),
  })

  return {
    team: data?.team ?? null,
    members: data?.members ?? [],
    invites: data?.invites ?? [],
    pendingInvites: data?.pendingInvites ?? [],
    myRole: data?.myRole ?? null,
    isLoading,
    createTeam,
    updateTeam,
    inviteMember,
    acceptInvite,
    removeMember,
    leaveTeam,
    deleteTeam,
    cancelInvite,
  }
}

