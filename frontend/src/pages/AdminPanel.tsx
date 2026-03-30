import { useState, useEffect, useCallback } from 'react'
import {
  listUsers, createUser, updateUser, deleteUser,
  getUserCards, setUserCards as saveUserCards,
  type UserRecord, type CardItem,
} from '../api/admin'

const GROUP_ORDER = ['Actions', 'Summary Cards', 'Charts', 'Compare Page']

export default function AdminPanel() {
  const [users, setUsers]           = useState<UserRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')

  // Selected user for permission editing
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [userCards, setUserCards]       = useState<CardItem[]>([])
  const [localCards, setLocalCards]     = useState<Record<string, boolean>>({})
  const [cardsLoading, setCardsLoading] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saveOk, setSaveOk]             = useState(false)

  // Add/Edit modal
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null)
  const [form, setForm]           = useState({ name: '', email: '', password: '', job_role: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const list = await listUsers()
      setUsers(list)
      if (selectedUser) {
        const updated = list.find(u => u.id === selectedUser.id)
        if (updated) setSelectedUser(updated)
      }
    } catch (e: any) {
      setLoadError(e.message ?? 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [selectedUser])

  useEffect(() => { loadUsers() }, []) // eslint-disable-line

  async function selectUser(u: UserRecord) {
    setSelectedUser(u)
    setCardsLoading(true)
    setSaveOk(false)
    try {
      const res = await getUserCards(u.id)
      setUserCards(res.cards)
      setLocalCards(Object.fromEntries(res.cards.map(c => [c.key, c.visible])))
    } finally {
      setCardsLoading(false)
    }
  }

  async function handleSaveCards() {
    if (!selectedUser) return
    setSaving(true)
    setSaveOk(false)
    try {
      const res = await saveUserCards(selectedUser.id, localCards)
      setUserCards(res.cards)
      setLocalCards(Object.fromEntries(res.cards.map(c => [c.key, c.visible])))
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  function openAdd() {
    setForm({ name: '', email: '', password: '', job_role: '' })
    setFormError('')
    setEditTarget(null)
    setModal('add')
  }

  function openEdit(u: UserRecord) {
    setForm({ name: u.name, email: u.email, password: '', job_role: u.job_role })
    setFormError('')
    setEditTarget(u)
    setModal('edit')
  }

  async function handleSaveUser() {
    if (!form.name || !form.email || !form.job_role || (!editTarget && !form.password)) {
      setFormError('All fields are required')
      return
    }
    setFormLoading(true)
    setFormError('')
    try {
      if (editTarget) {
        const p: any = { name: form.name, email: form.email, job_role: form.job_role }
        if (form.password) p.password = form.password
        await updateUser(editTarget.id, p)
      } else {
        await createUser(form)
      }
      setModal(null)
      loadUsers()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: number) {
    await deleteUser(id)
    setDeleteId(null)
    if (selectedUser?.id === id) { setSelectedUser(null); setUserCards([]) }
    loadUsers()
  }

  // Group cards by group field
  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    cards: userCards.filter(c => c.group === g),
  })).filter(g => g.cards.length > 0)

  const enabledCount = userCards.filter(c => localCards[c.key] !== false).length

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6 min-h-[calc(100vh-56px)]">

      {/* ── LEFT PANEL: User list ────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Users</h1>
            <p className="text-xs text-slate-500 mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-slate-600 py-8 text-center">Loading…</div>
        ) : loadError ? (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {loadError}
          </div>
        ) : users.length === 0 ? (
          <div className="text-xs text-slate-600 py-8 text-center">No users yet.</div>
        ) : (
          <div className="space-y-1.5">
            {users.map(u => (
              <div key={u.id}
                onClick={() => selectUser(u)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedUser?.id === u.id
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-[#0d1525] border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  selectedUser?.id === u.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{u.name}</div>
                  <div className="text-xs text-slate-500 truncate">{u.job_role}</div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(u)}
                    className="p-1 rounded text-slate-600 hover:text-blue-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  {deleteId === u.id ? (
                    <>
                      <button onClick={() => handleDelete(u.id)}
                        className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded transition-all">✓</button>
                      <button onClick={() => setDeleteId(null)}
                        className="px-1.5 py-0.5 text-slate-500 text-xs rounded">✕</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteId(u.id)}
                      className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Card permissions ───────────────────────────────── */}
      <div className="flex-1">
        {!selectedUser ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
            <p className="text-sm">Select a user to manage their dashboard access</p>
          </div>
        ) : (
          <div className="bg-[#0d1525] border border-slate-800/80 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{selectedUser.name}</div>
                  <div className="text-xs text-slate-500">{selectedUser.email} · <span className="text-blue-400">{selectedUser.job_role}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {enabledCount}/{userCards.length} cards enabled
                </span>
                {saveOk && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    Saved
                  </span>
                )}
                <button onClick={handleSaveCards} disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Card groups */}
            {cardsLoading ? (
              <div className="py-12 text-center text-slate-600 text-xs">Loading permissions…</div>
            ) : (
              <div className="p-6 space-y-6">
                {grouped.map(({ group, cards }) => (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group}</span>
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-xs text-slate-600">
                        {cards.filter(c => localCards[c.key] !== false).length}/{cards.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {cards.map(card => {
                        const on = localCards[card.key] !== false
                        return (
                          <button key={card.key} type="button"
                            onClick={() => setLocalCards(p => ({ ...p, [card.key]: !on }))}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                              on
                                ? 'bg-emerald-500/5 border-emerald-500/25 hover:bg-emerald-500/10'
                                : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                            }`}>
                            <div>
                              <div className={`text-xs font-medium ${on ? 'text-slate-200' : 'text-slate-500'}`}>
                                {card.label}
                              </div>
                              <div className={`text-xs mt-0.5 ${on ? 'text-emerald-500' : 'text-slate-600'}`}>
                                {on ? 'Visible' : 'Hidden'}
                              </div>
                            </div>
                            {/* Toggle pill */}
                            <div className={`w-9 h-5 rounded-full flex-shrink-0 ml-3 relative transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit User Modal ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-[#0d1525] border border-slate-700/80 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-white">{modal === 'edit' ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3.5">
              {[
                { field: 'name',     label: 'Full Name',  type: 'text',     placeholder: '' },
                { field: 'email',    label: 'Email',      type: 'email',    placeholder: '' },
                { field: 'job_role', label: 'Job Role',   type: 'text',     placeholder: 'e.g. Finance, DevOps, Manager' },
                { field: 'password', label: modal === 'edit' ? 'New Password (leave blank to keep)' : 'Password', type: 'password', placeholder: '••••••••' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                  <input type={type}
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100
                               placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              ))}
            </div>

            {formError && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-all">
                Cancel
              </button>
              <button onClick={handleSaveUser} disabled={formLoading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all">
                {formLoading ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
