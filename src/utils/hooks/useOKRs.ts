import { useEffect, useState } from 'react'
import { getOKRs } from '@/api/api'
import type { OkrCategoryType } from '@/components/template/OkrView'
import type { Objective, KeyResult } from '@/components/template/OkrView'

interface ApiOKR {
    _id?: string
    id?: string
    title: string
    description?: string
    category?: string
    status?: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
    overallProgress?: number // Progreso general del OKR
    progress?: number // Alias para compatibilidad
    dueDate?: string // Alias para compatibilidad
    endDate?: string | Date // Fecha de fin del OKR
    startDate?: string | Date
    updatedAt?: string | Date // Fecha de última actualización (del schema con timestamps)
    createdAt?: string | Date
    keyResults?: Array<{
        _id?: string
        id?: string
        title: string // Requerido en el schema
        description?: string // Opcional en el schema
        targetValue: number // Requerido en el schema
        currentValue?: number // Default 0
        current?: number // Alias para compatibilidad
        target?: number // Alias para compatibilidad
        unit?: string // Default ""
        progress?: number // Porcentaje de progreso 0-100
        status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
        completedAt?: string | Date
        owners?:
            | string[]
            | Array<{
                  _id?: string
                  id?: string
                  email?: string
                  firstName?: string
                  lastName?: string
                  personalData?: {
                      firstName?: string
                      lastName?: string
                  }
              }>
        progressRecords?: Array<{
            _id?: string
            id?: string
            advanceUnits: number
            advanceDate: string | Date
            comment?: string
            createdAt?: string | Date
            updatedAt?: string | Date
        }>
    }>
}

interface ApiOKRResponse {
    okrs?: ApiOKR[]
    data?: ApiOKR[]
    okrCategories?: OkrCategoryType[]
    categories?: OkrCategoryType[]
    [key: string]: any
}

/**
 * Transforma el estado de la API al formato interno
 */
const transformStatus = (
    status?: string,
): 'not_started' | 'in_progress' | 'completed' | 'at_risk' => {
    switch (status) {
        case 'completed':
            return 'completed'
        case 'active':
        case 'in_progress':
            return 'in_progress'
        case 'paused':
        case 'cancelled':
        case 'at_risk':
            return 'at_risk'
        default:
            return 'not_started'
    }
}

/**
 * Transforma un KeyResult de la API al formato interno
 */
const transformKeyResult = (kr: any, index: number): KeyResult => {
    // En el schema, title es requerido y description es opcional
    // Usamos title como description si description no existe
    const description = kr.description || kr.title || ''

    // targetValue es requerido en el schema
    // currentValue tiene default 0
    const current = kr.currentValue ?? kr.current ?? 0
    const target = kr.targetValue ?? kr.target ?? 0

    // Mapear progressRecords si existen
    const progressRecords = kr.progressRecords
        ? kr.progressRecords.map((record: any) => ({
              _id: record._id,
              id: record._id || record.id,
              advanceUnits: record.advanceUnits,
              advanceDate: record.advanceDate,
              comment: record.comment,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
          }))
        : undefined

    return {
        id: kr._id || kr.id || `kr-${index}`,
        description,
        current: current >= 0 ? current : undefined,
        target: target > 0 ? target : undefined,
        unit: kr.unit || '',
        status: transformStatus(kr.status) || 'not_started',
        progressRecords,
        owners: kr.owners || undefined, // Puede ser array de IDs o objetos de usuario
    }
}

/**
 * Transforma un Objective de la API al formato interno
 */
const transformObjective = (okr: ApiOKR, index: number): Objective => {
    // overallProgress es el campo principal en el schema, progress es alias
    const progress = okr.overallProgress ?? okr.progress ?? 0

    // endDate es el campo principal en el schema, dueDate es alias
    let dueDate: string | undefined
    if (okr.endDate) {
        dueDate =
            typeof okr.endDate === 'string'
                ? okr.endDate
                : okr.endDate.toISOString().split('T')[0]
    } else if (okr.dueDate) {
        dueDate = okr.dueDate
    }

    // updatedAt viene del timestamps del schema
    let updatedAt: string | Date | undefined
    if (okr.updatedAt) {
        updatedAt = okr.updatedAt
    } else if (okr.createdAt) {
        // Si no hay updatedAt, usar createdAt como fallback
        updatedAt = okr.createdAt
    }

    return {
        id: okr._id || okr.id || `obj-${index}`,
        title: okr.title,
        description: okr.description,
        progress: Math.min(Math.max(progress, 0), 100), // Asegurar rango 0-100
        status: transformStatus(okr.status) || 'not_started',
        dueDate,
        startDate: okr.startDate,
        endDate: okr.endDate,
        updatedAt,
        keyResults:
            okr.keyResults?.map((kr, idx) => transformKeyResult(kr, idx)) || [],
    }
}

/**
 * Agrupa los OKRs por categoría
 */
const groupOKRsByCategory = (okrs: ApiOKR[]): OkrCategoryType[] => {
    const categoriesMap = new Map<string, Objective[]>()

    okrs.forEach((okr, index) => {
        const categoryName = okr.category || 'Sin categoría'
        const objective = transformObjective(okr, index)

        if (!categoriesMap.has(categoryName)) {
            categoriesMap.set(categoryName, [])
        }
        categoriesMap.get(categoryName)?.push(objective)
    })

    const categories: OkrCategoryType[] = []
    let categoryIndex = 1

    categoriesMap.forEach((objectives, categoryName) => {
        categories.push({
            id: `cat-${categoryIndex++}`,
            name: categoryName,
            objectives,
        })
    })

    return categories
}

/**
 * Transforma la respuesta de la API al formato esperado por los componentes
 */
const transformApiResponse = (data: ApiOKRResponse): OkrCategoryType[] => {
    // Si ya viene en formato de categorías
    if (data.okrCategories || data.categories) {
        return (data.okrCategories || data.categories) as OkrCategoryType[]
    }

    // Si viene como array de OKRs, agrupar por categoría
    const okrs = data.okrs || data.data || []
    if (Array.isArray(okrs) && okrs.length > 0) {
        return groupOKRsByCategory(okrs)
    }

    // Si es un array directo de categorías
    if (Array.isArray(data)) {
        return data as OkrCategoryType[]
    }

    return []
}

/**
 * Hook para obtener OKRs de la API
 */
export const useOKRs = (filters?: {
    owner?: string
    period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    year?: number
    status?: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
    category?: string
    team?: string
    visibility?: 'private' | 'public' | 'team'
    page?: number
    limit?: number
}) => {
    const [categories, setCategories] = useState<OkrCategoryType[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getOKRs(filters)

                if (isMounted && data) {
                    const transformedCategories = transformApiResponse(data)
                    setCategories(transformedCategories)
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Error al obtener OKRs')
                    console.error('Error al obtener OKRs:', err)
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
    }, [
        filters?.owner,
        filters?.period,
        filters?.year,
        filters?.status,
        filters?.category,
        filters?.team,
        filters?.visibility,
        filters?.page,
        filters?.limit,
        refreshTrigger, // Añadir refreshTrigger como dependencia
    ])

    const refresh = () => {
        setRefreshTrigger((prev) => prev + 1)
    }

    return { categories, loading, error, refresh }
}
