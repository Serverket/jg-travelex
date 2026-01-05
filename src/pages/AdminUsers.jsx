import { useEffect, useMemo, useState } from 'react'
import { adminService } from '../services/adminService'
import { useToast } from '../context/ToastContext'
import { useAppContext } from '../context/AppContext'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'user', label: 'Usuario' },
  { value: 'driver', label: 'Conductor' }
]

const AVAILABLE_FEATURES = [
  { value: 'calculator', label: 'Calculadora' },
  { value: 'orders', label: 'Órdenes' },
  { value: 'invoices', label: 'Facturas' },
  { value: 'settings', label: 'Configuración' },
  { value: 'admin_users', label: 'Panel de usuarios' }
]

const INITIAL_FORM_STATE = {
  email: '',
  username: '',
  full_name: '',
  password: '',
  role: 'user',
  phone: '',
  department: '',
  is_temporary: false,
  expires_at: '',
  features: [],
  is_active: true,
  avatar_url: ''
}

const toFeatureArray = (features) => {
  if (!features) return []
  if (Array.isArray(features)) return features
  return Object.entries(features)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key)
}

const formatDateTimeLocal = (value) => {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const tzOffset = date.getTimezoneOffset() * 60000
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
    return localISOTime
  } catch {
    return ''
  }
}

