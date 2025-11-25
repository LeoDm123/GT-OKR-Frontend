/**
 * ============================================
 *  Procesador CSV MMEX (Actualizado)
 * ============================================
 *
 * Este archivo ha sido refactorizado para usar los nuevos módulos
 * modularizados del procesador CSV.
 */

import { createDataset, addMovementsToDataset } from '@/api/api'
import {
    CSVProcessor,
    CSVProcessorConfig,
    CSVProcessingResult,
    Core,
    Parsers,
    Transformers,
    IO,
} from './index'
import { ProcessedDataset } from './core/csv.types'

/**
 * Configuración específica para MMEX
 */
export interface MMEXProcessorConfig {
    // Configuración de archivos
    fileConfig?: IO.CSVUploaderConfig
    readerConfig?: IO.CSVFileReaderConfig

    // Configuración de parseo
    columnDefinitions?: Core.ColumnDefinition[]
    columnMapping?: Core.ColumnMapping
    useMapping?: boolean

    // Configuración de transformación
    datasetName?: string
    importedBy?: string
    datasetType?: string

    // Configuración de lotes
    batchConfig?: Transformers.BatchConfig
    useBatching?: boolean

    // Configuración de validación
    strictValidation?: boolean
    normalizeData?: boolean

    // Configuraciones específicas de MMEX
    autoCreateDataset?: boolean
    batchSize?: number
    delayBetweenBatches?: number
}

/**
 * Resultado específico para MMEX
 */
export interface MMEXProcessingResult {
    success: boolean
    dataset?: ProcessedDataset
    datasetId?: string
    errors: string[]
    warnings: string[]
    statistics: {
        totalFiles: number
        successfulFiles: number
        failedFiles: number
        totalRows: number
        validRows: number
        invalidRows: number
        totalMovements: number
        processingTime: number
    }
    batchResults?: Transformers.BatchProcessingResult[]
    apiResults?: {
        datasetCreated: boolean
        movementsAdded: number
        apiErrors: string[]
    }
}

/**
 * Procesador CSV específico para MMEX
 */
export class MMEXCSVProcessor extends CSVProcessor {
    private apiConfig: {
        autoCreateDataset: boolean
        batchSize: number
        delayBetweenBatches: number
    }

    constructor(config: MMEXProcessorConfig = {}) {
        const processorConfig: CSVProcessorConfig = {
            fileConfig: config.fileConfig || IO.CSVUploaderPresets.strict,
            strictValidation: config.strictValidation ?? true,
            normalizeData: config.normalizeData ?? true,
            useBatching: config.useBatching ?? true,
            batchConfig: config.batchConfig || {
                batchSize: config.batchSize || 1000,
                delayBetweenBatches: config.delayBetweenBatches || 1000,
                maxRetries: 3,
                retryDelay: 2000,
            },
            datasetName: config.datasetName,
            importedBy: config.importedBy,
            datasetType: config.datasetType,
            columnDefinitions: config.columnDefinitions,
            columnMapping: config.columnMapping,
            useMapping: config.useMapping,
        }

        super(processorConfig)

        this.apiConfig = {
            autoCreateDataset: config.autoCreateDataset ?? true,
            batchSize: config.batchSize || 1000,
            delayBetweenBatches: config.delayBetweenBatches || 1000,
        }
    }

