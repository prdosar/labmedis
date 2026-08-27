import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import logo from '../../assets/logo.png'

export function LoginPage() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError(null)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f4210 0%, #1a6e1a 40%, #27a327 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative">
          <img src={logo} alt="LabMedis" className="h-12 brightness-0 invert object-contain object-left" />
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestion pharmaceutique<br />professionnelle
          </h2>
          <p className="text-green-100 text-lg leading-relaxed max-w-lg">
            Gérez vos stocks, factures, achats et livraisons depuis une interface intuitive et complète.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Produits', value: 'en stock' },
              { label: 'Fournisseurs', value: 'actifs' },
              { label: 'Factures', value: 'ce mois' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-green-200 text-xs font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-white text-sm font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-green-200 text-sm">
          © {new Date().getFullYear()} LabMedis — Lomé, Togo
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={logo} alt="LabMedis" className="h-10 mx-auto object-contain" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
              <p className="text-gray-500 text-sm mt-1">Entrez vos identifiants pour accéder au système</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Identifiant</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Nom d'utilisateur ou email"
                    required
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm bg-white
                      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm bg-white
                      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg
                  transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            LabMedis · Système de gestion pharmaceutique
          </p>
        </div>
      </div>
    </div>
  )
}
