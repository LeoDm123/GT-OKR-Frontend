const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string
const AUTH_TOKEN: string | undefined = import.meta.env.VITE_AUTH_TOKEN as string

//AUTH SERVICES
export const fetchLoginUser = async (
    email: string,
    password: string,
): Promise<any> => {
    const LOGIN_ENDPOINT: string = '/auth/userLogin'

    try {
        const response = await fetch(`${API_BASE_URL}${LOGIN_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
            throw new Error(`Error al iniciar sesion: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error al iniciar sesion:', error)
        throw error
    }
}

export const createUser = async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    [key: string]: any
}): Promise<any> => {
    const CREATE_USER_ENDPOINT: string = '/auth/createUser'

    try {
        const response = await fetch(`${API_BASE_URL}${CREATE_USER_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
                errorData.msg || `Error al crear usuario: ${response.status}`,
            )
        }

        const data = await response.json()
        return data
    } catch (error: any) {
        console.error('Error en createUser:', error)
        throw error
    }
}

export const getAllUsers = async (): Promise<any> => {
    const GET_ALL_USERS_ENDPOINT: string = '/auth/getAllUsers'

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${GET_ALL_USERS_ENDPOINT}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
            },
        )

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error(
                    'No autorizado para obtener la lista de usuarios',
                )
            } else {
                throw new Error(`Error al obtener usuarios: ${response.status}`)
            }
        }

        const data = await response.json()
        return data
    } catch (error: any) {
        console.error('Error en getAllUsers:', error)
        throw error
    }
}

//OKR
export const createOKR = async (okrData: {
    title: string
    description?: string
    owner: string
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    year: number
    startDate: string | Date
    endDate: string | Date
    keyResults?: Array<{
        title: string
        description?: string
        targetValue: number
        unit?: string
        owners?: string[]
    }>
    category?: string
    tags?: string[]
    notes?: string
    team?: string
    visibility?: 'private' | 'public' | 'team'
}): Promise<any> => {
    const CREATE_OKR_ENDPOINT: string = '/okr/createOKR'

    try {
        const token = getAuthToken()
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}${CREATE_OKR_ENDPOINT}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...okrData,
                startDate:
                    okrData.startDate instanceof Date
                        ? okrData.startDate.toISOString()
                        : okrData.startDate,
                endDate:
                    okrData.endDate instanceof Date
                        ? okrData.endDate.toISOString()
                        : okrData.endDate,
            }),
        })

        if (!response.ok) {
            if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`Datos inválidos: ${errorData.msg}`)
            } else {
                throw new Error(`Error al crear OKR: ${response.status}`)
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en createOKR:', error)
        throw error
    }
}

const getAuthToken = (): string | null => {
    try {
        // Primero intentar obtener el token del localStorage directo
        const token = localStorage.getItem('token')
        if (token) {
            return token
        }

        // Luego intentar del store persistido
        const persistData = localStorage.getItem('admin')
        if (persistData) {
            const parsed = JSON.parse(persistData)
            const persistedToken = parsed?.auth?.session?.token || parsed?.token
            if (persistedToken) {
                return persistedToken
            }
        }

        // Finalmente usar el token de las variables de entorno si existe
        return AUTH_TOKEN || null
    } catch (error) {
        console.warn('Error al obtener token de autenticación:', error)
        return AUTH_TOKEN || null
    }
}

export const getOKRs = async (filters?: {
    owner?: string
    period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    year?: number
    status?: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
    category?: string
    team?: string
    visibility?: 'private' | 'public' | 'team'
    page?: number
    limit?: number
}): Promise<any> => {
    const GET_OKRS_ENDPOINT: string = '/okr/getOKRs'

    try {
        const queryParams = new URLSearchParams()
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value))
                }
            })
        }

        const url = queryParams.toString()
            ? `${API_BASE_URL}${GET_OKRS_ENDPOINT}?${queryParams.toString()}`
            : `${API_BASE_URL}${GET_OKRS_ENDPOINT}`

        const token = getAuthToken()
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
        })

        if (!response.ok) {
            throw new Error(`Error al obtener OKRs: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en getOKRs:', error)
        throw error
    }
}

export const getOKRById = async (okrId: string): Promise<any> => {
    const GET_OKR_ENDPOINT: string = `/okr/getOKRById/${okrId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(`${API_BASE_URL}${GET_OKR_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('OKR no encontrado')
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`ID inválido: ${errorData.msg}`)
            } else {
                throw new Error(`Error al obtener OKR: ${response.status}`)
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en getOKRById:', error)
        throw error
    }
}

