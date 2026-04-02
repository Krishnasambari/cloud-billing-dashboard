// import { useState, useEffect, lazy, Suspense } from 'react'
// const Dashboard     = lazy(() => import('./pages/Dashboard'))
// const ComparePage   = lazy(() => import('./pages/ComparePage'))
// const LoginPage     = lazy(() => import('./pages/LoginPage'))
// const AdminPanel    = lazy(() => import('./pages/AdminPanel'))
// const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
// import SyncButton from './components/ui/SyncButton'
// import { getStoredToken, getStoredUser, clearAuth, fetchMe, fetchMyCards, type AuthUser } from './api/auth'
// import { fetchProfiles } from './api/sync'

// type Page = 'dashboard' | 'compare' | 'resources'

// export default function App() {
//   const [user, setUser]                       = useState<AuthUser | null>(null)
//   const [authChecked, setAuthChecked]         = useState(false)
//   const [cards, setCards]                     = useState<Record<string, boolean>>({})
//   const [page, setPage]                       = useState<Page>('dashboard')
//   const [reloadKey, setReloadKey]             = useState(0)
//   const [selectedProfile, setSelectedProfile] = useState('')
//   const [syncedProfiles, setSyncedProfiles]   = useState<string[]>([])
//   const [configuredProfiles, setConfiguredProfiles] = useState<string[]>([])

//   const loadProfiles = async () => {
//     try {
//       const p = await fetchProfiles()
//       setConfiguredProfiles(p.configured)
//       setSyncedProfiles(p.synced)
//       // Auto-select first configured profile if current selection isn't valid
//       setSelectedProfile(prev =>
//         p.configured.includes(prev) ? prev : (p.configured[0] ?? prev)
//       )
//     } catch { /* ignore */ }
//   }

//   useEffect(() => {
//     // Load AWS profiles immediately (public endpoint — no auth needed)
//     loadProfiles()

//     const token  = getStoredToken()
//     const stored = getStoredUser()
//     if (token && stored) {
//       setUser(stored)
//       Promise.all([fetchMe(), stored.role !== 'admin' ? fetchMyCards() : Promise.resolve({})])
//         .then(([freshUser, cardMap]) => {
//           setUser(freshUser)
//           setCards(cardMap as Record<string, boolean>)
//         })
//         .catch(() => {
//           clearAuth()
//           setUser(null)
//         })
//         .finally(() => setAuthChecked(true))
//     } else {
//       setAuthChecked(true)
//     }
//   }, [])

//   async function handleLogin(u: AuthUser, profile: string) {
//     setUser(u)
//     setAuthChecked(true)
//     if (profile) setSelectedProfile(profile)
//     if (u.role !== 'admin') {
//       try { setCards(await fetchMyCards()) } catch { /* defaults */ }
//     }
//   }

//   function handleLogout() {
//     clearAuth()
//     setUser(null)
//     setCards({})
//     setPage('dashboard')
//     setSelectedProfile('')
//     setSyncedProfiles([])
//     setConfiguredProfiles([])
//   }

//   if (!authChecked && !user) return null
//   if (!user) return <Suspense fallback={null}><LoginPage onLogin={handleLogin} /></Suspense>

//   const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
//   const showSync      = user.role === 'admin' || cards['button_sync'] !== false
//   const showCompare   = user.role === 'admin' || cards['page_compare'] !== false
//   const showResources = user.role === 'admin' || cards['page_resources'] !== false

//   // ── Admin view ────────────────────────────────────────────────────────────
//   if (user.role === 'admin') {
//     return (
//       <div className="min-h-screen bg-[#0a0f1e] text-slate-100">
//         <header className="border-b border-slate-800/80 bg-[#0d1425]/90 backdrop-blur-sm sticky top-0 z-10">
//           <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
//             <div className="flex items-center gap-2.5">
//               <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
//                 <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576a.347.347 0 01.056.184c0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.063-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.521.521 0 01-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.415-.758.778.778 0 00-.215-.559c-.144-.151-.416-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.814a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.416.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.070.223-.255.152-.39.391-.39.726 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.991.44 1.246.774.255.332.383.71.383 1.133 0 .344-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.344-.886.447-.36.111-.743.167-1.157.167z"/>
//                 </svg>
//               </div>
//               <span className="text-sm font-semibold text-white tracking-tight">Billing Dashboard</span>
//               <span className="ml-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-medium">
//                 Admin
//               </span>
//             </div>
//             <UserPill name={user.name} role="Admin" initials={initials} onLogout={handleLogout} />
//           </div>
//         </header>
//         <Suspense fallback={null}><AdminPanel /></Suspense>
//       </div>
//     )
//   }

