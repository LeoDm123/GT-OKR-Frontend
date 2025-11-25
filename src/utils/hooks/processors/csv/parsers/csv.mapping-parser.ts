/**
 * ============================================
 *  Parser CSV con mapeo de columnas personalizado
 * ============================================
 */

import { CSVRow, ColumnMapping, CSVParseResult } from '../core/csv.types'
import { CSVParseError, CSV_ERROR_MESSAGES } from '../core/csv.errors'
import { createColumnIndexMap, extractNumber } from '../core/csv.utils'
import { parseCSVLineWithSmartCategoryDetection } from './csv.line-parser'

/**
 * Parsea contenido CSV usando un mapeo de columnas personalizado
 */
export function parseCSVContentWithMapping(
    csvContent: string,
    columnMapping: ColumnMapping,
): CSVParseResult {
    const rawLines = csvContent
        .split('\n')
        .map((l) => l.replace(/\r$/, ''))
        .filter((line) => line.trim() !== '')

    if (rawLines.length < 1) {
        return {
            rows: [],
            errors: [new CSVParseError(CSV_ERROR_MESSAGES.NO_ROWS)],
            warnings: [],
            metadata: {
                totalLines: 0,
                validRows: 0,
                invalidRows: 0,
                expectedColumns: 0,
            },
        }
    }

    const headerTokens = parseCSVLineWithSmartCategoryDetection(
        rawLines[0],
        0,
    ).map((h) => h.trim())
    const expectedColumns = headerTokens.length

    // Crear un mapa de índices basado en el mapeo de columnas
    const columnIndexMap = createColumnIndexMap(headerTokens)

    // Validar el mapeo de columnas
    const mappingValidation = validateColumnMapping(columnMapping, headerTokens)
    if (!mappingValidation.isValid) {
        return {
            rows: [],
            errors: mappingValidation.errors.map(
                (error) => new CSVParseError(error),
            ),
            warnings: [],
            metadata: {
                totalLines: rawLines.length,
                validRows: 0,
                invalidRows: rawLines.length,
                expectedColumns,
            },
        }
    }

    const startIndex = 1 // Asumir que siempre hay header
    const rows: CSVRow[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (let i = startIndex; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line) continue

        try {
            const tokens = parseCSVLineWithSmartCategoryDetection(
                line,
                expectedColumns,
                undefined, // No tenemos configuración de comas en este contexto
            ).map((t) => t.trim())

            if (tokens.length < 3) {
                const warning = `Fila ${i + 1}: tokens insuficientes`
                warnings.push(warning)
                console.warn(warning, { line, tokens })
                continue
            }

            const row = parseTokensWithMapping(
                tokens,
                columnMapping,
                columnIndexMap,
                i + 1,
            )
            if (row) {
                rows.push(row)
            } else {
                errors.push(`Fila ${i + 1}: no se pudo crear CSVRow válido`)
            }
        } catch (error) {
            const errorMsg = `Fila ${i + 1}: error al procesar - ${error}`
            errors.push(errorMsg)
            console.error(errorMsg, { line, error })
        }
    }

    if (rows.length === 0) {
        errors.push('No se encontraron filas válidas después del parseo')
    }

    return {
        rows,
        errors,
        warnings,
        metadata: {
            totalLines: rawLines.length,
            validRows: rows.length,
            invalidRows: rawLines.length - rows.length,
            expectedColumns,
        },
    }
}

/**
 * Convierte tokens parseados a CSVRow usando mapeo de columnas
 */
export function parseTokensWithMapping(
    tokens: string[],
    columnMapping: ColumnMapping,
    columnIndexMap: { [key: string]: number },
    lineNumber?: number,
): CSVRow | null {
    try {
        // Mapear las columnas usando el mapeo proporcionado
        const getValue = (field: string): string => {
            const columnName = columnMapping[field]
            if (!columnName) return ''
            const index = columnIndexMap[columnName.toLowerCase()]
            return tokens[index] || ''
        }

        const fecha = getValue('fecha')
        const categoria = getValue('categoria')
        const subcategoria = getValue('subcategoria')
        const nota = getValue('nota')

        // Debug específico para separación de categorías
        if (categoria.includes(':')) {
            const colonIdx = categoria.indexOf(':')
            const grupo = categoria.slice(0, colonIdx).trim()
            const subgrupo = categoria.slice(colonIdx + 1).trim()
            console.log(
                `Categoría separada: grupo="${grupo}", subgrupo="${subgrupo}"`,
            )
        }

        // Manejar diferentes casos de monto y tipo
        const { importe, tipo } = parseAmountAndType(getValue, tokens)

        // Validar campos requeridos
        if (!fecha || !categoria || importe === 0) {
            console.warn(`Fila ${lineNumber}: campos requeridos faltantes`, {
                fecha,
                categoria,
                importe,
                tipo,
            })
            return null
        }

        const row: CSVRow = {
            identificador: getValue('identificador') || '',
            fecha,
            estado: getValue('estado') || '',
            tipo: tipo,
            cuenta: getValue('cuenta') || '',
            beneficiario: getValue('beneficiario') || '',
            categoria: categoria,
            importe,
            divisa: getValue('divisa') || 'ARS',
            numero: getValue('numero') || '',
            notas: nota,
        }

        return row
    } catch (error) {
        console.error(
            `Error al parsear tokens con mapeo en línea ${lineNumber}:`,
            error,
        )
        return null
    }
}

