/**
 * ============================================
 *  Cargador de archivos CSV
 * ============================================
 */

import {
    CSVFileError,
    createCSVFileError,
    CSV_ERROR_MESSAGES,
} from '../core/csv.errors'
import { validateCSVFile } from '../core/csv.validators'
import {
    readCSVFile,
    CSVFileReadResult,
    CSVFileReaderConfig,
} from './csv.file-reader'

/**
 * Configuración para carga de archivos CSV
 */
export interface CSVUploaderConfig {
    maxFiles?: number
    maxFileSizeMB?: number
    allowedExtensions?: string[]
    allowedMimeTypes?: string[]
    autoRead?: boolean
    readerConfig?: CSVFileReaderConfig
}

/**
 * Resultado de la carga de un archivo CSV
 */
export interface CSVUploadResult {
    success: boolean
    file?: File
    readResult?: CSVFileReadResult
    errors: string[]
    warnings: string[]
}

/**
 * Resultado de la carga de múltiples archivos CSV
 */
export interface CSVMultipleUploadResult {
    success: boolean
    results: CSVUploadResult[]
    statistics: {
        totalFiles: number
        successfulFiles: number
        failedFiles: number
        totalSize: number
        totalSizeFormatted: string
    }
    errors: string[]
    warnings: string[]
}

/**
 * Valida un archivo antes de la carga
 */
export function validateFileForUpload(
    file: File,
    config: CSVUploaderConfig = {},
): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar extensión
    if (config.allowedExtensions && config.allowedExtensions.length > 0) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!extension || !config.allowedExtensions.includes(extension)) {
            errors.push(
                `Extensión no permitida. Extensiones permitidas: ${config.allowedExtensions.join(', ')}`,
            )
        }
    }

    // Validar tipo MIME
    if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
        if (!config.allowedMimeTypes.includes(file.type)) {
            errors.push(
                `Tipo de archivo no permitido. Tipos permitidos: ${config.allowedMimeTypes.join(', ')}`,
            )
        }
    }

    // Validar tamaño máximo
    if (config.maxFileSizeMB) {
        const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024
        if (file.size > maxSizeBytes) {
            errors.push(
                `El archivo es demasiado grande. Tamaño máximo: ${config.maxFileSizeMB}MB`,
            )
        }
    }

    // Validar archivo CSV básico
    const csvValidation = validateCSVFile(file)
    if (!csvValidation.isValid) {
        errors.push(...csvValidation.errors)
    }
    warnings.push(...csvValidation.warnings)

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}

/**
 * Valida múltiples archivos antes de la carga
 */
export function validateMultipleFilesForUpload(
    files: File[],
    config: CSVUploaderConfig = {},
): {
    validFiles: File[]
    invalidFiles: { file: File; errors: string[] }[]
    errors: string[]
    warnings: string[]
} {
    const validFiles: File[] = []
    const invalidFiles: { file: File; errors: string[] }[] = []
    const allErrors: string[] = []
    const allWarnings: string[] = []

    // Validar número máximo de archivos
    if (config.maxFiles && files.length > config.maxFiles) {
        allErrors.push(
            `Demasiados archivos. Máximo permitido: ${config.maxFiles}`,
        )
    }

    for (const file of files) {
        const validation = validateFileForUpload(file, config)

        if (validation.isValid) {
            validFiles.push(file)
        } else {
            invalidFiles.push({
                file,
                errors: validation.errors,
            })
        }

        allWarnings.push(...validation.warnings)
    }

    return {
        validFiles,
        invalidFiles,
        errors: allErrors,
        warnings: allWarnings,
    }
}

/**
 * Carga un archivo CSV con validación y lectura automática
 */