//   // ── Regular user view ────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-[#0a0f1e] text-slate-100">
//       <header className="border-b border-slate-800/80 bg-[#0d1425]/90 backdrop-blur-sm sticky top-0 z-10">
//         <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
//           <div className="flex items-center gap-6">
//             <div className="flex items-center gap-2.5">
//               <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
//                 <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576a.347.347 0 01.056.184c0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.063-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.521.521 0 01-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.415-.758.778.778 0 00-.215-.559c-.144-.151-.416-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.814a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.416.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.070.223-.255.152-.39.391-.39.726 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.991.44 1.246.774.255.332.383.71.383 1.133 0 .344-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.344-.886.447-.36.111-.743.167-1.157.167z"/>
//                 </svg>
//               </div>
//               <span className="text-sm font-semibold text-white tracking-tight">Billing Dashboard</span>
//             </div>

//             <div className="h-4 w-px bg-slate-700" />

//             <nav className="flex items-center gap-5">
//               <button
//                 onClick={() => setPage('dashboard')}
//                 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
//                   page === 'dashboard'
//                     ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
//                     : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
//                 }`}
//               >
//                 Dashboard
//               </button>
//               {showCompare && (
//                 <button
//                   onClick={() => setPage('compare')}
//                   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
//                     page === 'compare'
//                       ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
//                       : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
//                   }`}
//                 >
//                   Compare
//                 </button>
//               )}
//               {showResources && (
//                 <button
//                   onClick={() => setPage('resources')}
//                   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
//                     page === 'resources'
//                       ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
//                       : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
//                   }`}
//                 >
//                   Resources
//                 </button>
//               )}
//             </nav>
//           </div>

//           <div className="flex items-center gap-3">
//             {/* AWS Account selector — show whenever we have any configured profiles */}
//             {configuredProfiles.length > 0 && (
//               <div className="flex items-center gap-1.5">
//                 <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
//                 </svg>
//                 <div className="relative">
//                   <select
//                     value={selectedProfile}
//                     onChange={(e) => { setSelectedProfile(e.target.value); setReloadKey((k) => k + 1) }}
//                     className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg
//                                pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500
//                                appearance-none"
//                   >
//                     {configuredProfiles.map((p) => (
//                       <option key={p} value={p}>
//                         {p}{syncedProfiles.includes(p) ? ' ✓' : ''}
//                       </option>
//                     ))}
//                   </select>
//                   <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500"
//                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
//                   </svg>
//                 </div>
//               </div>
//             )}
//             {showSync && (
//               <SyncButton
//                 onSyncComplete={() => { loadProfiles(); setReloadKey((k) => k + 1) }}
//                 activeProfile={selectedProfile}
//               />
//             )}
//             <div className="pl-3 border-l border-slate-700/60">
//               <UserPill name={user.name} role={user.role} initials={initials} onLogout={handleLogout} />
//             </div>
//           </div>
//         </div>
//       </header>

//       <Suspense fallback={null}>
//         {page === 'dashboard' ? (
//           <Dashboard key={reloadKey} cards={cards} profile={selectedProfile} />
//         ) : page === 'compare' ? (
//           <ComparePage key={reloadKey} cards={cards} profile={selectedProfile} />
//         ) : (
//           <ResourcesPage profile={selectedProfile} />
//         )}
//       </Suspense>
//     </div>
//   )
// }

// function UserPill({ name, role, initials, onLogout }: {
//   name: string; role: string; initials: string; onLogout: () => void
// }) {
//   return (
//     <div className="flex items-center gap-2">
//       <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
//         {initials}
//       </div>
//       <div className="hidden sm:block">
//         <div className="text-xs font-medium text-slate-200 leading-none">{name}</div>
//         <div className="text-xs text-slate-500 leading-none mt-0.5">{role}</div>
//       </div>
//       <button onClick={onLogout} title="Sign out"
//         className="ml-1 p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
//         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//         </svg>
//       </button>
//     </div>
//   )
// }



