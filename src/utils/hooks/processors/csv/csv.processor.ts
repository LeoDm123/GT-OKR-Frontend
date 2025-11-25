/**
 * ============================================
 *  Procesador principal de CSV
 * ============================================
 *
 * Este archivo integra todos los módulos de procesamiento CSV
 * y proporciona una interfaz unificada para el procesamiento completo.
 */

import {
    ProcessedDataset,
    CSVRow,
    Movement,
    APIMovement,
} from './core/csv.types'

// Importar módulos core
import * as Core from './core'

// Importar módulos parsers
import * as Parsers from './parsers'

// Importar módulos transformers
import * as Transformers from './transformers'

// Importar módulos io
import * as IO from './io'

/**
 * Configuración completa para el procesamiento de CSV
 */
export interface CSVProcessorConfig {
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
}

/**
 * Resultado completo del procesamiento de CSV
 */
export interface CSVProcessingResult {
    success: boolean
    dataset?: ProcessedDataset
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
}

/**
 * Procesador principal de CSV que integra todos los módulos
 */
export class CSVProcessor {
    protected config: CSVProcessorConfig

    constructor(config: CSVProcessorConfig = {}) {
        this.config = {
            strictValidation: true,
            normalizeData: true,
            useBatching: false,
            useMapping: false,
            ...config,
        }
    }

    /**
     * Procesa archivos CSV completos desde la carga hasta el dataset final
     */
    async processFiles(files: File[]): Promise<CSVProcessingResult> {
        const startTime = Date.now()
        const errors: string[] = []
        const warnings: string[] = []
        let dataset: ProcessedDataset | undefined
        let batchResults: Transformers.BatchProcessingResult[] | undefined

        try {
            console.log(
                `Iniciando procesamiento de ${files.length} archivos CSV`,
            )

            // 1. Cargar y validar archivos
            const uploadResult = await IO.uploadMultipleCSVFiles(
                files,
                this.config.fileConfig || IO.CSVUploaderPresets.strict,
            )

            if (!uploadResult.success) {
                errors.push(...uploadResult.errors)
                warnings.push(...uploadResult.warnings)
            }

            console.log(
                `Archivos cargados: ${uploadResult.statistics.successfulFiles}/${uploadResult.statistics.totalFiles}`,
            )

            // 2. Procesar contenido de archivos válidos
            const allRows: CSVRow[] = []
            let totalRows = 0
            let validRows = 0
            let invalidRows = 0

            console.log(
                `Procesando ${uploadResult.results.length} resultados de archivos`,
            )

            for (const result of uploadResult.results) {
                console.log(
                    `Procesando resultado para archivo: ${result.file?.name}`,
                    {
                        success: result.success,
                        hasContent: !!result.readResult?.content,
                        contentLength: result.readResult?.content?.length || 0,
                        errors: result.errors,
                        warnings: result.warnings,
                    },
                )

                if (result.success && result.readResult?.content) {
                    try {
                        console.log(
                            `Iniciando parseo para archivo: ${result.file!.name}`,
                        )
                        const rows = await this.parseCSVContent(
                            result.readResult.content,
                            result.file!.name,
                        )

                        console.log(
                            `Parseo exitoso para ${result.file!.name}: ${rows.length} filas`,
                        )
                        allRows.push(...rows)
                        totalRows += rows.length
                        validRows += rows.length
                    } catch (error) {
                        console.error(
                            `Error al parsear ${result.file!.name}:`,
                            error,
                        )
                        invalidRows++
                        errors.push(
                            `Error al parsear ${result.file!.name}: ${error}`,
                        )
                    }
                } else {
                    console.log(
                        `Archivo ${result.file?.name} no se pudo procesar:`,
                        {
                            success: result.success,
                            hasContent: !!result.readResult?.content,
                            errors: result.errors,
                        },
                    )
                    invalidRows++
                    if (result.errors.length > 0) {
                        errors.push(...result.errors)
                    }
                }
            }

            console.log(`Resumen del procesamiento:`, {
                totalRows,
                validRows,
                invalidRows,
                allRowsLength: allRows.length,
            })

            if (allRows.length === 0) {
                console.error(
                    'No se pudieron procesar filas válidas de ningún archivo',
                )
                return {
                    success: false,
                    errors: [
                        'No se pudieron procesar filas válidas de ningún archivo',
                    ],
                    warnings,
                    statistics: {
                        totalFiles: files.length,
                        successfulFiles:
                            uploadResult.statistics.successfulFiles,
                        failedFiles: uploadResult.statistics.failedFiles,
                        totalRows,
                        validRows,
                        invalidRows,
                        totalMovements: 0,
                        processingTime: Date.now() - startTime,
                    },
                }
            }

            // 3. Construir dataset
            const fileName =
                files.length === 1 ? files[0].name : `${files.length}_archivos`
            dataset = Transformers.buildDatasetFromCSVRows(
                allRows,
                fileName,
                this.config.datasetName,
                this.config.importedBy,
                this.config.datasetType || 'cashflow',
            )

            console.log(
                `Dataset construido: ${dataset.movements.length} movimientos`,
            )

            // 4. Procesar por lotes si está habilitado
            if (this.config.useBatching && this.config.batchConfig) {
                batchResults = await this.processDatasetInBatches(dataset)
            }

            const processingTime = Date.now() - startTime

            return {
                success: errors.length === 0,
                dataset,
                errors,
                warnings,
                batchResults,
                statistics: {
                    totalFiles: files.length,
                    successfulFiles: uploadResult.statistics.successfulFiles,
                    failedFiles: uploadResult.statistics.failedFiles,
                    totalRows,
                    validRows,
                    invalidRows,
                    totalMovements: dataset.movements.length,
                    processingTime,
                },
            }
        } catch (error) {
            const processingTime = Date.now() - startTime
            errors.push(`Error general en procesamiento: ${error}`)

            return {
                success: false,
                errors,
                warnings,
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
            }
        }
    }

