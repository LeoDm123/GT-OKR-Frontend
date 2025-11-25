/**
 * ============================================
 *  Errores específicos para procesamiento CSV
 * ============================================
 */

export class CSVParseError extends Error {
    constructor(
        message: string,
        public lineNumber?: number,
        public originalLine?: string,
    ) {
        super(message)
        this.name = 'CSVParseError'
    }
}

export class CSVValidationError extends Error {
    constructor(
        message: string,
        public field?: string,
        public value?: any,
    ) {
        super(message)
        this.name = 'CSVValidationError'
    }
}

export class CSVFormatError extends Error {
    constructor(
        message: string,
        public expectedFormat?: string,
        public actualFormat?: string,
    ) {
        super(message)
        this.name = 'CSVFormatError'
    }
}

export class CSVColumnMappingError extends Error {
    constructor(
        message: string,
        public columnName?: string,
        public mappingConfig?: any,
    ) {
        super(message)
        this.name = 'CSVColumnMappingError'
    }
}

export class CSVFileError extends Error {
    constructor(
        message: string,
        public fileName?: string,
    ) {
        super(message)
        this.name = 'CSVFileError'
    }
}

// Funciones helper para crear errores específicos
export const createCSVParseError = (
    message: string,
    lineNumber?: number,
    originalLine?: string,
): CSVParseError => {
    return new CSVParseError(message, lineNumber, originalLine)
}

export const createCSVValidationError = (
    message: string,
    field?: string,
    value?: any,
): CSVValidationError => {
    return new CSVValidationError(message, field, value)
}

export const createCSVFormatError = (
    message: string,
    expectedFormat?: string,
    actualFormat?: string,
): CSVFormatError => {
    return new CSVFormatError(message, expectedFormat, actualFormat)
}

export const createCSVColumnMappingError = (
    message: string,
    columnName?: string,
    mappingConfig?: any,
): CSVColumnMappingError => {
    return new CSVColumnMappingError(message, columnName, mappingConfig)
}

export const createCSVFileError = (
    message: string,
    fileName?: string,
): CSVFileError => {
    return new CSVFileError(message, fileName)
}

// Mensajes de error predefinidos
export const CSV_ERROR_MESSAGES = {
    EMPTY_FILE: 'El archivo CSV está vacío',
    NO_ROWS: 'El archivo CSV no tiene filas',
    INSUFFICIENT_COLUMNS: 'Fila con columnas insuficientes',
    MISSING_REQUIRED_FIELD: 'Campo requerido faltante',
    INVALID_DATE_FORMAT: 'Formato de fecha inválido',
    INVALID_NUMBER_FORMAT: 'Formato de número inválido',
    INVALID_CURRENCY_CODE: 'Código de moneda inválido',
    COLUMN_MAPPING_NOT_FOUND: 'Mapeo de columna no encontrado',
    DUPLICATE_COLUMN_MAPPING: 'Mapeo de columna duplicado',
    INVALID_COLUMN_DEFINITION: 'Definición de columna inválida',
    FILE_READ_ERROR: 'Error al leer el archivo',
    PARSE_LINE_ERROR: 'Error al parsear línea',
    VALIDATION_ERROR: 'Error de validación',
    UNKNOWN_ERROR: 'Error desconocido',
} as const

// Tipos para los mensajes de error
export type CSVErrorMessage =
    (typeof CSV_ERROR_MESSAGES)[keyof typeof CSV_ERROR_MESSAGES]