import { useState, useEffect, lazy, Suspense } from 'react'
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const ComparePage   = lazy(() => import('./pages/ComparePage'))
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const AdminPanel    = lazy(() => import('./pages/AdminPanel'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
import SyncButton from './components/ui/SyncButton'
import { getStoredToken, getStoredUser, clearAuth, fetchMe, fetchMyCards, type AuthUser } from './api/auth'
import { fetchProfiles } from './api/sync'

type Page = 'dashboard' | 'compare' | 'resources'

export default function App() {
  const [user, setUser]                       = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked]         = useState(false)
  const [cards, setCards]                     = useState<Record<string, boolean>>({})
  const [page, setPage]                       = useState<Page>('dashboard')
  const [reloadKey, setReloadKey]             = useState(0)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [syncedProfiles, setSyncedProfiles]   = useState<string[]>([])
  const [configuredProfiles, setConfiguredProfiles] = useState<string[]>([])

  const loadProfiles = async () => {
    try {
      const p = await fetchProfiles()
      setConfiguredProfiles(p.configured)
      setSyncedProfiles(p.synced)
      setSelectedProfile(prev =>
        p.configured.includes(prev) ? prev : (p.configured[0] ?? prev)
      )
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadProfiles()

    const token  = getStoredToken()
    const stored = getStoredUser()
    if (token && stored) {
      setUser(stored)
      Promise.all([fetchMe(), stored.role !== 'admin' ? fetchMyCards() : Promise.resolve({})])
        .then(([freshUser, cardMap]) => {
          setUser(freshUser)
          setCards(cardMap as Record<string, boolean>)
        })
        .catch(() => {
          clearAuth()
          setUser(null)
        })
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  async function handleLogin(u: AuthUser, profile: string) {
    setUser(u)
    setAuthChecked(true)
    if (profile) setSelectedProfile(profile)
    if (u.role !== 'admin') {
      try { setCards(await fetchMyCards()) } catch { /* defaults */ }
    }
  }

  function handleLogout() {
    clearAuth()
    setUser(null)
    setCards({})
    setPage('dashboard')
    setSelectedProfile('')
    setSyncedProfiles([])
    setConfiguredProfiles([])
  }

  if (!authChecked && !user) return null
  if (!user) return <Suspense fallback={null}><LoginPage onLogin={handleLogin} /></Suspense>

  const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const showSync      = user.role === 'admin' || cards['button_sync'] !== false
  const showCompare   = user.role === 'admin' || cards['page_compare'] !== false
  const showResources = user.role === 'admin' || cards['page_resources'] !== false

  // ── Admin view ────────────────────────────────────────────────────────────
  if (user.role === 'admin') {
    return (
      <>
        <style>{`
          /* Premium Admin Panel Styles */
          .admin-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
          }
          
          .admin-header {
            background: rgba(13, 20, 37, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: sticky;
            top: 0;
            z-index: 50;
          }
          
          .admin-logo {
            background: linear-gradient(135deg, #F59E0B, #D97706);
            border-radius: 10px;
            padding: 6px;
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
          }
          
          .admin-badge {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #FBBF24;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 20px;
            margin-left: 8px;
          }
        `}</style>
        <div className="admin-container">
          <header className="admin-header">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="admin-logo">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="text-base font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  CloudBilling Admin
                </span>
                <span className="admin-badge">
                  ⚡ Administrator
                </span>
              </div>
              <UserPill name={user.name} role="Admin" initials={initials} onLogout={handleLogout} />
            </div>
          </header>
          <Suspense fallback={<LoadingSpinner />}><AdminPanel /></Suspense>
        </div>
      </>
    )
  }

  // ── Regular user view ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ========== PREMIUM APP STYLES ========== */
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          }
        }
        
        /* Main App Container */
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%);
          position: relative;
        }
        
        /* Animated Background */
        .app-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .bg-gradient-blur {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
        }
        
        .bg-blur-1 {
          background: radial-gradient(circle, #3B82F6, #8B5CF6);
          top: -200px;
          left: -200px;
          animation: float 20s ease-in-out infinite;
        }
        
        .bg-blur-2 {
          background: radial-gradient(circle, #8B5CF6, #EC489A);
          bottom: -200px;
          right: -200px;
          animation: float 25s ease-in-out infinite reverse;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(50px, -50px) rotate(120deg); }
          66% { transform: translate(-50px, 50px) rotate(240deg); }
        }
        
        /* Header */
        .premium-header {
          background: rgba(13, 20, 37, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: sticky;
          top: 0;
          z-index: 50;
          animation: slideDown 0.5s ease-out;
        }
        
        /* Logo */
        .premium-logo {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border-radius: 10px;
          padding: 6px;
          transition: all 0.3s ease;
          animation: glowPulse 2s infinite;
        }
        
        .premium-logo:hover {
          transform: scale(1.05);
          box-shadow: 0 0 25px rgba(245, 158, 11, 0.5);
        }
        
        /* Navigation */
        .nav-divider {
          width: 1px;
          height: 24px;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent);
        }
        
        .nav-button {
          position: relative;
          padding: 8px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .nav-button-active {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.1));
          color: #60A5FA;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        
        .nav-button-inactive {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .nav-button-inactive:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-1px);
        }
        
        /* Profile Selector */
        .profile-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 40px;
          padding: 4px 12px 4px 16px;
          transition: all 0.2s ease;
        }
        
        .profile-selector:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(15, 23, 42, 0.8);
        }
        
        .profile-icon {
          width: 16px;
          height: 16px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .profile-select {
          background: transparent;
          border: none;
          color: white;
          font-size: 12px;
          padding: 6px 20px 6px 0;
          cursor: pointer;
          outline: none;
        }
        
        .profile-select option {
          background: #1E293B;
        }
        
        /* Sync Button Wrapper */
        .sync-wrapper {
          position: relative;
        }
        
        /* Loading Spinner */
        .loading-spinner-full {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        
        .spinner-premium {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3B82F6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .nav-button {
            padding: 6px 12px;
            font-size: 12px;
          }
          
          .profile-selector {
            padding: 4px 8px 4px 12px;
          }
          
          .profile-select {
            font-size: 11px;
            padding-right: 16px;
          }
        }
        
        /* User Pill Styles */
        .user-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 40px;
          padding: 6px 16px 6px 8px;
          transition: all 0.2s ease;
        }
        
        .user-pill:hover {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1));
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-size: 12px;
          font-weight: 500;
          color: white;
          line-height: 1.2;
        }
        
        .user-role {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.2;
        }
        
        .logout-button {
          padding: 6px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.5);
          transition: all 0.2s ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        
        .logout-button:hover {
          color: #EF4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        /* Main Content */
        .main-content {
          position: relative;
          z-index: 1;
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
      
      <div className="app-container">
        {/* Animated Background */}
        <div className="app-bg">
          <div className="bg-gradient-blur bg-blur-1" />
          <div className="bg-gradient-blur bg-blur-2" />
        </div>
        
        <header className="premium-header">
          <div className=" mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="premium-logo">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="text-base font-semibold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  CloudBilling
                </span>
              </div>
              
              <div className="nav-divider" />
              
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => setPage('dashboard')}
                  className={`nav-button ${page === 'dashboard' ? 'nav-button-active' : 'nav-button-inactive'}`}
                >
                  <span>Dashboard</span>
                  {page === 'dashboard' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  )}
                </button>
                
                {showCompare && (
                  <button
                    onClick={() => setPage('compare')}
                    className={`nav-button ${page === 'compare' ? 'nav-button-active' : 'nav-button-inactive'}`}
                  >
                    <span>Compare</span>
                    {page === 'compare' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    )}
                  </button>
                )}
                
                {showResources && (
                  <button
                    onClick={() => setPage('resources')}
                    className={`nav-button ${page === 'resources' ? 'nav-button-active' : 'nav-button-inactive'}`}
                  >
                    <span>Resources</span>
                    {page === 'resources' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    )}
                  </button>
                )}
              </nav>
            </div>
            
            {/* Right Side Controls */}
            <div className="flex items-center gap-4">
              {/* AWS Profile Selector */}
              {configuredProfiles.length > 0 && (
                <div className="profile-selector">
                  <svg className="profile-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <select
                    value={selectedProfile}
                    onChange={(e) => { setSelectedProfile(e.target.value); setReloadKey((k) => k + 1) }}
                    className="profile-select"
                  >
                    {configuredProfiles.map((p) => (
                      <option key={p} value={p}>
                        {p}{syncedProfiles.includes(p) ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Sync Button */}
              {showSync && (
                <div className="sync-wrapper">
                  <SyncButton
                    onSyncComplete={() => { loadProfiles(); setReloadKey((k) => k + 1) }}
                    activeProfile={selectedProfile}
                  />
                </div>
              )}
              
              {/* User Menu */}
              <UserPill name={user.name} role={user.role} initials={initials} onLogout={handleLogout} />
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <div className="main-content">
          <Suspense fallback={<LoadingSpinner />}>
            {page === 'dashboard' ? (
              <Dashboard key={reloadKey} cards={cards} profile={selectedProfile} />
            ) : page === 'compare' ? (
              <ComparePage key={reloadKey} cards={cards} profile={selectedProfile} />
            ) : (
              <ResourcesPage profile={selectedProfile} />
            )}
          </Suspense>
        </div>
      </div>
    </>
  )
}

// Premium UserPill Component
function UserPill({ name, role, initials, onLogout }: {
  name: string; role: string; initials: string; onLogout: () => void
}) {
  return (
    <div className="user-pill">
      <div className="user-avatar">
        {initials}
      </div>
      <div className="user-info">
        <div className="user-name">{name}</div>
        <div className="user-role">
          {role === 'admin' ? 'Administrator' : role === 'finance' ? 'Finance Manager' : 'User'}
        </div>
      </div>
      <button onClick={onLogout} title="Sign out" className="logout-button">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  )
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="loading-spinner-full">
      <div className="spinner-premium" />
    </div>
  )
}