    /**
     * Procesa archivos CSV y los envía a la API de MMEX
     */
    async processAndUploadToAPI(files: File[]): Promise<MMEXProcessingResult> {
        const startTime = Date.now()

        try {
            // 1. Procesar archivos CSV
            const processingResult = await this.processFiles(files)

            if (!processingResult.success || !processingResult.dataset) {
                return {
                    ...processingResult,
                    apiResults: {
                        datasetCreated: false,
                        movementsAdded: 0,
                        apiErrors: ['No se pudo procesar el dataset'],
                    },
                }
            }

            // 2. Crear dataset en la API si está habilitado
            let datasetId: string | undefined
            let datasetCreated = false

            if (this.apiConfig.autoCreateDataset) {
                try {
                    const datasetResponse = await createDataset({
                        datasetName: processingResult.dataset.datasetName,
                        originalFileName:
                            processingResult.dataset.originalFileName,
                        importedBy: processingResult.dataset.importedBy,
                        currency: processingResult.dataset.currency,
                        datasetType: processingResult.dataset.datasetType,
                        movements: processingResult.dataset.movements,
                    })

                    datasetId = datasetResponse.id
                    datasetCreated = true
                    console.log(`Dataset creado en API: ${datasetId}`)
                } catch (error) {
                    console.error('Error al crear dataset:', error)
                    return {
                        ...processingResult,
                        apiResults: {
                            datasetCreated: false,
                            movementsAdded: 0,
                            apiErrors: [`Error al crear dataset: ${error}`],
                        },
                    }
                }
            }

            // 3. Enviar movimientos a la API por lotes
            const apiErrors: string[] = []
            let movementsAdded = 0

            if (datasetId) {
                try {
                    const apiMovements = Transformers.transformMovementsToAPI(
                        processingResult.dataset.movements,
                    )

                    const batches = Transformers.createBatches(
                        apiMovements,
                        this.apiConfig.batchSize,
                    )

                    console.log(
                        `Enviando ${apiMovements.length} movimientos en ${batches.length} lotes`,
                    )

                    for (let i = 0; i < batches.length; i++) {
                        const batch = batches[i]

                        try {
                            console.log(
                                `Enviando lote ${batch.batchNumber}/${batches.length}`,
                            )

                            await addMovementsToDataset(
                                datasetId,
                                batch.movements,
                            )
                            movementsAdded += batch.size

                            console.log(
                                `Lote ${batch.batchNumber} enviado exitosamente`,
                            )

                            // Delay entre lotes
                            if (i < batches.length - 1) {
                                await new Promise((resolve) =>
                                    setTimeout(
                                        resolve,
                                        this.apiConfig.delayBetweenBatches,
                                    ),
                                )
                            }
                        } catch (error) {
                            const errorMsg = `Error en lote ${batch.batchNumber}: ${error}`
                            apiErrors.push(errorMsg)
                            console.error(errorMsg)
                        }
                    }
                } catch (error) {
                    const errorMsg = `Error general al enviar movimientos: ${error}`
                    apiErrors.push(errorMsg)
                    console.error(errorMsg)
                }
            }

            const processingTime = Date.now() - startTime

            return {
                ...processingResult,
                datasetId,
                statistics: {
                    ...processingResult.statistics,
                    processingTime,
                },
                apiResults: {
                    datasetCreated,
                    movementsAdded,
                    apiErrors,
                },
            }
        } catch (error) {
            const processingTime = Date.now() - startTime
            return {
                success: false,
                errors: [`Error general: ${error}`],
                warnings: [],
                statistics: {
                    totalFiles: files.length,
                    successfulFiles: 0,
                    failedFiles: files.length,
                    totalRows: 0,
                    validRows: 0,
                    invalidRows: 0,
                    totalMovements: 0,
                    processingTime,
                },
                apiResults: {
                    datasetCreated: false,
                    movementsAdded: 0,
                    apiErrors: [`Error general: ${error}`],
                },
            }
        }
    }

    /**
     * Procesa un solo archivo y lo envía a la API
     */
    async processAndUploadSingleFile(
        file: File,
    ): Promise<MMEXProcessingResult> {
        return this.processAndUploadToAPI([file])
    }

    /**
     * Valida archivos antes del procesamiento
     */
    validateFiles(files: File[]): {
        validFiles: File[]
        invalidFiles: { file: File; errors: string[] }[]
        errors: string[]
        warnings: string[]
    } {
        return IO.validateMultipleFilesForUpload(files, this.config.fileConfig)
    }

    /**
     * Estima el tiempo total de procesamiento incluyendo API
     */
    estimateTotalProcessingTime(files: File[]): {
        fileProcessing: {
            totalSize: number
            estimatedTimeMs: number
            estimatedTimeMinutes: number
        }
        apiProcessing: {
            estimatedMovements: number
            estimatedBatches: number
            estimatedTimeMs: number
            estimatedTimeMinutes: number
        }
        total: {
            estimatedTimeMs: number
            estimatedTimeMinutes: number
        }
    } {
        const fileProcessing = this.estimateProcessingTime(files)

        // Estimar movimientos basado en tamaño de archivos
        const estimatedMovements = Math.floor(fileProcessing.totalSize / 100)
        const estimatedBatches = Math.ceil(
            estimatedMovements / this.apiConfig.batchSize,
        )

        // Estimar tiempo de API (2 segundos por lote + delay)
        const apiTimePerBatch = 2000 + this.apiConfig.delayBetweenBatches
        const apiProcessingTime = estimatedBatches * apiTimePerBatch

        return {
            fileProcessing,
            apiProcessing: {
                estimatedMovements,
                estimatedBatches,
                estimatedTimeMs: apiProcessingTime,
                estimatedTimeMinutes: Math.ceil(apiProcessingTime / 60000),
            },
            total: {
                estimatedTimeMs:
                    fileProcessing.estimatedTimeMs + apiProcessingTime,
                estimatedTimeMinutes: Math.ceil(
                    (fileProcessing.estimatedTimeMs + apiProcessingTime) /
                        60000,
                ),
            },
        }
    }
}

/**
 * Funciones de conveniencia para MMEX
 */

/**
 * Procesa archivos CSV con configuración estricta para MMEX
 */
