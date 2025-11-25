/**
 * ============================================
 *  Lector de archivos CSV
 * ============================================
 */

import {
    CSVFileError,
    createCSVFileError,
    CSV_ERROR_MESSAGES,
} from '../core/csv.errors'
import { validateCSVFile } from '../core/csv.validators'
import { normalizeCSVContent } from '../core/csv.normalize'

/**
 * Configuración para lectura de archivos CSV
 */
export interface CSVFileReaderConfig {
    encoding?: string
    maxFileSizeMB?: number
    validateFile?: boolean
    normalizeContent?: boolean
}

/**
 * Resultado de la lectura de un archivo CSV
 */
export interface CSVFileReadResult {
    success: boolean
    content?: string
    fileName?: string
    fileSize?: number
    encoding?: string
    errors: string[]
    warnings: string[]
}

/**
 * Lee el contenido de un archivo CSV usando FileReader
 */
export function readCSVFile(
    file: File,
    config: CSVFileReaderConfig = {},
): Promise<CSVFileReadResult> {
    return new Promise((resolve) => {
        const {
            encoding = 'UTF-8',
            maxFileSizeMB = 10,
            validateFile = true,
            normalizeContent = true,
        } = config

        const errors: string[] = []
        const warnings: string[] = []

        // Validar archivo si está habilitado
        if (validateFile) {
            const validation = validateCSVFile(file)
            if (!validation.isValid) {
                errors.push(...validation.errors)
                resolve({
                    success: false,
                    fileName: file.name,
                    fileSize: file.size,
                    errors,
                    warnings: validation.warnings,
                })
                return
            }
            warnings.push(...validation.warnings)
        }

        // Verificar tamaño máximo personalizado
        if (maxFileSizeMB && file.size > maxFileSizeMB * 1024 * 1024) {
            errors.push(
                `El archivo es demasiado grande (máximo ${maxFileSizeMB}MB)`,
            )
            resolve({
                success: false,
                fileName: file.name,
                fileSize: file.size,
                errors,
                warnings,
            })
            return
        }

        const reader = new FileReader()

        reader.onload = (event) => {
            try {
                let content = event.target?.result as string

                if (!content) {
                    errors.push('No se pudo leer el contenido del archivo')
                    resolve({
                        success: false,
                        fileName: file.name,
                        fileSize: file.size,
                        encoding,
                        errors,
                        warnings,
                    })
                    return
                }

                // Normalizar contenido si está habilitado
                if (normalizeContent) {
                    content = normalizeCSVContent(content)
                }

                resolve({
                    success: true,
                    content,
                    fileName: file.name,
                    fileSize: file.size,
                    encoding,
                    errors,
                    warnings,
                })
            } catch (error) {
                errors.push(`Error al procesar el contenido: ${error}`)
                resolve({
                    success: false,
                    fileName: file.name,
                    fileSize: file.size,
                    encoding,
                    errors,
                    warnings,
                })
            }
        }

        reader.onerror = () => {
            errors.push(CSV_ERROR_MESSAGES.FILE_READ_ERROR)
            resolve({
                success: false,
                fileName: file.name,
                fileSize: file.size,
                encoding,
                errors,
                warnings,
            })
        }

        reader.onabort = () => {
            errors.push('Lectura del archivo cancelada')
            resolve({
                success: false,
                fileName: file.name,
                fileSize: file.size,
                encoding,
                errors,
                warnings,
            })
        }

        // Leer el archivo
        reader.readAsText(file, encoding)
    })
}

/**
 * Lee múltiples archivos CSV en paralelo
 */
export async function readMultipleCSVFiles(
    files: File[],
    config: CSVFileReaderConfig = {},
): Promise<CSVFileReadResult[]> {
    const readPromises = files.map((file) => readCSVFile(file, config))
    return Promise.all(readPromises)
}

/**
 * Lee un archivo CSV con validación estricta
 */
export async function readCSVFileWithStrictValidation(
    file: File,
    config: CSVFileReaderConfig = {},
): Promise<CSVFileReadResult> {
    const strictConfig: CSVFileReaderConfig = {
        ...config,
        validateFile: true,
        normalizeContent: true,
        maxFileSizeMB: config.maxFileSizeMB || 5, // Más restrictivo por defecto
    }

    return readCSVFile(file, strictConfig)
}