const toISODate = (value) => {
  if (!value) return null
  try {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  const toast = useToast()
  const { currentUser, refreshCurrentUser } = useAppContext()

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.listUsers()
      setUsers(data || [])
    } catch (err) {
      setError(err.message || 'No se pudieron obtener los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE)
    setFormError(null)
  }

  const handleCreate = () => {
    setEditingUser(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setForm({
      email: user.email || '',
      username: user.username || '',
      full_name: user.full_name || '',
      password: '',
      role: user.role || 'user',
      phone: user.phone || '',
      department: user.department || '',
      is_temporary: !!user.is_temporary,
      expires_at: formatDateTimeLocal(user.expires_at),
      features: toFeatureArray(user.features),
      is_active: user.is_active !== false,
      avatar_url: user.avatar_url || ''
    })
    setFormError(null)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
    resetForm()
  }

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleFeature = (featureKey) => {
    setForm(prev => {
      const current = new Set(prev.features)
      if (current.has(featureKey)) current.delete(featureKey)
      else current.add(featureKey)
      return { ...prev, features: Array.from(current) }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    if (!form.email || !form.username || !form.full_name) {
      setFormError('Email, usuario y nombre completo son obligatorios')
      return
    }

    if (!editingUser && form.password && form.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setSaving(true)
    try {
      const payload = {
        email: form.email,
        username: form.username,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || null,
        department: form.department || null,
        is_temporary: form.is_temporary,
        expires_at: form.is_temporary ? toISODate(form.expires_at) : null,
        features: form.features,
        is_active: form.is_active,
        avatar_url: form.avatar_url || null
      }

      if (form.password) {
        payload.password = form.password
      }

      if (editingUser) {
        const updated = await adminService.updateUser(editingUser.id, payload)
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
        toast.success('Usuario actualizado correctamente')
        if (editingUser.id === currentUser?.id) {
          refreshCurrentUser()
        }
      } else {
        const created = await adminService.createUser(payload)
        const { tempPassword, ...profile } = created
        setUsers(prev => [profile, ...prev])
        if (tempPassword) {
          toast.info(`Contraseña temporal: ${tempPassword}`, { title: 'Usuario creado' })
        } else {
          toast.success('Usuario creado correctamente')
        }
      }

      closeDialog()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminar tu propio usuario')
      return
    }
    const confirmed = window.confirm(`¿Eliminar al usuario ${user.full_name || user.email}?`)
    if (!confirmed) return

    try {
      await adminService.deleteUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      toast.success('Usuario eliminado correctamente')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el usuario')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aName = (a.full_name || a.email || '').toLowerCase()
      const bName = (b.full_name || b.email || '').toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [users])

  const featureList = (user) => {
    const list = toFeatureArray(user.features)
    if (!list.length) return 'Todos'
    return list.map(key => {
      const match = AVAILABLE_FEATURES.find(f => f.value === key)
      return match ? match.label : key
    }).join(', ')
  }

  return (
    <div className="space-y-8">
      <div
        data-aos="fade-up"
        className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10 backdrop-blur md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">Gestión de usuarios</h1>
          <p className="mt-1 text-sm text-blue-100/70">Crea, actualiza o desactiva el acceso de los usuarios del sistema.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadUsers}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-blue-100/80 shadow-inner shadow-blue-500/10 transition-all hover:scale-105 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Actualizar lista'}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-gradient-to-r from-blue-500/80 via-sky-500/80 to-indigo-500/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-400/60 whitespace-nowrap"
          >
            Nuevo usuario
          </button>
        </div>
      </div>

      {error && (
        <div
          data-aos="fade-up"
          data-aos-delay="50"
          className="rounded-3xl border border-rose-400/40 bg-rose-500/20 px-6 py-4 text-sm font-medium text-rose-100 shadow-inner shadow-rose-500/20"
        >
          {error}
        </div>
      )}

      <div
        data-aos="fade-up"
        data-aos-delay="100"
        className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-blue-500/10 backdrop-blur"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-blue-100/80">
            <thead className="bg-white/5 text-sm uppercase tracking-[0.12em] text-blue-100">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Usuario</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Rol</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Temporal</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Expira</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Funciones</th>
                <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <div className="flex flex-col items-center gap-3 text-blue-100/70">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      <span className="text-sm">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-blue-100/60">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                sortedUsers.map(user => (
                  <tr
                    key={user.id}
                    className="bg-white/5 transition hover:bg-white/10"
                  >
                    <td className="px-6 py-4 text-sm text-blue-100/80">
                      <div className="text-base font-semibold text-white">{user.full_name || 'Sin nombre'}</div>
                      <div className="text-sm text-blue-200/70">{user.email}</div>
                      <div className="text-xs text-blue-200/50">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium capitalize text-blue-100/80 whitespace-nowrap">{user.role}</td>
                    <td className="px-6 py-4 text-sm">
                      {user.is_active === false ? (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 shadow-inner shadow-rose-500/20">
                          Inactivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 shadow-inner shadow-emerald-500/20">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.is_temporary ? (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 shadow-inner shadow-amber-500/20">
                          Temporal
                        </span>
                      ) : (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100 shadow-inner shadow-sky-500/20">
                          Permanente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-100/70">
                      {user.is_temporary && user.expires_at ? new Date(user.expires_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-100/70">
                      {featureList(user)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(user)}
                          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100/80 shadow-inner shadow-blue-500/10 transition-all hover:scale-105 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/60 whitespace-nowrap"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-100 transition-all hover:scale-105 hover:bg-rose-500/25 focus:outline-none focus:ring-2 focus:ring-rose-400/60 whitespace-nowrap"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-40 flex min-h-screen items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm sm:py-10"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/85 px-6 py-8 shadow-2xl shadow-blue-500/20 backdrop-blur-lg">
              <button
                type="button"
                onClick={closeDialog}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 p-2 text-blue-100 transition hover:scale-105 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <h2 className="mb-6 text-2xl font-semibold text-white">
                {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Nombre completo</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(event) => handleInputChange('full_name', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => handleInputChange('email', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Usuario</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(event) => handleInputChange('username', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Rol</label>
                    <select
                      value={form.role}
                      onChange={(event) => handleInputChange('role', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {ROLE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value} className="bg-slate-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => handleInputChange('phone', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Departamento</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(event) => handleInputChange('department', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">Avatar URL</label>
                    <input
                      type="url"
                      value={form.avatar_url}
                      onChange={(event) => handleInputChange('avatar_url', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/80">
                      Contraseña{' '}
                      {!editingUser ? (
                        <span className="text-blue-200/60">(mínimo 8 caracteres)</span>
                      ) : (
                        <span className="text-blue-200/60">(opcional)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => handleInputChange('password', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder={editingUser ? 'Dejar en blanco para mantener la contraseña' : 'Mínimo 8 caracteres'}
                      minLength={editingUser ? undefined : 8}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/10">
                  <label className="flex flex-wrap items-center gap-3 text-sm text-blue-100/80">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => handleInputChange('is_active', event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-300"
                    />
                    Cuenta activa
                  </label>

                  <div className="mt-4 space-y-3">
                    <label className="flex flex-wrap items-center gap-3 text-sm text-blue-100/80">
                      <input
                        type="checkbox"
                        checked={form.is_temporary}
                        onChange={(event) => handleInputChange('is_temporary', event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-300"
                      />
                      Acceso temporal
                    </label>
                    {form.is_temporary && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-blue-100/80">Expira el</label>
                          <input
                            type="datetime-local"
                            value={form.expires_at}
                            onChange={(event) => handleInputChange('expires_at', event.target.value)}
                            className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/10">
                  <p className="text-sm font-medium text-blue-100/80">Permisos de funcionalidad</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {AVAILABLE_FEATURES.map(feature => (
                      <label
                        key={feature.value}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-blue-100/80 transition hover:border-blue-400/60 hover:bg-blue-500/15"
                      >
                        <input
                          type="checkbox"
                          checked={form.features.includes(feature.value)}
                          onChange={() => toggleFeature(feature.value)}
                          className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-300"
                        />
                        {feature.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-blue-200/60">
                    Si no seleccionas ninguna opción, el usuario tendrá acceso completo por defecto.
                  </p>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-100 shadow-inner shadow-rose-500/20">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-blue-100/80 shadow-inner shadow-blue-500/10 transition-all hover:scale-105 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/60 whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl border border-blue-400/40 bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-blue-600/80 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
