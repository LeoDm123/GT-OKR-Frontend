import { LOCAL_STORAGE_USER_KEY } from '@/services/LocalStorageService'

/**
 * Hook para obtener el usuario actual
 */
export const useCurrentUser = () => {
    // Intentar obtener del localStorage primero
    try {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
        if (storedUser) {
            const user = JSON.parse(storedUser)
            if (user && (user.email || user.userName || user._id)) {
                return user
            }
        }
    } catch (error) {
        console.warn('Error al obtener usuario del localStorage:', error)
    }

    return null
}

/**
 * Obtiene el ID del usuario actual (_id o email como fallback)
 */
export const useCurrentUserId = (): string => {
    const user = useCurrentUser()

    // Priorizar _id si existe, sino usar email
    return user?._id || user?.email || ''
}
