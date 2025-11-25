/**
 * ============================================
 *  Transformador de filas CSV a movimientos
 * ============================================
 */

import { CSVRow, Movement, APIMovement } from '../core/csv.types'
import {
    csvRowToMovement,
    normalizeMovementsByDate,
} from '../core/csv.normalize'
import { convertMovementsToAPI } from '../core/csv.utils'

/**
 * Convierte una fila CSV a un Movement usando normalización
 */
export function transformCSVRowToMovement(row: CSVRow): Movement | null {
    try {
        console.log('transformCSVRowToMovement - Input row:', {
            fecha: row.fecha,
            categoria: row.categoria,
            importe: row.importe,
            notas: row.notas,
            identificador: row.identificador,
        })

        const movement = csvRowToMovement(row)

        if (!movement) {
            console.warn(
                'No se pudo transformar la fila CSV a movimiento:',
                row,
            )
            return null
        }

        console.log('transformCSVRowToMovement - Movement creado:', {
            fecha: movement.fecha,
            grupo: movement.categoria.grupo,
            subgrupo: movement.categoria.subgrupo,
            tipo: movement.tipo,
            monto: movement.monto,
            nota: movement.nota,
            externalId: movement.externalId,
        })

        return movement
    } catch (error) {
        console.error('Error en transformCSVRowToMovement:', error)
        return null
    }
}

/**
 * Convierte múltiples filas CSV a movimientos
 */
export function transformCSVRowsToMovements(rows: CSVRow[]): {
    movements: Movement[]
    errors: string[]
    warnings: string[]
} {
    const movements: Movement[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const movement = transformCSVRowToMovement(row)

        if (movement) {
            movements.push(movement)
        } else {
            const error = `Fila ${i + 1}: no se pudo transformar a movimiento`
            errors.push(error)
            console.warn(error, row)
        }
    }

    // Ordenar movimientos por fecha
    const sortedMovements = normalizeMovementsByDate(movements)

    console.log(
        `Transformación completada: ${sortedMovements.length} movimientos válidos de ${rows.length} filas`,
    )

    if (errors.length > 0) {
        console.warn(`Errores en transformación: ${errors.length}`, errors)
    }

    return {
        movements: sortedMovements,
        errors,
        warnings,
    }
}

/**
 * Convierte movimientos a formato API
 */
export function transformMovementsToAPI(movements: Movement[]): APIMovement[] {
    return convertMovementsToAPI(movements)
}

/**
 * Transforma filas CSV directamente a formato API
 */
export function transformCSVRowsToAPIMovements(rows: CSVRow[]): {
    apiMovements: APIMovement[]
    errors: string[]
    warnings: string[]
} {
    const { movements, errors, warnings } = transformCSVRowsToMovements(rows)
    const apiMovements = transformMovementsToAPI(movements)

    return {
        apiMovements,
        errors,
        warnings,
    }
}

/**
 * Valida que un movimiento tenga todos los campos requeridos
 */
export function validateMovement(movement: Movement): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!movement.fecha) {
        errors.push('Fecha faltante')
    }

    if (!movement.categoria.grupo) {
        errors.push('Grupo de categoría faltante')
    }

    if (
        !movement.tipo ||
        (movement.tipo !== 'ingreso' && movement.tipo !== 'egreso')
    ) {
        errors.push('Tipo de movimiento inválido')
    }

    if (!movement.monto || movement.monto <= 0) {
        errors.push('Monto inválido o faltante')
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Filtra movimientos válidos y retorna estadísticas
 */
export function filterValidMovements(movements: Movement[]): {
    validMovements: Movement[]
    invalidMovements: { movement: Movement; errors: string[] }[]
    statistics: {
        total: number
        valid: number
        invalid: number
        validPercentage: number
    }
} {
    const validMovements: Movement[] = []
    const invalidMovements: { movement: Movement; errors: string[] }[] = []

    for (const movement of movements) {
        const validation = validateMovement(movement)

        if (validation.isValid) {
            validMovements.push(movement)
        } else {
            invalidMovements.push({
                movement,
                errors: validation.errors,
            })
        }
    }

    const total = movements.length
    const valid = validMovements.length
    const invalid = invalidMovements.length
    const validPercentage = total > 0 ? (valid / total) * 100 : 0

    return {
        validMovements,
        invalidMovements,
        statistics: {
            total,
            valid,
            invalid,
            validPercentage,
        },
    }
}

/**
 * Agrupa movimientos por tipo
 */
export function groupMovementsByType(movements: Movement[]): {
    ingresos: Movement[]
    egresos: Movement[]
    statistics: {
        totalIngresos: number
        totalEgresos: number
        balance: number
    }
} {
    const ingresos = movements.filter((m) => m.tipo === 'ingreso')
    const egresos = movements.filter((m) => m.tipo === 'egreso')

    const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0)
    const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0)
    const balance = totalIngresos - totalEgresos

    return {
        ingresos,
        egresos,
        statistics: {
            totalIngresos,
            totalEgresos,
            balance,
        },
    }
}

