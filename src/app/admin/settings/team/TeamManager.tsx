'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, ChevronDown } from 'lucide-react';

interface MemberProfile {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface TeamMember {
  id: number;
  user_id: string;
  role: 'owner' | 'manager' | 'staff';
  store_ids: number[];
  invited_at: string;
  accepted_at: string | null;
  profiles: MemberProfile;
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'bg-blue-100', text: 'text-blue-700' },
  manager: { bg: 'bg-amber-100', text: 'text-amber-700' },
  staff: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' });
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/admin/team');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMembers(data.members || []);
        setCurrentUserId(data.currentUserId);
        setCurrentRole(data.currentRole);
      }
    } catch {
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to invite member');
      } else {
        setSuccess(`Invitation sent to ${inviteForm.email}`);
        setInviteForm({ email: '', role: 'staff' });
        setShowInvite(false);
        fetchMembers();
      }
    } catch {
      setError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: number, role: string) {
    setError(null);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update role');
      } else {
        fetchMembers();
      }
    } catch {
      setError('Failed to update role');
    }
  }

  async function handleRemove(memberId: number) {
    setError(null);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to remove member');
      } else {
        setConfirmDelete(null);
        fetchMembers();
      }
    } catch {
      setError('Failed to remove member');
    }
  }

  if (loading) return <div className="text-gray-400">Loading team members...</div>;

  const canInvite = currentRole === 'owner' || currentRole === 'manager';
  const isOwner = currentRole === 'owner';

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
        {canInvite && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Invite a Team Member</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="relative">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm appearance-none bg-white pr-8"
              >
                {isOwner && <option value="manager">Manager</option>}
                <option value="staff">Staff</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {inviteForm.role === 'manager'
                ? 'Managers can manage reviews, templates, and invite staff.'
                : 'Staff can view and respond to reviews assigned to them.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={!inviteForm.email.trim() || inviting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Joined
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const profile = member.profiles;
                const isCurrentUser = member.user_id === currentUserId;
                const badge = ROLE_BADGE[member.role] || ROLE_BADGE.staff;
                const isPending = !member.accepted_at;

                return (
                  <tr key={member.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm font-medium shrink-0">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            (profile?.display_name || profile?.email || '?')
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {profile?.display_name || profile?.email?.split('@')[0] || 'Unknown'}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                                You
                              </span>
                            )}
                            {isPending && (
                              <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded font-medium">
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner && !isCurrentUser ? (
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 appearance-none cursor-pointer pr-6 ${badge.bg} ${badge.text}`}
                          >
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      ) : (
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">
                        {member.accepted_at
                          ? new Date(member.accepted_at).toLocaleDateString()
                          : member.invited_at
                            ? `Invited ${new Date(member.invited_at).toLocaleDateString()}`
                            : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOwner && !isCurrentUser && (
                        <>
                          {confirmDelete === member.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRemove(member.id)}
                                className="px-3 py-1 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(member.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No team members yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Invite your team to help manage reviews
          </p>
          {canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-800">Role Permissions</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE.owner.bg} ${ROLE_BADGE.owner.text} shrink-0 mt-0.5`}>
              Owner
            </span>
            <span>Full access: billing, settings, team management, all stores</span>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE.manager.bg} ${ROLE_BADGE.manager.text} shrink-0 mt-0.5`}>
              Manager
            </span>
            <span>Manage reviews, templates, invite staff, all stores</span>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE.staff.bg} ${ROLE_BADGE.staff.text} shrink-0 mt-0.5`}>
              Staff
            </span>
            <span>View and respond to assigned reviews only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