export async function uploadCSVFile(
    file: File,
    config: CSVUploaderConfig = {},
): Promise<CSVUploadResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
        // Validar archivo
        const validation = validateFileForUpload(file, config)
        if (!validation.isValid) {
            return {
                success: false,
                file,
                errors: validation.errors,
                warnings: validation.warnings,
            }
        }

        warnings.push(...validation.warnings)

        let readResult: CSVFileReadResult | undefined

        // Leer archivo si está habilitado
        if (config.autoRead !== false) {
            const readerConfig = config.readerConfig || {}
            readResult = await readCSVFile(file, readerConfig)

            if (!readResult.success) {
                errors.push(...readResult.errors)
                warnings.push(...readResult.warnings)
            }
        }

        return {
            success: errors.length === 0,
            file,
            readResult,
            errors,
            warnings,
        }
    } catch (error) {
        const errorMsg = `Error al cargar archivo: ${error}`
        errors.push(errorMsg)
        return {
            success: false,
            file,
            errors,
            warnings,
        }
    }
}

/**
 * Carga múltiples archivos CSV
 */
export async function uploadMultipleCSVFiles(
    files: File[],
    config: CSVUploaderConfig = {},
): Promise<CSVMultipleUploadResult> {
    const results: CSVUploadResult[] = []
    const allErrors: string[] = []
    const allWarnings: string[] = []

    try {
        // Validar archivos
        const validation = validateMultipleFilesForUpload(files, config)
        allErrors.push(...validation.errors)
        allWarnings.push(...validation.warnings)

        if (validation.validFiles.length === 0) {
            return {
                success: false,
                results: [],
                statistics: {
                    totalFiles: files.length,
                    successfulFiles: 0,
                    failedFiles: files.length,
                    totalSize: files.reduce((sum, f) => sum + f.size, 0),
                    totalSizeFormatted: '0 Bytes',
                },
                errors: allErrors,
                warnings: allWarnings,
            }
        }

        // Cargar archivos válidos
        const uploadPromises = validation.validFiles.map((file) =>
            uploadCSVFile(file, config),
        )
        const uploadResults = await Promise.all(uploadPromises)

        // Procesar resultados
        let successfulFiles = 0
        let failedFiles = validation.invalidFiles.length
        let totalSize = 0

        for (const result of uploadResults) {
            results.push(result)
            totalSize += result.file?.size || 0

            if (result.success) {
                successfulFiles++
            } else {
                failedFiles++
                allErrors.push(...result.errors)
            }

            allWarnings.push(...result.warnings)
        }

        // Agregar archivos inválidos a los resultados
        for (const invalidFile of validation.invalidFiles) {
            results.push({
                success: false,
                file: invalidFile.file,
                errors: invalidFile.errors,
                warnings: [],
            })
            totalSize += invalidFile.file.size
        }

        return {
            success: failedFiles === 0,
            results,
            statistics: {
                totalFiles: files.length,
                successfulFiles,
                failedFiles,
                totalSize,
                totalSizeFormatted: formatFileSize(totalSize),
            },
            errors: allErrors,
            warnings: allWarnings,
        }
    } catch (error) {
        const errorMsg = `Error al cargar archivos: ${error}`
        allErrors.push(errorMsg)

        return {
            success: false,
            results,
            statistics: {
                totalFiles: files.length,
                successfulFiles: 0,
                failedFiles: files.length,
                totalSize: files.reduce((sum, f) => sum + f.size, 0),
                totalSizeFormatted: '0 Bytes',
            },
            errors: allErrors,
            warnings: allWarnings,
        }
    }
}

/**
 * Crea un input de archivo HTML para selección de CSV
 */
export function createCSVFileInput(
    config: CSVUploaderConfig = {},
): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,text/csv'
    input.multiple = (config.maxFiles || 1) > 1

    // Configurar atributos adicionales
    if (config.allowedExtensions) {
        const acceptString = config.allowedExtensions
            .map((ext) => `.${ext}`)
            .join(',')
        input.accept = acceptString
    }

    return input
}

/**
 * Maneja el evento de selección de archivos
 */
