/**
 * ============================================
 *  Validadores para procesamiento CSV
 * ============================================
 */

import {
    CSVRow,
    ColumnDefinition,
    ColumnMapping,
    CurrencyCode,
} from './csv.types'
import { CSVValidationError, createCSVValidationError } from './csv.errors'

/**
 * Valida el formato de una fecha DD/MM/YY o DD/MM/YYYY
 */
export function validateDateFormat(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') {
        return false
    }

    const trimmed = dateStr.trim()
    if (!trimmed) return false

    // Patrón para DD/MM/YY o DD/MM/YYYY
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
    const match = trimmed.match(datePattern)

    if (!match) return false

    const [, day, month, year] = match
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)

    // Validar rangos
    if (dayNum < 1 || dayNum > 31) return false
    if (monthNum < 1 || monthNum > 12) return false
    if (yearNum < 1900 || yearNum > 2100) return false

    // Validar días por mes (simplificado)
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (dayNum > daysInMonth[monthNum - 1]) return false

    return true
}

/**
 * Valida un código de moneda
 */
export function validateCurrencyCode(currency: string): boolean {
    if (!currency || typeof currency !== 'string') {
        return false
    }

    const validCurrencies: CurrencyCode[] = [
        'ARS',
        'USD',
        'EUR',
        'BRL',
        'CLP',
        'COP',
        'MXN',
    ]
    return validCurrencies.includes(currency.toUpperCase())
}

/**
 * Valida un importe numérico
 */
export function validateAmount(amount: number | string): boolean {
    if (typeof amount === 'number') {
        return !isNaN(amount) && isFinite(amount)
    }

    if (typeof amount === 'string') {
        const cleaned = amount.replace(/[^\d.-]/g, '')
        const parsed = parseFloat(cleaned)
        return !isNaN(parsed) && isFinite(parsed)
    }

    return false
}

/**
 * Valida un tipo de movimiento
 */
export function validateMovementType(type: string): boolean {
    if (!type || typeof type !== 'string') {
        return false
    }

    const normalizedType = type.toLowerCase().trim()
    return normalizedType === 'ingreso' || normalizedType === 'egreso'
}

/**
 * Valida que una categoría tenga formato válido
 */
export function validateCategory(category: string): boolean {
    if (!category || typeof category !== 'string') {
        return false
    }

    const trimmed = category.trim()
    if (!trimmed) return false

    // Debe tener al menos un carácter alfanumérico
    return /[a-zA-Z0-9]/.test(trimmed)
}

/**
 * Valida una fila CSV completa
 */
