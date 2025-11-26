import { useEffect, useState } from 'react'
import { getAllUsers } from '@/api/api'

export interface User {
    _id: string
    id?: string
    email: string
    firstName?: string
    lastName?: string
    personalData?: {
        firstName?: string
        lastName?: string
    }
    [key: string]: any
}

interface UseUsersReturn {
    users: User[]
    loading: boolean
    error: string | null
    refresh: () => void
}

/**
 * Hook para obtener la lista de todos los usuarios
 */
export const useUsers = (): UseUsersReturn => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getAllUsers()
                if (isMounted && data) {
                    // Normalizar la respuesta de la API
                    const usersList = data.users || data.data || []
                    setUsers(usersList)
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Error al obtener usuarios')
                    console.error('Error al obtener usuarios:', err)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        load()

        return () => {
            isMounted = false
        }
    }, [refreshTrigger])

    const refresh = () => {
        setRefreshTrigger((prev) => prev + 1)
    }

    return { users, loading, error, refresh }
}
