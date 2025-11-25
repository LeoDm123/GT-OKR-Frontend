/**
 * ============================================
 *  Tipos para procesamiento de CSV
 * ============================================
 */

export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | string

export interface CSVRow {
    identificador: string
    fecha: string // DD/MM/YY o DD/MM/YYYY, texto literal
    estado: string
    tipo: string
    cuenta: string
    beneficiario: string
    categoria: string
    importe: number
    divisa: CurrencyCode
    numero: string
    notas: string
}

export interface Category {
    grupo: string
    subgrupo?: string
}

export interface Movement {
    fecha: string
    categoria: Category
    tipo: 'ingreso' | 'egreso'
    monto: number
    saldo?: number
    nota?: string
    identificador?: string
}

export interface APIMovement {
    fecha: string
    categoria: Category
    tipo: 'ingreso' | 'egreso'
    monto: number
    saldo?: number
    nota?: string
    source?: string
    identificador?: string
}

export interface ProcessedDataset {
    datasetName: string
    originalFileName: string
    importedBy?: string
    currency: CurrencyCode
    datasetType: string
    movements: Movement[]
    periodStart?: string
    periodEnd?: string
}

export interface ColumnDefinition {
    name: string
    maxCommas?: number
    order: number
}

export interface ColumnMapping {
    [fieldName: string]: string
}

export interface ColumnCommasConfig {
    [columnIndex: number]: number
}

export interface ParsedCSVLine {
    tokens: string[]
    originalLine: string
    lineNumber: number
}

export interface CSVParseResult {
    rows: CSVRow[]
    errors: string[]
    warnings: string[]
    metadata: {
        totalLines: number
        validRows: number
        invalidRows: number
        expectedColumns: number
    }
}
