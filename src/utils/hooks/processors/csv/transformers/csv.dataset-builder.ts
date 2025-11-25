/**
 * ============================================
 *  Constructor de datasets CSV
 * ============================================
 */

import {
    CSVRow,
    Movement,
    ProcessedDataset,
    CurrencyCode,
} from '../core/csv.types'
import { toSortableKeyYY } from '../core/csv.utils'
import { transformCSVRowsToMovements } from './csv.row-to-movement'

/**
 * Construye un dataset completo a partir de filas CSV
 */
export function buildDatasetFromCSVRows(
    rows: CSVRow[],
    fileName: string,
    datasetName?: string,
    importedBy?: string,
    datasetType: string = 'cashflow',
): ProcessedDataset {
    console.log(`Construyendo dataset desde ${rows.length} filas CSV`)

    // Transformar filas a movimientos
    const { movements, errors, warnings } = transformCSVRowsToMovements(rows)

    if (movements.length === 0) {
        throw new Error(
            'No se pudieron crear movimientos válidos desde las filas CSV',
        )
    }

    // Calcular período del dataset
    const periodInfo = calculateDatasetPeriod(movements)

    // Determinar moneda del dataset
    const currency = determineDatasetCurrency(rows)

    // Generar nombre del dataset
    const finalDatasetName = generateDatasetName(datasetName, fileName)

    console.log(`Dataset construido:`, {
        datasetName: finalDatasetName,
        movementsCount: movements.length,
        period: periodInfo,
        currency,
        errors: errors.length,
        warnings: warnings.length,
    })

    return {
        datasetName: finalDatasetName,
        originalFileName: fileName,
        importedBy,
        currency,
        datasetType,
        movements,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
    }
}

/**
 * Calcula el período del dataset basado en las fechas de los movimientos
 */
export function calculateDatasetPeriod(movements: Movement[]): {
    start: string
    end: string
} {
    if (movements.length === 0) {
        return { start: '', end: '' }
    }

    // Ordenar fechas usando la función auxiliar
    const fechasOrdenadas = movements
        .map((m) => m.fecha)
        .sort((a, b) => toSortableKeyYY(a).localeCompare(toSortableKeyYY(b)))

    return {
        start: fechasOrdenadas[0],
        end: fechasOrdenadas[fechasOrdenadas.length - 1],
    }
}

/**
 * Determina la moneda del dataset basándose en las filas CSV
 */
export function determineDatasetCurrency(rows: CSVRow[]): CurrencyCode {
    if (rows.length === 0) {
        return 'ARS'
    }

    // Buscar la primera divisa válida
    for (const row of rows) {
        if (row.divisa && row.divisa.trim()) {
            return row.divisa.trim().toUpperCase() as CurrencyCode
        }
    }

    // Fallback a ARS si no se encuentra divisa
    return 'ARS'
}

/**
 * Genera un nombre para el dataset
 */
export function generateDatasetName(
    customName?: string,
    fileName?: string,
): string {
    if (customName && customName.trim()) {
        return customName.trim()
    }

    if (fileName) {
        // Remover extensión del nombre del archivo
        const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')
        if (nameWithoutExtension) {
            return nameWithoutExtension
        }
    }

    // Generar nombre basado en fecha actual
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    return `Dataset_${dateStr}`
}

/**
 * Valida que un dataset tenga la estructura correcta
 */
export function validateDataset(dataset: ProcessedDataset): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar nombre del dataset
    if (!dataset.datasetName || dataset.datasetName.trim() === '') {
        errors.push('Nombre del dataset faltante')
    }

    // Validar nombre del archivo original
    if (!dataset.originalFileName || dataset.originalFileName.trim() === '') {
        errors.push('Nombre del archivo original faltante')
    }

    // Validar tipo de dataset
    if (!dataset.datasetType || dataset.datasetType.trim() === '') {
        warnings.push('Tipo de dataset no especificado')
    }

    // Validar moneda
    if (!dataset.currency || dataset.currency.trim() === '') {
        warnings.push('Moneda no especificada, usando ARS por defecto')
    }

    // Validar movimientos
    if (!dataset.movements || dataset.movements.length === 0) {
        errors.push('Dataset sin movimientos')
    } else {
        // Validar que todos los movimientos tengan campos requeridos
        const invalidMovements = dataset.movements.filter(
            (m) => !m.fecha || !m.categoria.grupo || m.monto <= 0,
        )
        if (invalidMovements.length > 0) {
            errors.push(
                `${invalidMovements.length} movimientos inválidos encontrados`,
            )
        }
    }

    // Validar período
    if (dataset.periodStart && dataset.periodEnd) {
        if (dataset.periodStart > dataset.periodEnd) {
            errors.push('Fecha de inicio posterior a fecha de fin')
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}

/**
 * Enriquece un dataset con información adicional
 */
export function enrichDataset(
    dataset: ProcessedDataset,
    additionalInfo?: {
        description?: string
        tags?: string[]
        metadata?: Record<string, any>
        statistics?: {
            totalMovements: number
            totalAmount: number
            averageAmount: number
        }
    },
): ProcessedDataset & {
    description?: string
    tags?: string[]
    metadata?: Record<string, any>
    statistics?: {
        totalMovements: number
        totalAmount: number
        averageAmount: number
    }
} {
    const enriched = { ...dataset }

    if (additionalInfo?.description) {
        enriched.description = additionalInfo.description
    }

    if (additionalInfo?.tags) {
        enriched.tags = additionalInfo.tags
    }

    if (additionalInfo?.metadata) {
        enriched.metadata = additionalInfo.metadata
    }

    if (additionalInfo?.statistics) {
        enriched.statistics = additionalInfo.statistics
    } else {
        // Calcular estadísticas automáticamente
        enriched.statistics = calculateDatasetStatistics(dataset)
    }

    return enriched
}

/**
 * Calcula estadísticas del dataset
 */
export function calculateDatasetStatistics(dataset: ProcessedDataset): {
    totalMovements: number
    totalAmount: number
    averageAmount: number
    ingresosCount: number
    egresosCount: number
    totalIngresos: number
    totalEgresos: number
    balance: number
} {
    const movements = dataset.movements
    const totalMovements = movements.length
    const totalAmount = movements.reduce((sum, m) => sum + m.monto, 0)
    const averageAmount = totalMovements > 0 ? totalAmount / totalMovements : 0

    const ingresos = movements.filter((m) => m.tipo === 'ingreso')
    const egresos = movements.filter((m) => m.tipo === 'egreso')

    const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0)
    const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0)
    const balance = totalIngresos - totalEgresos

    return {
        totalMovements,
        totalAmount,
        averageAmount,
        ingresosCount: ingresos.length,
        egresosCount: egresos.length,
        totalIngresos,
        totalEgresos,
        balance,
    }
}