    /**
     * Procesa un solo archivo CSV
     */
    async processFile(file: File): Promise<CSVProcessingResult> {
        return this.processFiles([file])
    }

    /**
     * Parsea contenido CSV usando la configuración apropiada
     */
    protected async parseCSVContent(
        content: string,
        fileName: string,
    ): Promise<CSVRow[]> {
        console.log(`Parseando contenido CSV para archivo: ${fileName}`)
        console.log(
            `Contenido (primeras 200 chars): ${content.substring(0, 200)}...`,
        )

        let result: any

        if (this.config.useMapping && this.config.columnMapping) {
            console.log('Usando parseo con mapeo personalizado')
            result = Parsers.parseCSVContentWithMapping(
                content,
                this.config.columnMapping,
            )
        } else {
            console.log('Usando parseo estándar')
            result = Parsers.parseCSVContent(
                content,
                this.config.columnDefinitions,
            )
        }

        console.log(`Resultado del parseo:`, {
            rowsCount: result.rows?.length || 0,
            errorsCount: result.errors?.length || 0,
            warningsCount: result.warnings?.length || 0,
            errors: result.errors,
            warnings: result.warnings,
        })

        if (result.errors && result.errors.length > 0) {
            console.error('Errores en el parseo:', result.errors)
        }

        if (result.warnings && result.warnings.length > 0) {
            console.warn('Advertencias en el parseo:', result.warnings)
        }

        if (!result.rows || result.rows.length === 0) {
            throw new Error(
                `No se pudieron parsear filas válidas del archivo ${fileName}. Errores: ${result.errors?.join(', ') || 'Desconocido'}`,
            )
        }

        console.log(`Parseo exitoso: ${result.rows.length} filas procesadas`)
        return result.rows
    }

    /**
     * Procesa un dataset por lotes
     */
    protected async processDatasetInBatches(
        dataset: ProcessedDataset,
    ): Promise<Transformers.BatchProcessingResult[]> {
        const batchResults: Transformers.BatchProcessingResult[] = []

        if (!this.config.batchConfig) {
            throw new Error('Configuración de lotes no proporcionada')
        }

        // Simular procesamiento de lotes (aquí se integraría con la API real)
        const processBatch = async (
            batch: Transformers.BatchInfo,
        ): Promise<void> => {
            console.log(
                `Procesando lote ${batch.batchNumber} con ${batch.size} movimientos`,
            )
            // Aquí iría la lógica real de envío a la API
            await new Promise((resolve) => setTimeout(resolve, 1000)) // Simular delay
        }

        const result = await Transformers.processDatasetInBatches(
            dataset,
            this.config.batchConfig,
            processBatch,
        )

        batchResults.push(result)
        return batchResults
    }

