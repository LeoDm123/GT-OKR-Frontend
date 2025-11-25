/**
 * ============================================
 *  Procesamiento por lotes de CSV
 * ============================================
 */

import { APIMovement, ProcessedDataset } from '../core/csv.types'
import { splitMovementsIntoBatches } from '../core/csv.utils'

/**
 * Configuración para procesamiento por lotes
 */
export interface BatchConfig {
    batchSize: number
    delayBetweenBatches?: number
    maxRetries?: number
    retryDelay?: number
}

/**
 * Resultado del procesamiento por lotes
 */
export interface BatchProcessingResult {
    success: boolean
    totalBatches: number
    successfulBatches: number
    failedBatches: number
    totalMovements: number
    processedMovements: number
    errors: string[]
    warnings: string[]
    processingTime: number
}

/**
 * Información de un lote individual
 */
export interface BatchInfo {
    batchNumber: number
    movements: APIMovement[]
    size: number
    startIndex: number
    endIndex: number
}

/**
 * Divide movimientos en lotes para procesamiento
 */
export function createBatches(
    movements: APIMovement[],
    batchSize: number = 1000,
): BatchInfo[] {
    const batches: BatchInfo[] = []
    const totalBatches = Math.ceil(movements.length / batchSize)

    for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize
        const endIndex = Math.min(startIndex + batchSize, movements.length)
        const batchMovements = movements.slice(startIndex, endIndex)

        batches.push({
            batchNumber: i + 1,
            movements: batchMovements,
            size: batchMovements.length,
            startIndex,
            endIndex: endIndex - 1, // Incluir el último índice
        })
    }

    return batches
}

/**
 * Procesa un dataset por lotes
 */
export function processDatasetInBatches(
    dataset: ProcessedDataset,
    batchConfig: BatchConfig,
    processBatch: (batch: BatchInfo) => Promise<void>,
): Promise<BatchProcessingResult> {
    return new Promise(async (resolve) => {
        const startTime = Date.now()
        const errors: string[] = []
        const warnings: string[] = []

        let successfulBatches = 0
        let failedBatches = 0
        let processedMovements = 0

        try {
            // Crear lotes
            const batches = createBatches(
                dataset.movements.map((m) => ({
                    fecha: m.fecha,
                    categoria: m.categoria,
                    tipo: m.tipo,
                    monto: m.monto,
                    saldo: m.saldo,
                    nota: m.nota,
                    externalId: m.externalId,
                })),
                batchConfig.batchSize,
            )

            console.log(
                `Procesando dataset "${dataset.datasetName}" en ${batches.length} lotes`,
            )

            // Procesar cada lote
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]

                try {
                    console.log(
                        `Procesando lote ${batch.batchNumber}/${batches.length} (${batch.size} movimientos)`,
                    )

                    await processBatch(batch)
                    successfulBatches++
                    processedMovements += batch.size

                    console.log(
                        `Lote ${batch.batchNumber} procesado exitosamente`,
                    )

                    // Delay entre lotes si está configurado
                    if (
                        batchConfig.delayBetweenBatches &&
                        i < batches.length - 1
                    ) {
                        await new Promise((resolve) =>
                            setTimeout(
                                resolve,
                                batchConfig.delayBetweenBatches!,
                            ),
                        )
                    }
                } catch (error) {
                    failedBatches++
                    const errorMsg = `Error en lote ${batch.batchNumber}: ${error}`
                    errors.push(errorMsg)
                    console.error(errorMsg, error)

                    // Reintentar si está configurado
                    if (batchConfig.maxRetries && batchConfig.maxRetries > 0) {
                        const retryResult = await retryBatch(
                            batch,
                            processBatch,
                            batchConfig.maxRetries,
                            batchConfig.retryDelay || 1000,
                        )

                        if (retryResult.success) {
                            successfulBatches++
                            failedBatches--
                            processedMovements += batch.size
                            errors.pop() // Remover el error original
                            console.log(
                                `Lote ${batch.batchNumber} procesado exitosamente después de reintento`,
                            )
                        }
                    }
                }
            }

            const processingTime = Date.now() - startTime

            resolve({
                success: failedBatches === 0,
                totalBatches: batches.length,
                successfulBatches,
                failedBatches,
                totalMovements: dataset.movements.length,
                processedMovements,
                errors,
                warnings,
                processingTime,
            })
        } catch (error) {
            const processingTime = Date.now() - startTime
            const errorMsg = `Error general en procesamiento por lotes: ${error}`
            errors.push(errorMsg)

            resolve({
                success: false,
                totalBatches: 0,
                successfulBatches,
                failedBatches,
                totalMovements: dataset.movements.length,
                processedMovements,
                errors,
                warnings,
                processingTime,
            })
        }
    })
}