/**
 * Agrupa movimientos por categoría
 */
export function groupMovementsByCategory(movements: Movement[]): {
    [categoryKey: string]: {
        grupo: string
        subgrupo?: string
        movements: Movement[]
        totalAmount: number
        count: number
    }
} {
    const grouped: {
        [categoryKey: string]: {
            grupo: string
            subgrupo?: string
            movements: Movement[]
            totalAmount: number
            count: number
        }
    } = {}

    for (const movement of movements) {
        const categoryKey = movement.categoria.subgrupo
            ? `${movement.categoria.grupo}:${movement.categoria.subgrupo}`
            : movement.categoria.grupo

        if (!grouped[categoryKey]) {
            grouped[categoryKey] = {
                grupo: movement.categoria.grupo,
                subgrupo: movement.categoria.subgrupo,
                movements: [],
                totalAmount: 0,
                count: 0,
            }
        }

        grouped[categoryKey].movements.push(movement)
        grouped[categoryKey].totalAmount += movement.monto
        grouped[categoryKey].count += 1
    }

    return grouped
}

/**
 * Calcula estadísticas de movimientos por período
 */
export function calculateMovementStatistics(movements: Movement[]): {
    totalMovements: number
    totalAmount: number
    averageAmount: number
    dateRange: {
        start: string
        end: string
    }
    categoryStats: {
        [categoryKey: string]: {
            count: number
            totalAmount: number
            averageAmount: number
        }
    }
} {
    if (movements.length === 0) {
        return {
            totalMovements: 0,
            totalAmount: 0,
            averageAmount: 0,
            dateRange: { start: '', end: '' },
            categoryStats: {},
        }
    }

    const totalMovements = movements.length
    const totalAmount = movements.reduce((sum, m) => sum + m.monto, 0)
    const averageAmount = totalAmount / totalMovements

    // Calcular rango de fechas
    const sortedMovements = normalizeMovementsByDate(movements)
    const dateRange = {
        start: sortedMovements[0].fecha,
        end: sortedMovements[sortedMovements.length - 1].fecha,
    }

    // Estadísticas por categoría
    const categoryStats: {
        [categoryKey: string]: {
            count: number
            totalAmount: number
            averageAmount: number
        }
    } = {}

    const groupedByCategory = groupMovementsByCategory(movements)
    for (const [categoryKey, group] of Object.entries(groupedByCategory)) {
        categoryStats[categoryKey] = {
            count: group.count,
            totalAmount: group.totalAmount,
            averageAmount: group.totalAmount / group.count,
        }
    }

    return {
        totalMovements,
        totalAmount,
        averageAmount,
        dateRange,
        categoryStats,
    }
}

/**
 * Transforma un movimiento agregando información adicional
 */
export function enrichMovement(
    movement: Movement,
    additionalData?: {
        saldo?: number
        source?: string
        metadata?: Record<string, any>
    },
): Movement {
    return {
        ...movement,
        saldo: additionalData?.saldo,
        ...(additionalData?.metadata && {
            metadata: additionalData.metadata,
        }),
    }
}

/**
 * Transforma múltiples movimientos agregando información adicional
 */
export function enrichMovements(
    movements: Movement[],
    enrichmentData?: (
        movement: Movement,
        index: number,
    ) => {
        saldo?: number
        source?: string
        metadata?: Record<string, any>
    },
): Movement[] {
    return movements.map((movement, index) => {
        const additionalData = enrichmentData?.(movement, index)
        return enrichMovement(movement, additionalData)
    })
}
