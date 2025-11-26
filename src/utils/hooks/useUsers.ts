import { useEffect, useState, useMemo } from 'react'
import { getAllUsers } from '@/api/api'
import { LOCAL_STORAGE_USER_KEY } from '@/services/LocalStorageService'

export interface User {
    _id?: string
    id?: string
    email?: string
    firstName?: string
    lastName?: string
    userName?: string
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
 * Obtiene el usuario actual del localStorage
 */
const getCurrentUser = (): User | null => {
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
 * Hook para obtener la lista de todos los usuarios, incluyendo el usuario actual
 */
export const useUsers = (): UseUsersReturn => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Obtener usuario actual
    const currentUser = useMemo(() => getCurrentUser(), [])

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getAllUsers()

                // Log temporal para debugging - ver qué retorna la API
                console.log('Respuesta de getAllUsers:', data)

                if (isMounted && data) {
                    // Normalizar la respuesta de la API - puede venir en diferentes formatos
                    let usersList: User[] = []

                    if (Array.isArray(data)) {
                        // Si la respuesta es directamente un array
                        usersList = data
                    } else if (data.users && Array.isArray(data.users)) {
                        // Si viene en formato { users: [...] }
                        usersList = data.users
                    } else if (data.data && Array.isArray(data.data)) {
                        // Si viene en formato { data: [...] }
                        usersList = data.data
                    } else if (typeof data === 'object') {
                        // Si es un objeto, intentar extraer cualquier array que pueda contener usuarios
                        const keys = Object.keys(data)
                        for (const key of keys) {
                            if (Array.isArray(data[key])) {
                                const arrayData = data[key]
                                // Verificar que el array contenga objetos que parezcan usuarios
                                if (
                                    arrayData.length > 0 &&
                                    typeof arrayData[0] === 'object'
                                ) {
                                    usersList = arrayData as User[]
                                    break
                                }
                            }
                        }
                    }

                    // Asegurarnos de que el usuario actual esté en la lista
                    if (currentUser && usersList.length > 0) {
                        const currentUserId =
                            currentUser._id ||
                            currentUser.id ||
                            currentUser.email
                        const isCurrentUserInList = usersList.some(
                            (user) =>
                                (user._id || user.id || user.email) ===
                                currentUserId,
                        )

                        if (!isCurrentUserInList) {
                            // Agregar el usuario actual al inicio de la lista
                            usersList = [currentUser, ...usersList]
                        }
                    }

                    // Usar TODOS los usuarios de la lista sin filtrar
                    setUsers(usersList)
                } else {
                    // Si la API no retorna datos pero tenemos usuario actual, usarlo
                    if (currentUser) {
                        setUsers([currentUser])
                    } else {
                        setUsers([])
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('Error al obtener usuarios:', err)
                    // Mostrar el error pero no usar solo el usuario actual
                    // para evitar que solo se muestre un usuario
                    setError(err.message || 'Error al obtener usuarios')
                    setUsers([])
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
    }, [refreshTrigger, currentUser])

    const refresh = () => {
        setRefreshTrigger((prev) => prev + 1)
    }

    return { users, loading, error, refresh }
}