export const getOKRsByOwner = async (
    ownerId: string,
    filters?: {
        status?: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
        period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
        year?: number
    },
): Promise<any> => {
    const GET_OKRS_BY_OWNER_ENDPOINT: string = `/okr/getOKRsByOwner/${ownerId}`

    try {
        const queryParams = new URLSearchParams()
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value))
                }
            })
        }

        const url = queryParams.toString()
            ? `${API_BASE_URL}${GET_OKRS_BY_OWNER_ENDPOINT}?${queryParams.toString()}`
            : `${API_BASE_URL}${GET_OKRS_BY_OWNER_ENDPOINT}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(AUTH_TOKEN
                    ? { Authorization: `Bearer ${AUTH_TOKEN}` }
                    : {}),
            },
        })

        if (!response.ok) {
            throw new Error(
                `Error al obtener OKRs del usuario: ${response.status}`,
            )
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en getOKRsByOwner:', error)
        throw error
    }
}

export const updateOKR = async (
    okrId: string,
    updateData: {
        title?: string
        description?: string
        period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
        year?: number
        startDate?: string | Date
        endDate?: string | Date
        category?: string
        tags?: string[]
        notes?: string
        team?: string
        visibility?: 'private' | 'public' | 'team'
        status?: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
    },
): Promise<any> => {
    const UPDATE_OKR_ENDPOINT: string = `/okr/updateOKR/${okrId}`

    try {
        const bodyData = { ...updateData }
        if (updateData.startDate) {
            bodyData.startDate =
                updateData.startDate instanceof Date
                    ? updateData.startDate.toISOString()
                    : updateData.startDate
        }
        if (updateData.endDate) {
            bodyData.endDate =
                updateData.endDate instanceof Date
                    ? updateData.endDate.toISOString()
                    : updateData.endDate
        }

        const authToken = getAuthToken()
        const response = await fetch(`${API_BASE_URL}${UPDATE_OKR_ENDPOINT}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify(bodyData),
        })

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('OKR no encontrado')
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`Datos inválidos: ${errorData.msg}`)
            } else {
                throw new Error(`Error al actualizar OKR: ${response.status}`)
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en updateOKR:', error)
        throw error
    }
}

export const deleteOKR = async (okrId: string): Promise<any> => {
    const DELETE_OKR_ENDPOINT: string = `/okr/deleteOKR/${okrId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(`${API_BASE_URL}${DELETE_OKR_ENDPOINT}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('OKR no encontrado')
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`ID inválido: ${errorData.msg}`)
            } else {
                throw new Error(`Error al eliminar OKR: ${response.status}`)
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en deleteOKR:', error)
        throw error
    }
}

export const addKeyResult = async (
    okrId: string,
    keyResultData: {
        title: string
        description?: string
        targetValue: number
        unit?: string
        owners?: string[]
    },
): Promise<any> => {
    const ADD_KEY_RESULT_ENDPOINT: string = `/okr/addKeyResult/${okrId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${ADD_KEY_RESULT_ENDPOINT}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
                body: JSON.stringify(keyResultData),
            },
        )

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('OKR no encontrado')
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`Datos inválidos: ${errorData.msg}`)
            } else {
                throw new Error(
                    `Error al agregar Key Result: ${response.status}`,
                )
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en addKeyResult:', error)
        throw error
    }
}

export const updateKeyResult = async (
    okrId: string,
    keyResultId: string,
    updateData: {
        title?: string
        description?: string
        targetValue?: number
        currentValue?: number
        unit?: string
        status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
        owners?: string[]
    },
): Promise<any> => {
    const UPDATE_KEY_RESULT_ENDPOINT: string = `/okr/updateKeyResult/${okrId}/${keyResultId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${UPDATE_KEY_RESULT_ENDPOINT}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
                body: JSON.stringify(updateData),
            },
        )

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json()
                throw new Error(
                    errorData.msg || 'OKR o Key Result no encontrado',
                )
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`Datos inválidos: ${errorData.msg}`)
            } else {
                throw new Error(
                    `Error al actualizar Key Result: ${response.status}`,
                )
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en updateKeyResult:', error)
        throw error
    }
}