export async function processMMEXFilesStrict(
    files: File[],
    options?: {
        datasetName?: string
        importedBy?: string
        autoCreateDataset?: boolean
    },
): Promise<MMEXProcessingResult> {
    const processor = new MMEXCSVProcessor({
        fileConfig: IO.CSVUploaderPresets.strict,
        strictValidation: true,
        normalizeData: true,
        autoCreateDataset: options?.autoCreateDataset ?? true,
        ...options,
    })
    return processor.processAndUploadToAPI(files)
}

/**
 * Procesa archivos CSV con mapeo personalizado para MMEX
 */
export async function processMMEXFilesWithMapping(
    files: File[],
    columnMapping: Core.ColumnMapping,
    options?: {
        datasetName?: string
        importedBy?: string
        autoCreateDataset?: boolean
    },
): Promise<MMEXProcessingResult> {
    const processor = new MMEXCSVProcessor({
        fileConfig: IO.CSVUploaderPresets.strict,
        useMapping: true,
        columnMapping,
        strictValidation: true,
        normalizeData: true,
        autoCreateDataset: options?.autoCreateDataset ?? true,
        ...options,
    })
    return processor.processAndUploadToAPI(files)
}

/**
 * Procesa archivos CSV con configuración permisiva para MMEX
 */
export async function processMMEXFilesPermissive(
    files: File[],
    options?: {
        datasetName?: string
        importedBy?: string
        autoCreateDataset?: boolean
    },
): Promise<MMEXProcessingResult> {
    const processor = new MMEXCSVProcessor({
        fileConfig: IO.CSVUploaderPresets.permissive,
        strictValidation: false,
        normalizeData: true,
        autoCreateDataset: options?.autoCreateDataset ?? true,
        ...options,
    })
    return processor.processAndUploadToAPI(files)
}

/**
 * Función de compatibilidad que mantiene la interfaz original
 * pero usa la nueva estructura modularizada
 */
export async function processAndUploadCSV(
    file: File,
    datasetName?: string,
    importedBy?: string,
    datasetType: string = 'cashflow',
    columnMapping?: any,
    columnDefinitions?: Array<{
        name: string
        maxCommas?: number
        order: number
    }>,
): Promise<any> {
    try {
        console.log('Procesando CSV con nueva estructura modularizada')

        // Convertir columnDefinitions al formato nuevo si se proporciona
        let coreColumnDefinitions: Core.ColumnDefinition[] | undefined
        if (columnDefinitions) {
            coreColumnDefinitions = columnDefinitions.map((def) => ({
                name: def.name,
                maxCommas: def.maxCommas || 0,
                order: def.order,
            }))
        }

        // Convertir columnMapping al formato nuevo si se proporciona
        let coreColumnMapping: Core.ColumnMapping | undefined
        if (columnMapping) {
            coreColumnMapping = {
                date: columnMapping.date || 'fecha',
                amount: columnMapping.amount || 'importe',
                type: columnMapping.type || 'tipo',
                category: columnMapping.category || 'categoria',
                notes: columnMapping.notes || 'notas',
                beneficiary: columnMapping.beneficiary || 'beneficiario',
                account: columnMapping.account || 'cuenta',
                currency: columnMapping.currency || 'divisa',
                number: columnMapping.number || 'numero',
                status: columnMapping.status || 'estado',
            }
        }

        // Usar el nuevo procesador MMEX
        const processor = new MMEXCSVProcessor({
            datasetName,
            importedBy,
            datasetType,
            columnDefinitions: coreColumnDefinitions,
            columnMapping: coreColumnMapping,
            useMapping: !!columnMapping,
            autoCreateDataset: true,
        })

        console.log('Iniciando procesamiento con MMEXCSVProcessor')
        const result = await processor.processAndUploadSingleFile(file)

        console.log('Resultado del procesamiento MMEX:', {
            success: result.success,
            hasDataset: !!result.dataset,
            datasetId: result.datasetId,
            errors: result.errors,
            warnings: result.warnings,
            statistics: result.statistics,
        })

        if (result.success && result.dataset) {
            // Retornar en el formato esperado por el código existente
            return {
                id: result.datasetId,
                datasetName: result.dataset.datasetName,
                originalFileName: result.dataset.originalFileName,
                importedBy: result.dataset.importedBy,
                currency: result.dataset.currency,
                datasetType: result.dataset.datasetType,
                periodStart: result.dataset.periodStart,
                periodEnd: result.dataset.periodEnd,
                movements: result.dataset.movements,
                statistics: result.statistics,
                apiResults: result.apiResults,
            }
        } else {
            throw new Error(
                `Error en procesamiento: ${result.errors.join(', ')}`,
            )
        }
    } catch (error) {
        console.error('Error en processAndUploadCSV:', error)
        throw error
    }
}

/**
 * Exportar funcionalidades específicas de MMEX
 */