/**
 * Parsea el monto y tipo de movimiento basado en el mapeo
 */
function parseAmountAndType(
    getValue: (field: string) => string,
    tokens: string[],
): { importe: number; tipo: string } {
    let importe = 0
    let tipo = ''

    // Caso 1: Columna "Importe" - tipo determinado por signo
    if (getValue('importe')) {
        const importeStr = getValue('importe')
            .replace(/[^\d.-]/g, '')
            .trim()
        importe = extractNumber(importeStr)

        // Tipo determinado únicamente por el signo del importe
        tipo = importe >= 0 ? 'ingreso' : 'egreso'

        importe = Math.abs(importe)
    }
    // Caso 2: Columnas separadas "Egreso" e "Ingreso"
    else {
        const egresoStr = getValue('egreso')
            .replace(/[^\d.-]/g, '')
            .trim()
        const ingresoStr = getValue('ingreso')
            .replace(/[^\d.-]/g, '')
            .trim()

        const egreso = extractNumber(egresoStr)
        const ingreso = extractNumber(ingresoStr)

        if (egreso > 0 && ingreso > 0) {
            // Si ambos tienen valor, usar el mayor
            if (egreso >= ingreso) {
                importe = egreso
                tipo = 'egreso'
            } else {
                importe = ingreso
                tipo = 'ingreso'
            }
        } else if (egreso > 0) {
            importe = egreso
            tipo = 'egreso'
        } else if (ingreso > 0) {
            importe = ingreso
            tipo = 'ingreso'
        }
    }

    return { importe, tipo }
}

/**
 * Valida el mapeo de columnas contra los headers disponibles
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
 * Crea un mapeo de columnas automático basado en los headers
 */
export function createAutomaticColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {}
    const headerMap = createColumnIndexMap(headers)

    // Mapeo automático basado en palabras clave
    const fieldMappings = [
        { keywords: ['fecha', 'date'], field: 'fecha' },
        {
            keywords: ['categoria', 'category', 'categoría'],
            field: 'categoria',
        },
        { keywords: ['importe', 'amount', 'monto'], field: 'importe' },
        { keywords: ['egreso', 'expense', 'gasto'], field: 'egreso' },
        { keywords: ['ingreso', 'income', 'entrada'], field: 'ingreso' },
        {
            keywords: ['identificador', 'id', 'identifier'],
            field: 'identificador',
        },
        { keywords: ['estado', 'status', 'state'], field: 'estado' },
        { keywords: ['tipo', 'type'], field: 'tipo' },
        { keywords: ['cuenta', 'account'], field: 'cuenta' },
        {
            keywords: ['beneficiario', 'beneficiary', 'payee'],
            field: 'beneficiario',
        },
        { keywords: ['divisa', 'currency', 'moneda'], field: 'divisa' },
        { keywords: ['numero', 'number', 'número'], field: 'numero' },
        {
            keywords: ['nota', 'note', 'description', 'descripcion'],
            field: 'nota',
        },
    ]

    for (const fieldMapping of fieldMappings) {
        for (const keyword of fieldMapping.keywords) {
            const header = headers.find((h) =>
                h.toLowerCase().includes(keyword.toLowerCase()),
            )
            if (header && !mapping[fieldMapping.field]) {
                mapping[fieldMapping.field] = header
                break
            }
        }
    }

    return mapping
}

/**
 * Sugiere un mapeo de columnas basado en similitud de nombres
 */
export function suggestColumnMapping(
    headers: string[],
    targetFields: string[],
): ColumnMapping {
    const mapping: ColumnMapping = {}

    for (const targetField of targetFields) {
        const suggestions = headers.filter(
            (header) =>
                header.toLowerCase().includes(targetField.toLowerCase()) ||
                targetField.toLowerCase().includes(header.toLowerCase()),
        )

        if (suggestions.length > 0) {
            mapping[targetField] = suggestions[0]
        }
    }

    return mapping
}

/**
 * Valida que un mapeo de columnas tenga todos los campos requeridos
 */
export function validateRequiredMappingFields(mapping: ColumnMapping): {
    isValid: boolean
    missingFields: string[]
} {
    const requiredFields = ['fecha', 'categoria']
    const missingFields: string[] = []

    for (const field of requiredFields) {
        if (!mapping[field]) {
            missingFields.push(field)
        }
    }

    // Verificar que al menos uno de los campos de monto esté presente
    const hasAmountField =
        mapping['importe'] || mapping['egreso'] || mapping['ingreso']
    if (!hasAmountField) {
        missingFields.push('importe/egreso/ingreso')
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
    }
}
