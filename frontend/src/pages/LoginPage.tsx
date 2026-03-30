import { useState, useEffect, type FormEvent } from 'react'
import { login, saveAuth, type AuthUser } from '../api/auth'
import { fetchProfiles } from '../api/sync'

interface Props {
  onLogin: (user: AuthUser, profile: string) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [showPass, setShowPass]       = useState(false)
  const [profile, setProfile]           = useState('')
  const [awsProfiles, setAwsProfiles]   = useState<string[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  useEffect(() => {
    fetchProfiles()
      .then((p) => {
        if (p.configured.length > 0) {
          setAwsProfiles(p.configured)
          setProfile(p.configured[0])
        }
      })
      .catch(() => {/* ignore — user can type manually */})
      .finally(() => setProfilesLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email.trim().toLowerCase(), password)
      saveAuth(res.access_token, res.user)
      onLogin(res.user, profile)
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#137EC2' }}>

      {/* ── LEFT PANEL — illustration ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden px-12"
        style={{ background: 'linear-gradient(135deg, #137EC2 0%, #0e6fb0 100%)' }}>

        {/* decorative circles */}
        <div className="absolute w-[520px] h-[520px] rounded-full border border-white/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        {/* illustration */}
        <img
          src="/login-illustration.jpg"
          alt="Cloud billing illustration"
          className="relative z-10 w-[420px] max-w-full drop-shadow-2xl rounded-2xl"
        />

        {/* tagline */}
        <div className="relative z-10 mt-10 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Smart Cloud Cost Intelligence
          </h2>
          <p className="text-blue-100/80 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Monitor, analyse and optimise your AWS billing — all in one place.
          </p>
        </div>

        {/* feature pills */}
        <div className="relative z-10 flex flex-wrap gap-2 justify-center mt-6">
          {['Real-time Sync', 'Multi-user Access', 'Cost Forecasting', 'INR + USD'].map(f => (
            <span key={f}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20 backdrop-blur-sm">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — login card ────────────────────────────────────── */}
      <div className="w-full lg:w-[440px] flex-shrink-0 flex items-center justify-center px-8 py-12"
        style={{ background: '#137EC2' }}>

        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576a.347.347 0 01.056.184c0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.063-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.521.521 0 01-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.415-.758.778.778 0 00-.215-.559c-.144-.151-.416-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.814a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.416.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.070.223-.255.152-.39.391-.39.726 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.991.44 1.246.774.255.332.383.71.383 1.133 0 .344-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.344-.886.447-.36.111-.743.167-1.157.167z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cloud Billing Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">Sign in to continue</p>
          </div>

          {/* Form card */}
          {/* <div className="bg-[#111c30] border border-slate-700/60 rounded-2xl p-7 shadow-2xl"> */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* AWS Account selector — always shown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    AWS Account
                  </span>
                </label>
                {profilesLoading ? (
                  <div className="w-full bg-[#0d1525] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-600">
                    Loading profiles…
                  </div>
                ) : awsProfiles.length > 0 ? (
                  <div className="relative">
                    <select
                      value={profile}
                      onChange={(e) => setProfile(e.target.value)}
                      className="w-full bg-[#0d1525] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm
                                 text-slate-100 focus:outline-none focus:border-blue-500/60 focus:ring-1
                                 focus:ring-blue-500/30 transition-all appearance-none pr-9"
                    >
                      {awsProfiles.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    placeholder="e.g. telangana"
                    className="w-full bg-[#0d1525] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm
                               text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60
                               focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                )}
              </div>

              {/* Email */}
              <div>

<label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@company.com"
                  className="w-full bg-[#0d1525] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100
                             placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1
                             focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#0d1525] border border-slate-700/80 rounded-xl px-3.5 py-2.5 pr-10 text-sm
                               text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60
                               focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-red-400">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: loading ? '#137EC2' : 'linear-gradient(135deg, #137EC2, #0e6fb0)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Default credentials hint */}
            <div className="mt-5 pt-5 border-t border-slate-700/60">
              <p className="text-xs text-slate-600 text-center mb-2.5">Default credentials</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Admin', email: 'admin@company.com', pass: 'admin123' },
                  { role: 'Finance', email: 'finance@company.com', pass: 'finance123' },
                ].map(u => (
                  <button key={u.role} type="button"
                    onClick={() => { setEmail(u.email); setPassword(u.pass) }}
                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2 text-left transition-all">
                    <div className="text-xs font-semibold text-slate-300">{u.role}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            Cloud Billing Dashboard · Cloud Cost Intelligence
          </p>
        </div>
      </div>
    
  )
}