/**
 * Reintenta procesar un lote fallido
 */
async function retryBatch(
    batch: BatchInfo,
    processBatch: (batch: BatchInfo) => Promise<void>,
    maxRetries: number,
    retryDelay: number,
): Promise<{ success: boolean; attempts: number }> {
    let attempts = 0

    while (attempts < maxRetries) {
        attempts++

        try {
            console.log(
                `Reintentando lote ${batch.batchNumber} (intento ${attempts}/${maxRetries})`,
            )

            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            await processBatch(batch)

            return { success: true, attempts }
        } catch (error) {
            console.warn(
                `Intento ${attempts} fallido para lote ${batch.batchNumber}:`,
                error,
            )

            if (attempts >= maxRetries) {
                return { success: false, attempts }
            }
        }
    }

    return { success: false, attempts }
}

/**
 * Calcula el tamaño óptimo de lote basado en el número de movimientos
 */
export function calculateOptimalBatchSize(totalMovements: number): number {
    if (totalMovements <= 100) {
        return totalMovements // Procesar todo de una vez
    } else if (totalMovements <= 1000) {
        return 100
    } else if (totalMovements <= 10000) {
        return 500
    } else {
        return 1000
    }
}

/**
 * Estima el tiempo de procesamiento por lotes
 */
export function estimateBatchProcessingTime(
    totalMovements: number,
    batchSize: number,
    delayBetweenBatches: number = 1000,
    averageProcessingTimePerBatch: number = 2000,
): {
    totalBatches: number
    estimatedTimeMs: number
    estimatedTimeMinutes: number
} {
    const totalBatches = Math.ceil(totalMovements / batchSize)
    const totalProcessingTime = totalBatches * averageProcessingTimePerBatch
    const totalDelayTime = (totalBatches - 1) * delayBetweenBatches
    const estimatedTimeMs = totalProcessingTime + totalDelayTime

    return {
        totalBatches,
        estimatedTimeMs,
        estimatedTimeMinutes: Math.ceil(estimatedTimeMs / 60000),
    }
}

/**
 * Monitorea el progreso del procesamiento por lotes
 */
export class BatchProgressMonitor {
    private totalBatches: number = 0
    private completedBatches: number = 0
    private startTime: number = 0
    private onProgress?: (progress: BatchProgress) => void

    constructor(onProgress?: (progress: BatchProgress) => void) {
        this.onProgress = onProgress
    }

    start(totalBatches: number): void {
        this.totalBatches = totalBatches
        this.completedBatches = 0
        this.startTime = Date.now()
    }

    updateBatchCompleted(batchNumber: number, success: boolean): void {
        this.completedBatches++

        const progress: BatchProgress = {
            batchNumber,
            totalBatches: this.totalBatches,
            completedBatches: this.completedBatches,
            percentage: (this.completedBatches / this.totalBatches) * 100,
            success,
            elapsedTime: Date.now() - this.startTime,
            estimatedRemainingTime: this.estimateRemainingTime(),
        }

        this.onProgress?.(progress)
    }

    private estimateRemainingTime(): number {
        if (this.completedBatches === 0) return 0

        const elapsedTime = Date.now() - this.startTime
        const averageTimePerBatch = elapsedTime / this.completedBatches
        const remainingBatches = this.totalBatches - this.completedBatches

        return remainingBatches * averageTimePerBatch
    }
}

/**
 * Información de progreso del procesamiento por lotes
 */
export interface BatchProgress {
    batchNumber: number
    totalBatches: number
    completedBatches: number
    percentage: number
    success: boolean
    elapsedTime: number
    estimatedRemainingTime: number
}

/**
 * Valida la configuración de lotes
 */
export function validateBatchConfig(config: BatchConfig): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    if (config.batchSize <= 0) {
        errors.push('El tamaño del lote debe ser mayor a 0')
    }

    if (config.batchSize > 10000) {
        warnings.push(
            'Tamaño de lote muy grande, puede causar problemas de memoria',
        )
    }

    if (config.delayBetweenBatches && config.delayBetweenBatches < 0) {
        errors.push('El delay entre lotes no puede ser negativo')
    }

    if (config.maxRetries && config.maxRetries < 0) {
        errors.push('El número máximo de reintentos no puede ser negativo')
    }

    if (config.retryDelay && config.retryDelay < 0) {
        errors.push('El delay de reintento no puede ser negativo')
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}
