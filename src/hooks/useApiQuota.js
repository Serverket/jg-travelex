import { useGoogleMapsQuota } from './useGoogleMapsQuota'
import { useEiaQuota } from './useEiaQuota'

export function useApiQuota() {
  const gm = useGoogleMapsQuota()
  const eia = useEiaQuota()

  const getAllStatus = () => ({
    googleMaps: gm.getStatus(),
    eia: eia.getStatus(),
  })

  const resetAll = () => {
    gm.reset?.()
    // Google Maps quota hook may not export reset — add if needed
    // For now only EIA has reset
    eia.reset()
  }

  return {
    googleMaps: gm,
    eia,
    getAllStatus,
    resetAll,
  }
}
