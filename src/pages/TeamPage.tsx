import { useState } from "react"
import { Link } from "react-router-dom"
import { useSubscription } from "../hooks/useSubscription"
import { useTeam } from "../hooks/useTeam"

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    admin: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    member: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[role] ?? colors.member}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

export default function TeamPage() {
  const { hasFeature } = useSubscription()
  const { team, members, invites, myRole, isLoading, createTeam, updateTeam, inviteMember, removeMember, leaveTeam, deleteTeam, cancelInvite } =
    useTeam()

  const [newTeamName, setNewTeamName] = useState("")
  const [editName, setEditName] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")

  const canManage = myRole === "owner" || myRole === "admin"

  if (!hasFeature("teamWorkspaces")) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="text-6xl mb-6">👥</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Team Workspaces</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Collaborate with your content team — share feeds, coordinate digests, and manage members.
        </p>
        <p className="text-gray-500 dark:text-gray-500 mb-8">
          Available on the <span className="font-semibold text-primary-600">Team plan</span> ($99/mo, 5 seats).
        </p>
        <Link
          to="/pricing"
          className="inline-block px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
        >
          Upgrade to Team — $99/mo
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Your Team</h1>
          <p className="text-gray-600 dark:text-gray-400">Give your team a name to get started.</p>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (newTeamName.trim()) createTeam.mutate(newTeamName.trim())
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="e.g. Acme Content Team"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={createTeam.isPending || !newTeamName.trim()}
            className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {createTeam.isPending ? "Creating…" : "Create Team"}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        {isEditing ? (
          <form
            onSubmit={e => {
              e.preventDefault()
              updateTeam.mutate({ team_id: team.id, name: editName })
              setIsEditing(false)
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="px-4 py-1 bg-primary-600 text-white rounded-lg text-sm font-medium">
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            {canManage && (
              <button
                onClick={() => {
                  setEditName(team.name)
                  setIsEditing(true)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Rename team"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">{members.length} / 5 seats</span>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Members</h2>
        <div className="space-y-2">
          {members.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                  {(m.user as any)?.email?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{(m.user as any)?.email ?? m.user_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={m.role} />
                {canManage && m.role !== "owner" && (
                  <button
                    onClick={() => {
                      if (confirm("Remove this member?")) removeMember.mutate({ team_id: team.id, member_user_id: m.user_id })
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors ml-2"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invite */}
      {canManage && members.length < 5 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invite Member</h2>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (inviteEmail.trim()) {
                inviteMember.mutate({ team_id: team.id, email: inviteEmail.trim(), role: inviteRole })
                setInviteEmail("")
              }
            }}
            className="flex gap-2"
          >
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as "member" | "admin")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviteMember.isPending || !inviteEmail.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {inviteMember.isPending ? "Sending…" : "Send Invite"}
            </button>
          </form>
        </section>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Invites</h2>
          <div className="space-y-2">
            {invites.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{inv.email}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({inv.role})</span>
                </div>
                {canManage && (
                  <button
                    onClick={() => cancelInvite.mutate({ invite_id: inv.id, team_id: team.id })}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="border border-red-200 dark:border-red-900/40 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">Danger Zone</h2>
        <div className="flex flex-wrap gap-3">
          {myRole !== "owner" && (
            <button
              onClick={() => {
                if (confirm("Leave this team? You'll lose access to shared resources.")) leaveTeam.mutate()
              }}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Leave Team
            </button>
          )}
          {myRole === "owner" && (
            <button
              onClick={() => {
                if (confirm("Delete this team permanently? All members will lose access.")) deleteTeam.mutate(team.id)
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Delete Team
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