    /**
     * Valida un archivo antes del procesamiento
     */
    validateFile(file: File): {
        isValid: boolean
        errors: string[]
        warnings: string[]
    } {
        return IO.validateFileForUpload(file, this.config.fileConfig)
    }

    /**
     * Valida múltiples archivos antes del procesamiento
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
     * Obtiene información de archivos sin procesarlos
     */
    getFileInfo(files: File[]): Array<{
        name: string
        size: number
        sizeFormatted: string
        lastModified: Date
        type: string
        extension: string
    }> {
        return files.map((file) => IO.getCSVFileInfo(file))
    }

    /**
     * Estima el tiempo de procesamiento
     */
    estimateProcessingTime(files: File[]): {
        totalSize: number
        estimatedTimeMs: number
        estimatedTimeMinutes: number
        batchInfo?: {
            totalBatches: number
            estimatedTimeMs: number
            estimatedTimeMinutes: number
        }
    } {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const readTime = IO.estimateFileReadTime(totalSize)

        let batchInfo: any = undefined
        if (this.config.useBatching && this.config.batchConfig) {
            // Estimar movimientos basado en tamaño (aproximación)
            const estimatedMovements = Math.floor(totalSize / 100) // ~100 bytes por movimiento
            batchInfo = Transformers.estimateBatchProcessingTime(
                estimatedMovements,
                this.config.batchConfig.batchSize || 1000,
                this.config.batchConfig.delayBetweenBatches || 1000,
            )
        }

        return {
            totalSize,
            estimatedTimeMs: readTime.estimatedTimeMs,
            estimatedTimeMinutes: readTime.estimatedTimeSeconds,
            batchInfo,
        }
    }

    /**
     * Actualiza la configuración del procesador
     */
    updateConfig(newConfig: Partial<CSVProcessorConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }

    /**
     * Obtiene la configuración actual
     */
    getConfig(): CSVProcessorConfig {
        return { ...this.config }
    }
}

/**
 * Funciones de conveniencia para casos de uso comunes
 */

/**
 * Procesa archivos CSV con configuración estricta
 */
export async function processCSVFilesStrict(
    files: File[],
    options?: {
        datasetName?: string
        importedBy?: string
    },
): Promise<CSVProcessingResult> {
    const processor = new CSVProcessor({
        fileConfig: IO.CSVUploaderPresets.strict,
        strictValidation: true,
        normalizeData: true,
        ...options,
    })
    return processor.processFiles(files)
}

/**
 * Procesa archivos CSV con configuración permisiva
 */
export async function processCSVFilesPermissive(
    files: File[],
    options?: {
        datasetName?: string
        importedBy?: string
    },
): Promise<CSVProcessingResult> {
    const processor = new CSVProcessor({
        fileConfig: IO.CSVUploaderPresets.permissive,
        strictValidation: false,
        normalizeData: true,
        ...options,
    })
    return processor.processFiles(files)
}

/**
 * Procesa archivos CSV con mapeo personalizado
 */
export async function processCSVFilesWithMapping(
    files: File[],
    columnMapping: Core.ColumnMapping,
    options?: {
        datasetName?: string
        importedBy?: string
    },
): Promise<CSVProcessingResult> {
    const processor = new CSVProcessor({
        fileConfig: IO.CSVUploaderPresets.strict,
        useMapping: true,
        columnMapping,
        strictValidation: true,
        normalizeData: true,
        ...options,
    })
    return processor.processFiles(files)
}

/**
 * Procesa archivos CSV con procesamiento por lotes
 */
export async function processCSVFilesWithBatching(
    files: File[],
    batchConfig: Transformers.BatchConfig,
    options?: {
        datasetName?: string
        importedBy?: string
    },
): Promise<CSVProcessingResult> {
    const processor = new CSVProcessor({
        fileConfig: IO.CSVUploaderPresets.permissive,
        useBatching: true,
        batchConfig,
        strictValidation: true,
        normalizeData: true,
        ...options,
    })
    return processor.processFiles(files)
}

/**
 * Exporta todas las funcionalidades de los módulos
 */
export {
    // Core
    Core,
    // Parsers
    Parsers,
    // Transformers
    Transformers,
    // IO
    IO,
}