/**
 * Lee un archivo CSV con configuración permisiva
 */
export async function readCSVFilePermissive(
    file: File,
    config: CSVFileReaderConfig = {},
): Promise<CSVFileReadResult> {
    const permissiveConfig: CSVFileReaderConfig = {
        ...config,
        validateFile: false,
        normalizeContent: true,
        maxFileSizeMB: config.maxFileSizeMB || 50, // Más permisivo por defecto
    }

    return readCSVFile(file, permissiveConfig)
}

/**
 * Verifica si un archivo es válido para lectura CSV
 */
export function isValidCSVFile(file: File): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const validation = validateCSVFile(file)
    return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
    }
}

/**
 * Obtiene información del archivo sin leer su contenido
 */
export function getCSVFileInfo(file: File): {
    name: string
    size: number
    sizeFormatted: string
    lastModified: Date
    type: string
    extension: string
} {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const sizeFormatted = formatFileSize(file.size)

    return {
        name: file.name,
        size: file.size,
        sizeFormatted,
        lastModified: new Date(file.lastModified),
        type: file.type,
        extension,
    }
}

/**
 * Formatea el tamaño del archivo en una cadena legible
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Estima el tiempo de lectura de un archivo
 */
export function estimateFileReadTime(fileSize: number): {
    estimatedTimeMs: number
    estimatedTimeSeconds: number
} {
    // Estimación basada en tamaño: ~1MB por segundo
    const bytesPerSecond = 1024 * 1024
    const estimatedTimeMs = (fileSize / bytesPerSecond) * 1000
    const estimatedTimeSeconds = Math.ceil(estimatedTimeMs / 1000)

    return {
        estimatedTimeMs,
        estimatedTimeSeconds,
    }
}

/**
 * Crea un objeto File desde un string (para testing o casos especiales)
 */
export function createFileFromString(
    content: string,
    fileName: string = 'data.csv',
    mimeType: string = 'text/csv',
): File {
    const blob = new Blob([content], { type: mimeType })
    return new File([blob], fileName, { type: mimeType })
}

/**
 * Valida múltiples archivos antes de la lectura
 */
export function validateMultipleCSVFiles(files: File[]): {
    validFiles: File[]
    invalidFiles: { file: File; errors: string[] }[]
    totalSize: number
    statistics: {
        totalFiles: number
        validFiles: number
        invalidFiles: number
        totalSizeFormatted: string
    }
} {
    const validFiles: File[] = []
    const invalidFiles: { file: File; errors: string[] }[] = []
    let totalSize = 0

    for (const file of files) {
        const validation = validateCSVFile(file)
        totalSize += file.size

        if (validation.isValid) {
            validFiles.push(file)
        } else {
            invalidFiles.push({
                file,
                errors: validation.errors,
            })
        }
    }

    return {
        validFiles,
        invalidFiles,
        totalSize,
        statistics: {
            totalFiles: files.length,
            validFiles: validFiles.length,
            invalidFiles: invalidFiles.length,
            totalSizeFormatted: formatFileSize(totalSize),
        },
    }
}

/**
 * Monitorea el progreso de lectura de múltiples archivos
 */
export class CSVFileReadProgressMonitor {
    private totalFiles: number = 0
    private completedFiles: number = 0
    private startTime: number = 0
    private onProgress?: (progress: CSVFileReadProgress) => void

    constructor(onProgress?: (progress: CSVFileReadProgress) => void) {
        this.onProgress = onProgress
    }

    start(totalFiles: number): void {
        this.totalFiles = totalFiles
        this.completedFiles = 0
        this.startTime = Date.now()
    }

    updateFileCompleted(fileName: string, success: boolean): void {
        this.completedFiles++

        const progress: CSVFileReadProgress = {
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
 * Información de progreso de lectura de archivos CSV
 */
export interface CSVFileReadProgress {
    fileName: string
    totalFiles: number
    completedFiles: number
    percentage: number
    success: boolean
    elapsedTime: number
    estimatedRemainingTime: number
}
