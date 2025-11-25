/**
 * ============================================
 *  Índice principal del procesador CSV
 * ============================================
 *
 * Este archivo exporta todas las funcionalidades del procesador CSV
 * organizadas por módulos para facilitar el uso.
 */

// Exportar el procesador principal
export * from './csv.processor'

// Exportar módulos individuales
export * as Core from './core'
export * as Parsers from './parsers'
export * as Transformers from './transformers'
export * as IO from './io'

// Exportar tipos principales para conveniencia
export type {
    // Tipos core
    CSVRow,
    Movement,
    APIMovement,
    ProcessedDataset,
    CurrencyCode,
    Category,
    ColumnDefinition,
    ColumnMapping,
    ColumnCommasConfig,
    ParsedCSVLine,
    CSVParseResult,
} from './core/csv.types'

// Exportar clases principales
export { CSVProcessor } from './csv.processor'
export { BatchProgressMonitor } from './transformers/csv.batching'
export { CSVFileReadProgressMonitor } from './io/csv.file-reader'
export { CSVUploadProgressMonitor } from './io/csv.uploader'

// Exportar funciones de conveniencia
export {
    processCSVFilesStrict,
    processCSVFilesPermissive,
    processCSVFilesWithMapping,
    processCSVFilesWithBatching,
} from './csv.processor'

// Exportar configuraciones predefinidas
export { CSVUploaderPresets } from './io/csv.uploader'

// Exportar constantes de errores
export { CSV_ERROR_MESSAGES } from './core/csv.errors'
