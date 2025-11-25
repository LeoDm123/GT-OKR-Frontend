/**
 * ============================================
 *  Parser de filas CSV
 * ============================================
 */

import {
    CSVRow,
    ColumnDefinition,
    ColumnCommasConfig,
    CSVParseResult,
} from '../core/csv.types'
import { CSVParseError, CSV_ERROR_MESSAGES } from '../core/csv.errors'
import {
    isCSVHeader,
    createColumnIndexMap,
    extractNumber,
} from '../core/csv.utils'
import { parseCSVLineWithSmartCategoryDetection } from './csv.line-parser'

/**
 * Parsea el contenido completo de un CSV a filas CSVRow
 */
export function parseCSVContent(
    csvContent: string,
    columnDefinitions?: ColumnDefinition[],
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
    ).map((h) => h.trim().toLowerCase())
    const isHeader = isCSVHeader(headerTokens)

    // Crear mapa de configuración de comas para todas las columnas
    const columnCommasConfig: ColumnCommasConfig = {}

    if (isHeader && columnDefinitions) {
        columnDefinitions.forEach((def) => {
            if (def.maxCommas !== undefined) {
                // Buscar la columna en el header por nombre
                const columnIndex = headerTokens.findIndex((h) =>
                    h.toLowerCase().includes(def.name.toLowerCase()),
                )
                if (columnIndex !== -1) {
                    columnCommasConfig[columnIndex] = def.maxCommas
                    console.log(
                        `Configuración de comas para "${def.name}" (índice ${columnIndex}): máximo ${def.maxCommas}`,
                    )
                }
            }
        })
    }

    const startIndex = isHeader ? 1 : 0
    const rows: CSVRow[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Determinar el número esperado de columnas basado en el header
    let expectedColumns = headerTokens.length
    if (!isHeader) {
        // Si no hay header, usar la primera línea como referencia
        const firstDataLine = rawLines[0]
        expectedColumns = parseCSVLineWithSmartCategoryDetection(
            firstDataLine,
            0,
        ).length
    }

    console.log(`Número esperado de columnas: ${expectedColumns}`)
    console.log(`Header tokens: [${headerTokens.join(', ')}]`)

    for (let i = startIndex; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line) continue

        try {
            // Usar la función inteligente de parseo
            const tokens = parseCSVLineWithSmartCategoryDetection(
                line,
                expectedColumns,
                columnCommasConfig,
            ).map((t) => t.trim())

            console.log(
                `Fila ${i + 1} - Tokens después del parseo inteligente:`,
                {
                    lineaOriginal: line,
                    tokensRaw: parseCSVLineWithSmartCategoryDetection(line, 0),
                    tokensProcesados: tokens,
                    tokensLength: tokens.length,
                    expectedColumns,
                },
            )

            if (tokens.length < 8) {
                const warning = `Fila ${i + 1}: tokens insuficientes`
                warnings.push(warning)
                console.warn(warning, { line, tokens })
                continue
            }

            const row = parseTokensToCSVRow(tokens, columnDefinitions, i + 1)
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
 * Convierte tokens parseados a un objeto CSVRow
 */
export function parseTokensToCSVRow(
    tokens: string[],
    columnDefinitions?: ColumnDefinition[],
    lineNumber?: number,
): CSVRow | null {
    try {
        // Usar la estructura de columnas definida para mapear campos
        const getFieldByOrder = (fieldName: string): string => {
            if (!columnDefinitions) {
                // Fallback a estructura fija si no hay definiciones
                const fieldMap: { [key: string]: number } = {
                    Identificador: 0,
                    Fecha: 1,
                    Estado: 2,
                    Tipo: 3,
                    Cuenta: 4,
                    Beneficiario: 5,
                }
                const idx = fieldMap[fieldName] ?? -1
                return idx >= 0 ? (tokens[idx] ?? '') : ''
            }

            // Buscar la columna por nombre en las definiciones
            const columnDef = columnDefinitions.find(
                (def) => def.name === fieldName,
            )
            if (columnDef) {
                const idx = columnDef.order - 1 // Convertir a índice 0-based
                return idx < tokens.length ? (tokens[idx] ?? '') : ''
            }

            return ''
        }

        const identificador = getFieldByOrder('Identificador')
        const fecha = getFieldByOrder('Fecha')
        const estado = getFieldByOrder('Estado')
        const tipo = getFieldByOrder('Tipo')
        const cuenta = getFieldByOrder('Cuenta')
        const beneficiario = getFieldByOrder('Beneficiario')

        console.log(`Campos mapeados usando estructura:`, {
            identificador,
            fecha,
            estado,
            tipo,
            cuenta,
            beneficiario,
            columnDefinitions: columnDefinitions?.map((def) => ({
                name: def.name,
                order: def.order,
            })),
        })

        // Buscar importe usando estructura de columnas
        let importeIdx = -1
        const importeField = getFieldByOrder('Importe')

        if (importeField) {
            importeIdx = tokens.indexOf(importeField)
            console.log(
                `Importe encontrado usando estructura en índice ${importeIdx}: "${importeField}"`,
            )
        } else {
            // Fallback: buscar primer número
            for (let j = 0; j < tokens.length; j++) {
                const token = tokens[j]
                if (token && /^-?\d+(?:\.\d+)?$/.test(token)) {
                    importeIdx = j
                    console.log(
                        `Importe encontrado por búsqueda en índice ${j}: "${token}"`,
                    )
                    break
                }
            }
        }

        if (importeIdx === -1) {
            console.warn(`Fila ${lineNumber}: no se encontró importe.`, tokens)
            return null
        }

        console.log(
            `Fila ${lineNumber} - Importe encontrado en índice ${importeIdx}:`,
            tokens[importeIdx],
        )

        // Construir categoría usando estructura de columnas
        const categoriaField = getFieldByOrder('Categoría')
        let categoriaCompleta = categoriaField

        // Si no se encontró categoría por estructura, buscar entre beneficiario e importe
        if (!categoriaCompleta) {
            const beneficiarioIdx = tokens.indexOf(beneficiario)
            const categoriaStartIdx = beneficiarioIdx + 1
            categoriaCompleta = tokens
                .slice(categoriaStartIdx, importeIdx)
                .join(', ')
                .trim()

            console.log(`Categoría construida por posición:`, {
                beneficiarioIdx,
                categoriaStartIdx,
                categoriaCompleta,
                tokensUsados: tokens.slice(categoriaStartIdx, importeIdx),
            })
        } else {
            console.log(
                `Categoría encontrada por estructura: "${categoriaCompleta}"`,
            )
        }

        const importeStr = (tokens[importeIdx] ?? '')
            .replace(/[^\d.-]/g, '')
            .trim()
        const importe = extractNumber(importeStr)

        const divisa = (tokens[importeIdx + 1] ?? '').trim() || 'ARS'
        const numero = (tokens[importeIdx + 2] ?? '').trim()

        // Construir notas usando estructura de columnas
        const notasField = getFieldByOrder('Notas')
        let notas = notasField

        // Si no se encontraron notas por estructura, usar lógica de búsqueda
        if (!notas) {
            notas = buildNotesFromTokens(tokens, importeIdx, numero, divisa)
        } else {
            console.log(`Notas encontradas por estructura: "${notas}"`)
        }

        console.log(`Fila ${lineNumber} - Campos finales:`, {
            identificador,
            fecha,
            categoriaCompleta,
            importe,
            divisa,
            numero,
            notas,
            notasTokens: tokens.slice(importeIdx + 3),
            notasLength: tokens.length - (importeIdx + 3),
        })

        const row: CSVRow = {
            identificador,
            fecha,
            estado,
            tipo,
            cuenta,
            beneficiario,
            categoria: categoriaCompleta,
            importe,
            divisa,
            numero,
            notas,
        }

        console.log(`Fila ${lineNumber} - CSVRow creado:`, {
            identificador: row.identificador,
            notas: row.notas,
            notasLength: row.notas?.length || 0,
        })

        return row
    } catch (error) {
        console.error(
            `Error al parsear tokens a CSVRow en línea ${lineNumber}:`,
            error,
        )
        return null
    }
}

/**
 * Construye las notas a partir de los tokens restantes
 */
function buildNotesFromTokens(
    tokens: string[],
    importeIdx: number,
    numero: string,
    divisa: string,
): string {
    let notasTokens: string[] = []
    let notasStartIdx = importeIdx + 3

    // Estrategia 1: Si hay tokens después de número, tomarlos como notas
    if (tokens.length > notasStartIdx) {
        notasTokens = tokens.slice(notasStartIdx)
        console.log(
            `Estrategia 1: Notas después de número (índice ${notasStartIdx})`,
        )
    }
    // Estrategia 2: Si no hay tokens después de número, pero hay tokens después de divisa, tomarlos como notas
    else if (tokens.length > importeIdx + 2 && !numero) {
        notasTokens = tokens.slice(importeIdx + 2)
        console.log(
            `Estrategia 2: Notas después de divisa (índice ${importeIdx + 2})`,
        )
    }
    // Estrategia 3: Si no hay tokens después de divisa, pero hay tokens después de importe, tomarlos como notas
    else if (tokens.length > importeIdx + 1 && !divisa) {
        notasTokens = tokens.slice(importeIdx + 1)
        console.log(
            `Estrategia 3: Notas después de importe (índice ${importeIdx + 1})`,
        )
    }
    // Estrategia 4: Buscar tokens que parezcan notas (texto largo con espacios)
    else {
        console.log(`Estrategia 4: Buscando tokens que parezcan notas`)
        for (let k = importeIdx + 1; k < tokens.length; k++) {
            const token = tokens[k]
            // Si el token es largo y contiene espacios, probablemente es una nota
            if (token && token.length > 10 && token.includes(' ')) {
                notasTokens = tokens.slice(k)
                console.log(`Encontradas notas desde índice ${k}: "${token}"`)
                break
            }
        }
    }

    const notas = notasTokens.join(', ').trim()
    console.log(`Notas construidas por búsqueda: "${notas}"`)
    return notas
}

/**
 * Parsea el header de un CSV y determina si es válido
 */
export function parseCSVHeader(firstLine: string): {
    isValid: boolean
    headers: string[]
    expectedColumns: number
} {
    const headers = parseCSVLineWithSmartCategoryDetection(firstLine, 0).map(
        (h) => h.trim().toLowerCase(),
    )
    const isValid = isCSVHeader(headers)

    return {
        isValid,
        headers,
        expectedColumns: headers.length,
    }
}

/**
 * Valida que una fila tenga todos los campos requeridos
 */
export function validateCSVRowRequiredFields(row: Partial<CSVRow>): {
    isValid: boolean
    missingFields: string[]
} {
    const requiredFields: (keyof CSVRow)[] = ['fecha', 'categoria', 'importe']
    const missingFields: string[] = []

    for (const field of requiredFields) {
        if (
            !row[field] ||
            (typeof row[field] === 'string' && !row[field].trim())
        ) {
            missingFields.push(field)
        }
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
    }
}
