export interface ProgressRecord {
    _id?: string
    id?: string
    advanceUnits: number
    advanceDate: string | Date
    comment?: string
    createdAt?: string | Date
    updatedAt?: string | Date
}

export interface KeyResultOwner {
    _id?: string
    id?: string
    email?: string
    firstName?: string
    lastName?: string
    personalData?: {
        firstName?: string
        lastName?: string
    }
}

export interface KeyResult {
    id: string
    description: string
    target?: number
    current?: number
    unit?: string
    status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
    progressRecords?: ProgressRecord[]
    responsibles?: string[] | KeyResultOwner[] // IDs de usuarios o objetos de usuario (backend usa "responsibles")
    owners?: string[] | KeyResultOwner[] // Alias para compatibilidad
}

export interface Objective {
    id: string
    title: string
    description?: string
    keyResults: KeyResult[]
    progress?: number
    previousProgress?: number // Para calcular el cambio porcentual
    status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
    dueDate?: string
    startDate?: string | Date
    endDate?: string | Date
    updatedAt?: string | Date // Fecha de última actualización
}

export interface OkrCategory {
    id: string
    name: string
    objectives: Objective[]
}

export interface OkrListProps {
    categories: OkrCategory[]
    defaultExpandedCategories?: string[]
}
