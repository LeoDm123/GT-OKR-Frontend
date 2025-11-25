/**
 * ============================================
 *  Funciones de normalización para CSV
 * ============================================
 */

import { CSVRow, Movement, Category } from './csv.types'

/**
 * Normaliza una fecha de formato DD/MM/YY o DD/MM/YYYY
 * Mantiene el formato original pero asegura consistencia
 */
export function normalizeDate(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') {
        return ''
    }

    const trimmed = dateStr.trim()
    if (!trimmed) return ''

    // Verificar formato DD/MM/YY o DD/MM/YYYY
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
    const match = trimmed.match(datePattern)

    if (!match) {
        return trimmed // Retornar original si no coincide con el patrón
    }

    const [, day, month, year] = match

    // Normalizar a DD/MM/YYYY
    const normalizedDay = day.padStart(2, '0')
    const normalizedMonth = month.padStart(2, '0')
    const normalizedYear = year.length === 2 ? `20${year}` : year

    return `${normalizedDay}/${normalizedMonth}/${normalizedYear}`
}

/**
 * Normaliza una categoría separando grupo y subgrupo
 */
export function normalizeCategory(categoryStr: string): Category {
    if (!categoryStr || typeof categoryStr !== 'string') {
        return { grupo: '', subgrupo: undefined }
    }

    const trimmed = categoryStr.trim()
    if (!trimmed) {
        return { grupo: '', subgrupo: undefined }
    }

    const colonIndex = trimmed.indexOf(':')

    if (colonIndex >= 0) {
        const grupo = trimmed.slice(0, colonIndex).trim()
        const subgrupo = trimmed.slice(colonIndex + 1).trim()

        return {
            grupo: grupo || '',
            subgrupo: subgrupo || undefined,
        }
    }

    return { grupo: trimmed, subgrupo: undefined }
}

/**
 * Normaliza un importe numérico
 */
export function normalizeAmount(amountStr: string | number): number {
    if (typeof amountStr === 'number') {
        return Math.abs(amountStr)
    }

    if (!amountStr || typeof amountStr !== 'string') {
        return 0
    }

    // Limpiar caracteres no numéricos excepto punto y guión
    const cleaned = amountStr.replace(/[^\d.-]/g, '').trim()

    if (!cleaned) {
        return 0
    }

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : Math.abs(parsed)
}

/**
 * Normaliza un código de divisa
 */
export function normalizeCurrency(currencyStr: string): string {
    if (!currencyStr || typeof currencyStr !== 'string') {
        return 'ARS'
    }

    const trimmed = currencyStr.trim().toUpperCase()

    // Códigos de moneda válidos comunes
    const validCurrencies = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN']

    if (validCurrencies.includes(trimmed)) {
        return trimmed
    }

    // Si no es válido, usar ARS por defecto
    return 'ARS'
}

/**
 * Normaliza un tipo de movimiento basado en el importe
 */
export function normalizeMovementType(
    amount: number,
    typeStr?: string,
): 'ingreso' | 'egreso' {
    if (typeStr && typeof typeStr === 'string') {
        const normalizedType = typeStr.toLowerCase().trim()
        if (normalizedType === 'ingreso' || normalizedType === 'egreso') {
            return normalizedType as 'ingreso' | 'egreso'
        }
    }

    // Si no hay tipo específico, determinar por el signo del importe
    return amount >= 0 ? 'ingreso' : 'egreso'
}

/**
 * Normaliza una nota o descripción
 */
export function normalizeNote(noteStr: string): string | undefined {
    if (!noteStr || typeof noteStr !== 'string') {
        return undefined
    }

    const trimmed = noteStr.trim()
    return trimmed || undefined
}

/**
 * Normaliza un identificador externo
 */
export function normalizeExternalId(idStr: string): string | undefined {
    if (!idStr || typeof idStr !== 'string') {
        return undefined
    }

    const trimmed = idStr.trim()
    return trimmed || undefined
}

/**
 * Normaliza una fila CSV completa
 */
export function normalizeCSVRow(row: Partial<CSVRow>): CSVRow {
    return {
        identificador: row.identificador || '',
        fecha: normalizeDate(row.fecha || ''),
        estado: row.estado || '',
        tipo: row.tipo || '',
        cuenta: row.cuenta || '',
        beneficiario: row.beneficiario || '',
        categoria: row.categoria || '',
        importe: normalizeAmount(row.importe || 0),
        divisa: normalizeCurrency(row.divisa || 'ARS'),
        numero: row.numero || '',
        notas: row.notas || '',
    }
}

/**
 * Convierte una fila CSV normalizada a un Movement
 */
export function csvRowToMovement(row: CSVRow): Movement | null {
    try {
        const fecha = normalizeDate(row.fecha)
        if (!fecha) return null

        const categoria = normalizeCategory(row.categoria)
        if (!categoria.grupo) return null

        const monto = normalizeAmount(row.importe)
        if (monto === 0) return null

        const tipo = normalizeMovementType(monto, row.tipo)
        const nota = normalizeNote(row.notas)
        const externalId = normalizeExternalId(row.identificador)

        return {
            fecha,
            categoria,
            tipo,
            monto,
            nota,
            externalId,
        }
    } catch (error) {
        console.error('Error en csvRowToMovement:', error)
        return null
    }
}

/**
 * Normaliza un array de movimientos ordenándolos por fecha
 */
export function normalizeMovementsByDate(movements: Movement[]): Movement[] {
    return movements.sort((a, b) => {
        // Usar una función auxiliar para ordenar fechas DD/MM/YYYY
        const dateA = a.fecha.split('/').reverse().join('')
        const dateB = b.fecha.split('/').reverse().join('')
        return dateA.localeCompare(dateB)
    })
}

/**
 * Normaliza el contenido de un CSV eliminando caracteres problemáticos
 */
export function normalizeCSVContent(content: string): string {
    if (!content || typeof content !== 'string') {
        return ''
    }

    return content
        .replace(/\r\n/g, '\n') // Normalizar saltos de línea
        .replace(/\r/g, '\n') // Convertir \r a \n
        .trim() // Eliminar espacios al inicio y final
}

/**
 * Normaliza las líneas de un CSV eliminando líneas vacías
 */
export function normalizeCSVLines(lines: string[]): string[] {
    return lines.map((line) => line.trim()).filter((line) => line.length > 0)
}