export function validateCSVRow(row: Partial<CSVRow>): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Validar fecha
    if (!row.fecha || !validateDateFormat(row.fecha)) {
        errors.push('Fecha inválida o faltante')
    }

    // Validar categoría
    if (!row.categoria || !validateCategory(row.categoria)) {
        errors.push('Categoría inválida o faltante')
    }

    // Validar importe
    if (
        row.importe === undefined ||
        row.importe === null ||
        !validateAmount(row.importe)
    ) {
        errors.push('Importe inválido o faltante')
    }

    // Validar divisa
    if (row.divisa && !validateCurrencyCode(row.divisa)) {
        errors.push('Código de divisa inválido')
    }

    // Validar tipo si está presente
    if (row.tipo && !validateMovementType(row.tipo)) {
        errors.push('Tipo de movimiento inválido')
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Valida la estructura de definiciones de columnas
 */
export function validateColumnDefinitions(definitions: ColumnDefinition[]): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!Array.isArray(definitions)) {
        errors.push('Las definiciones de columnas deben ser un array')
        return { isValid: false, errors }
    }

    if (definitions.length === 0) {
        errors.push('Debe haber al menos una definición de columna')
        return { isValid: false, errors }
    }

    const names = new Set<string>()
    const orders = new Set<number>()

    for (const def of definitions) {
        // Validar nombre
        if (!def.name || typeof def.name !== 'string' || !def.name.trim()) {
            errors.push('Nombre de columna inválido')
        } else if (names.has(def.name)) {
            errors.push(`Nombre de columna duplicado: ${def.name}`)
        } else {
            names.add(def.name)
        }

        // Validar orden
        if (typeof def.order !== 'number' || def.order < 1) {
            errors.push(
                `Orden inválido para columna ${def.name}: debe ser un número >= 1`,
            )
        } else if (orders.has(def.order)) {
            errors.push(`Orden duplicado: ${def.order}`)
        } else {
            orders.add(def.order)
        }

        // Validar maxCommas si está presente
        if (
            def.maxCommas !== undefined &&
            (typeof def.maxCommas !== 'number' || def.maxCommas < 0)
        ) {
            errors.push(
                `maxCommas inválido para columna ${def.name}: debe ser un número >= 0`,
            )
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Valida el mapeo de columnas
 */
export function validateColumnMapping(
    mapping: ColumnMapping,
    availableHeaders: string[],
): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!mapping || typeof mapping !== 'object') {
        errors.push('El mapeo de columnas debe ser un objeto')
        return { isValid: false, errors }
    }

    const requiredFields = ['fecha', 'categoria']
    const optionalFields = [
        'identificador',
        'estado',
        'tipo',
        'cuenta',
        'beneficiario',
        'importe',
        'egreso',
        'ingreso',
        'divisa',
        'numero',
        'nota',
    ]

    // Validar campos requeridos
    for (const field of requiredFields) {
        if (!mapping[field]) {
            errors.push(`Campo requerido faltante: ${field}`)
        } else if (!availableHeaders.includes(mapping[field])) {
            errors.push(
                `Columna mapeada para '${field}' no existe en el CSV: ${mapping[field]}`,
            )
        }
    }

    // Validar que al menos uno de egreso, ingreso o importe esté presente
    const hasEgreso =
        mapping['egreso'] && availableHeaders.includes(mapping['egreso'])
    const hasIngreso =
        mapping['ingreso'] && availableHeaders.includes(mapping['ingreso'])
    const hasImporte =
        mapping['importe'] && availableHeaders.includes(mapping['importe'])

    if (!hasEgreso && !hasIngreso && !hasImporte) {
        errors.push(
            'Se requiere al menos una columna de egreso, ingreso o importe',
        )
    }

    // Validar campos opcionales
    for (const field of optionalFields) {
        if (mapping[field] && !availableHeaders.includes(mapping[field])) {
            errors.push(
                `Columna mapeada para '${field}' no existe en el CSV: ${mapping[field]}`,
            )
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Valida el contenido de un archivo CSV
 */
export function validateCSVContent(content: string): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!content || typeof content !== 'string') {
        errors.push('El contenido del CSV debe ser una cadena de texto')
        return { isValid: false, errors }
    }

    const trimmed = content.trim()
    if (!trimmed) {
        errors.push('El archivo CSV está vacío')
        return { isValid: false, errors }
    }

    const lines = trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    if (lines.length === 0) {
        errors.push('El archivo CSV no tiene filas válidas')
        return { isValid: false, errors }
    }

    if (lines.length === 1) {
        errors.push(
            'El archivo CSV solo tiene una fila (probablemente solo header)',
        )
        return { isValid: false, errors }
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Valida que un archivo tenga la extensión correcta
 */
export function validateFileExtension(fileName: string): boolean {
    if (!fileName || typeof fileName !== 'string') {
        return false
    }

    const extension = fileName.toLowerCase().split('.').pop()
    return extension === 'csv'
}

/**
 * Valida el tamaño de un archivo
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    if (!file || !(file instanceof File)) {
        return false
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
}

/**
 * Función de validación completa para un archivo CSV
 */
export function validateCSVFile(file: File): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar extensión
    if (!validateFileExtension(file.name)) {
        errors.push('El archivo debe tener extensión .csv')
    }

    // Validar tamaño
    if (!validateFileSize(file, 10)) {
        errors.push('El archivo es demasiado grande (máximo 10MB)')
    }

    // Validar que el archivo no esté vacío
    if (file.size === 0) {
        errors.push('El archivo está vacío')
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}
