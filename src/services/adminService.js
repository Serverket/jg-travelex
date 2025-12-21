import { backendService } from './backendService'

const normalizeFeaturesForRequest = (features) => {
  if (!features) return {}
  if (Array.isArray(features)) {
    return features.reduce((acc, key) => {
      if (typeof key === 'string') acc[key] = true
      return acc
    }, {})
  }
  if (typeof features === 'object') return features
  return {}
}

export const adminService = {
  async listUsers() {
    return backendService.listUsers()
  },

  async createUser(payload) {
    const data = {
      ...payload,
      features: normalizeFeaturesForRequest(payload?.features)
    }
    return backendService.createUser(data)
  },

  async updateUser(id, payload) {
    const data = {
      ...payload,
      ...(payload?.features !== undefined ? { features: normalizeFeaturesForRequest(payload.features) } : {})
    }
    return backendService.updateUser(id, data)
  },

  async deleteUser(id) {
    return backendService.deleteUser(id)
  }
}