export const addProgressRecord = async (
    okrId: string,
    keyResultId: string,
    progressRecord: {
        advanceUnits: number
        advanceDate: string | Date
        comment?: string
    },
): Promise<any> => {
    const ADD_PROGRESS_RECORD_ENDPOINT: string = `/okr/addProgressRecord/${okrId}/${keyResultId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${ADD_PROGRESS_RECORD_ENDPOINT}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
                body: JSON.stringify({
                    ...progressRecord,
                    advanceDate:
                        progressRecord.advanceDate instanceof Date
                            ? progressRecord.advanceDate.toISOString()
                            : progressRecord.advanceDate,
                }),
            },
        )

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json()
                throw new Error(
                    errorData.msg || 'OKR o Key Result no encontrado',
                )
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`Datos inválidos: ${errorData.msg}`)
            } else {
                throw new Error(
                    `Error al agregar registro de progreso: ${response.status}`,
                )
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en addProgressRecord:', error)
        throw error
    }
}

export const deleteProgressRecord = async (
    okrId: string,
    keyResultId: string,
    recordId: string,
): Promise<any> => {
    const DELETE_PROGRESS_RECORD_ENDPOINT: string = `/okr/deleteProgressRecord/${okrId}/${keyResultId}/${recordId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${DELETE_PROGRESS_RECORD_ENDPOINT}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
            },
        )

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json()
                throw new Error(
                    errorData.msg ||
                        'OKR, Key Result o registro de progreso no encontrado',
                )
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`ID inválido: ${errorData.msg}`)
            } else {
                throw new Error(
                    `Error al eliminar registro de progreso: ${response.status}`,
                )
            }
        }

        const data = await response.json()
        return data
    } catch (error: any) {
        console.error('Error en deleteProgressRecord:', error)
        throw error
    }
}

export const deleteKeyResult = async (
    okrId: string,
    keyResultId: string,
): Promise<any> => {
    const DELETE_KEY_RESULT_ENDPOINT: string = `/okr/deleteKeyResult/${okrId}/${keyResultId}`

    try {
        const authToken = getAuthToken()
        const response = await fetch(
            `${API_BASE_URL}${DELETE_KEY_RESULT_ENDPOINT}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken
                        ? { Authorization: `Bearer ${authToken}` }
                        : {}),
                },
            },
        )

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json()
                throw new Error(
                    errorData.msg || 'OKR o Key Result no encontrado',
                )
            } else if (response.status === 400) {
                const errorData = await response.json()
                throw new Error(`ID inválido: ${errorData.msg}`)
            } else {
                throw new Error(
                    `Error al eliminar Key Result: ${response.status}`,
                )
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en deleteKeyResult:', error)
        throw error
    }
}

export const getOKRStats = async (filters?: {
    ownerId?: string
    year?: number
    period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
}): Promise<any> => {
    const GET_OKR_STATS_ENDPOINT: string = '/okr/getOKRStats'

    try {
        const queryParams = new URLSearchParams()
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value))
                }
            })
        }

        const url = queryParams.toString()
            ? `${API_BASE_URL}${GET_OKR_STATS_ENDPOINT}?${queryParams.toString()}`
            : `${API_BASE_URL}${GET_OKR_STATS_ENDPOINT}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(AUTH_TOKEN
                    ? { Authorization: `Bearer ${AUTH_TOKEN}` }
                    : {}),
            },
        })

        if (!response.ok) {
            throw new Error(
                `Error al obtener estadísticas de OKR: ${response.status}`,
            )
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error en getOKRStats:', error)
        throw error
    }
}