export async function handleFileSelection(
    event: Event,
    config: CSVUploaderConfig = {},
): Promise<CSVMultipleUploadResult> {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (!files || files.length === 0) {
        return {
            success: false,
            results: [],
            statistics: {
                totalFiles: 0,
                successfulFiles: 0,
                failedFiles: 0,
                totalSize: 0,
                totalSizeFormatted: '0 Bytes',
            },
            errors: ['No se seleccionaron archivos'],
            warnings: [],
        }
    }

    const fileArray = Array.from(files)
    return uploadMultipleCSVFiles(fileArray, config)
}

/**
 * Formatea el tamaño del archivo en una cadena legible
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Configuraciones predefinidas para diferentes casos de uso
 */
export const CSVUploaderPresets = {
    /**
     * Configuración estricta para archivos pequeños
     */
    strict: {
        maxFiles: 1,
        maxFileSizeMB: 5,
        allowedExtensions: ['csv'],
        allowedMimeTypes: ['text/csv', 'application/csv'],
        autoRead: true,
        readerConfig: {
            validateFile: true,
            normalizeContent: true,
        },
    } as CSVUploaderConfig,

    /**
     * Configuración permisiva para archivos grandes
     */
    permissive: {
        maxFiles: 10,
        maxFileSizeMB: 50,
        allowedExtensions: ['csv', 'txt'],
        allowedMimeTypes: ['text/csv', 'application/csv', 'text/plain'],
        autoRead: true,
        readerConfig: {
            validateFile: false,
            normalizeContent: true,
        },
    } as CSVUploaderConfig,

    /**
     * Configuración para múltiples archivos
     */
    multiple: {
        maxFiles: 5,
        maxFileSizeMB: 20,
        allowedExtensions: ['csv'],
        allowedMimeTypes: ['text/csv', 'application/csv'],
        autoRead: true,
        readerConfig: {
            validateFile: true,
            normalizeContent: true,
        },
    } as CSVUploaderConfig,

    /**
     * Configuración solo validación (sin lectura automática)
     */
    validationOnly: {
        maxFiles: 10,
        maxFileSizeMB: 100,
        allowedExtensions: ['csv'],
        allowedMimeTypes: ['text/csv', 'application/csv'],
        autoRead: false,
    } as CSVUploaderConfig,
}

/**
 * Monitorea el progreso de carga de múltiples archivos
 */
export class CSVUploadProgressMonitor {
    private totalFiles: number = 0
    private completedFiles: number = 0
    private startTime: number = 0
    private onProgress?: (progress: CSVUploadProgress) => void

    constructor(onProgress?: (progress: CSVUploadProgress) => void) {
        this.onProgress = onProgress
    }

    start(totalFiles: number): void {
        this.totalFiles = totalFiles
        this.completedFiles = 0
        this.startTime = Date.now()
    }

    updateFileCompleted(fileName: string, success: boolean): void {
        this.completedFiles++

        const progress: CSVUploadProgress = {
            fileName,
            totalFiles: this.totalFiles,
            completedFiles: this.completedFiles,
            percentage: (this.completedFiles / this.totalFiles) * 100,
            success,
            elapsedTime: Date.now() - this.startTime,
            estimatedRemainingTime: this.estimateRemainingTime(),
        }

        this.onProgress?.(progress)
    }

    private estimateRemainingTime(): number {
        if (this.completedFiles === 0) return 0

        const elapsedTime = Date.now() - this.startTime
        const averageTimePerFile = elapsedTime / this.completedFiles
        const remainingFiles = this.totalFiles - this.completedFiles

        return remainingFiles * averageTimePerFile
    }
}

/**
 * Información de progreso de carga de archivos CSV
 */
export interface CSVUploadProgress {
    fileName: string
    totalFiles: number
    completedFiles: number
    percentage: number
    success: boolean
    elapsedTime: number
    estimatedRemainingTime: number
}
