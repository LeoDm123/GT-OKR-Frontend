export interface ProgressRecord {
    _id?: string
    id?: string
    advanceUnits: number
    advanceDate: string | Date
    comment?: string
    createdAt?: string | Date
    updatedAt?: string | Date
}

export interface KeyResult {
    id: string
    description: string
    target?: number
    current?: number
    unit?: string
    status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
    progressRecords?: ProgressRecord[]
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