/**
 * Combina múltiples datasets en uno solo
 */
export function mergeDatasets(
    datasets: ProcessedDataset[],
    mergedDatasetName?: string,
): ProcessedDataset {
    if (datasets.length === 0) {
        throw new Error('No hay datasets para combinar')
    }

    if (datasets.length === 1) {
        return datasets[0]
    }

    // Combinar todos los movimientos
    const allMovements: Movement[] = []
    const allFileNames: string[] = []
    let currency: CurrencyCode = 'ARS'
    let datasetType = 'cashflow'

    for (const dataset of datasets) {
        allMovements.push(...dataset.movements)
        allFileNames.push(dataset.originalFileName)

        // Usar la moneda del primer dataset como referencia
        if (currency === 'ARS' && dataset.currency !== 'ARS') {
            currency = dataset.currency
        }

        // Usar el tipo del primer dataset
        if (datasetType === 'cashflow' && dataset.datasetType !== 'cashflow') {
            datasetType = dataset.datasetType
        }
    }

    // Ordenar movimientos por fecha
    const sortedMovements = allMovements.sort((a, b) =>
        toSortableKeyYY(a.fecha).localeCompare(toSortableKeyYY(b.fecha)),
    )

    // Calcular período combinado
    const periodInfo = calculateDatasetPeriod(sortedMovements)

    // Generar nombre del dataset combinado
    const finalName =
        mergedDatasetName || `Dataset_Combinado_${allFileNames.length}_archivos`

    return {
        datasetName: finalName,
        originalFileName: allFileNames.join(', '),
        currency,
        datasetType,
        movements: sortedMovements,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
    }
}

/**
 * Filtra un dataset por criterios específicos
 */
export function filterDataset(
    dataset: ProcessedDataset,
    filters: {
        dateRange?: { start: string; end: string }
        minAmount?: number
        maxAmount?: number
        types?: ('ingreso' | 'egreso')[]
        categories?: string[]
    },
): ProcessedDataset {
    let filteredMovements = [...dataset.movements]

    // Filtrar por rango de fechas
    if (filters.dateRange) {
        filteredMovements = filteredMovements.filter((m) => {
            const movementDate = toSortableKeyYY(m.fecha)
            const startDate = toSortableKeyYY(filters.dateRange!.start)
            const endDate = toSortableKeyYY(filters.dateRange!.end)
            return movementDate >= startDate && movementDate <= endDate
        })
    }

    // Filtrar por monto mínimo
    if (filters.minAmount !== undefined) {
        filteredMovements = filteredMovements.filter(
            (m) => m.monto >= filters.minAmount!,
        )
    }

    // Filtrar por monto máximo
    if (filters.maxAmount !== undefined) {
        filteredMovements = filteredMovements.filter(
            (m) => m.monto <= filters.maxAmount!,
        )
    }

    // Filtrar por tipos
    if (filters.types && filters.types.length > 0) {
        filteredMovements = filteredMovements.filter((m) =>
            filters.types!.includes(m.tipo),
        )
    }

    // Filtrar por categorías
    if (filters.categories && filters.categories.length > 0) {
        filteredMovements = filteredMovements.filter((m) =>
            filters.categories!.includes(m.categoria.grupo),
        )
    }

    // Recalcular período
    const periodInfo = calculateDatasetPeriod(filteredMovements)

    return {
        ...dataset,
        movements: filteredMovements,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
    }
}
