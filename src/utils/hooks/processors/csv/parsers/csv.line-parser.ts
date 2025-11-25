/**
 * ============================================
 *  Parser de líneas CSV
 * ============================================
 */

import { ColumnCommasConfig } from '../core/csv.types'
import { CSVParseError, createCSVParseError } from '../core/csv.errors'

/**
 * Parsea una línea CSV básica respetando comillas y escapes
 */
export function parseCSVLine(line: string): string[] {
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false
    let escapeNext = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (escapeNext) {
            currentValue += char
            escapeNext = false
            continue
        }

        if (char === '\\') {
            escapeNext = true
            continue
        }

        if (char === '"') {
            inQuotes = !inQuotes
            continue
        }

        if (char === ',' && !inQuotes) {
            values.push(currentValue.trim())
            currentValue = ''
            continue
        }

        currentValue += char
    }

    values.push(currentValue.trim())
    return values
}

/**
 * Parsea una línea CSV con corrección automática para comas extra
 */
export function parseCSVLineWithCorrection(
    line: string,
    expectedColumns: number,
): string[] {
    const tokens = parseCSVLine(line)

    // Si el número de tokens coincide con las columnas esperadas, no hay problema
    if (tokens.length === expectedColumns) {
        return tokens
    }

    // Si hay más tokens de los esperados, buscar comas extra en campos de texto
    if (tokens.length > expectedColumns) {
        // Buscar el primer campo numérico para identificar dónde debería estar
        let firstNumericIndex = -1
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim()
            if (/^-?\d+(\.\d+)?$/.test(token)) {
                firstNumericIndex = i
                break
            }
        }

        if (firstNumericIndex > 0) {
            // Todo lo que está antes del primer número debería ser un solo campo de texto
            const textPart = tokens.slice(0, firstNumericIndex).join(',')
            const numericPart = tokens.slice(firstNumericIndex)

            return [textPart, ...numericPart]
        }
    }

    return tokens
}

/**
 * Función inteligente para parsear CSV que detecta comas dentro de cualquier columna configurada
 * Implementa la lógica: contar comas totales vs columnas esperadas - 1
 * Si hay más comas, buscar columnas configuradas y ajustar el parseo
 */
export function parseCSVLineWithSmartCategoryDetection(
    line: string,
    expectedColumns: number,
    columnCommasConfig?: ColumnCommasConfig,
): string[] {
    // Contar comas totales en la línea
    const totalCommas = (line.match(/,/g) || []).length

    console.log(`Línea: "${line}"`)
    console.log(
        `Comas totales: ${totalCommas}, Columnas esperadas: ${expectedColumns}`,
    )

    // Si las comas son exactamente columnas - 1, parsear normalmente
    if (totalCommas === expectedColumns - 1) {
        return parseCSVLine(line)
    }

    // Si hay más comas de las esperadas, hay comas dentro de algún campo
    if (totalCommas > expectedColumns - 1) {
        console.log(
            `Detectadas comas extra (${totalCommas} > ${expectedColumns - 1}). Buscando columnas con configuración de comas...`,
        )

        const tokens = parseCSVLine(line)
        const extraCommas = totalCommas - (expectedColumns - 1)

        console.log(
            `Tokens encontrados: ${tokens.length}, esperados: ${expectedColumns}`,
        )
        console.log(`Comas extra detectadas: ${extraCommas}`)

        // Si no hay configuración de comas, usar detección automática
        if (
            !columnCommasConfig ||
            Object.keys(columnCommasConfig).length === 0
        ) {
            console.log(
                'Sin configuración de comas, usando detección automática',
            )
            // Buscar el campo que contiene ":" (formato categoría:subcategoría)
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].includes(':')) {
                    console.log(
                        `Columna con ":" detectada automáticamente en índice: ${i}`,
                    )
                    // Aplicar lógica inteligente para esta columna específica
                    const beforeTarget = tokens.slice(0, i)

                    // Lógica inteligente: determinar cuántos tokens tomar para la categoría
                    let tokensToTake = 1 // Al menos el token actual

                    // Si hay comas extra, intentar tomar tokens adicionales pero con validación
                    for (let j = 1; j <= extraCommas; j++) {
                        const nextTokenIndex = i + j
                        if (nextTokenIndex < tokens.length) {
                            const nextToken = tokens[nextTokenIndex]

                            // Si el siguiente token es un número, probablemente es el importe
                            if (/^-?\d+(\.\d+)?$/.test(nextToken)) {
                                console.log(
                                    `Detectado número en posición ${nextTokenIndex}: "${nextToken}" - probablemente importe, parando aquí`,
                                )
                                break
                            }

                            // Si el siguiente token contiene ":" o parece ser parte de la categoría, incluirlo
                            if (
                                nextToken.includes(':') ||
                                /^[a-zA-Z\s,áéíóúÁÉÍÓÚñÑ]+$/.test(nextToken)
                            ) {
                                tokensToTake++
                                console.log(
                                    `Incluyendo token ${nextTokenIndex}: "${nextToken}" en categoría`,
                                )
                            } else {
                                console.log(
                                    `Token ${nextTokenIndex}: "${nextToken}" no parece ser parte de la categoría, parando aquí`,
                                )
                                break
                            }
                        }
                    }

                    const targetTokens = tokens.slice(i, i + tokensToTake)
                    const targetWithCommas = targetTokens.join(', ')
                    const afterTarget = tokens.slice(i + tokensToTake)

                    console.log(
                        `Antes columna objetivo: [${beforeTarget.join(', ')}]`,
                    )
                    console.log(
                        `Columna objetivo con comas: "${targetWithCommas}"`,
                    )
                    console.log(
                        `Después columna objetivo: [${afterTarget.join(', ')}]`,
                    )

                    return [...beforeTarget, targetWithCommas, ...afterTarget]
                }
            }
            // Si no encuentra ":", usar fallback
            return parseCSVLineWithCorrection(line, expectedColumns)
        }

        // Buscar la primera columna configurada que pueda tener comas extra
        let targetColumnIndex = -1
        let targetMaxCommas = 0

        for (const [columnIndex, maxCommas] of Object.entries(
            columnCommasConfig,
        )) {
            const index = parseInt(columnIndex)
            if (index < tokens.length && maxCommas > 0) {
                targetColumnIndex = index
                targetMaxCommas = maxCommas
                console.log(
                    `Columna objetivo: índice ${index}, máximo ${maxCommas} comas`,
                )
                break
            }
        }

        if (targetColumnIndex === -1) {
            console.log('No se encontró columna configurada para comas extra')
            return parseCSVLineWithCorrection(line, expectedColumns)
        }

        // Validar que no exceda el máximo permitido
        if (extraCommas > targetMaxCommas) {
            console.log(
                `ERROR: Comas extra (${extraCommas}) exceden el máximo permitido (${targetMaxCommas}) para columna ${targetColumnIndex}`,
            )
            return parseCSVLineWithCorrection(line, expectedColumns)
        }

        // Ajustar el parseo para la columna objetivo
        const beforeTarget = tokens.slice(0, targetColumnIndex)

        // Lógica inteligente: determinar cuántos tokens tomar para la columna objetivo
        let tokensToTake = 1 // Al menos el token actual

        // Si hay comas extra, intentar tomar tokens adicionales pero con validación
        for (let j = 1; j <= extraCommas; j++) {
            const nextTokenIndex = targetColumnIndex + j
            if (nextTokenIndex < tokens.length) {
                const nextToken = tokens[nextTokenIndex]

                // Si el siguiente token es un número, probablemente es el importe
                if (/^-?\d+(\.\d+)?$/.test(nextToken)) {
                    console.log(
                        `Detectado número en posición ${nextTokenIndex}: "${nextToken}" - probablemente importe, parando aquí`,
                    )
                    break
                }

                // Si el siguiente token contiene ":" o parece ser parte de la categoría, incluirlo
                if (
                    nextToken.includes(':') ||
                    /^[a-zA-Z\s,áéíóúÁÉÍÓÚñÑ]+$/.test(nextToken)
                ) {
                    tokensToTake++
                    console.log(
                        `Incluyendo token ${nextTokenIndex}: "${nextToken}" en columna objetivo`,
                    )
                } else {
                    console.log(
                        `Token ${nextTokenIndex}: "${nextToken}" no parece ser parte de la columna objetivo, parando aquí`,
                    )
                    break
                }
            }
        }

        const targetTokens = tokens.slice(
            targetColumnIndex,
            targetColumnIndex + tokensToTake,
        )
        const targetWithCommas = targetTokens.join(', ')
        const afterTarget = tokens.slice(targetColumnIndex + tokensToTake)

        console.log(`Antes columna objetivo: [${beforeTarget.join(', ')}]`)
        console.log(`Columna objetivo con comas: "${targetWithCommas}"`)
        console.log(`Después columna objetivo: [${afterTarget.join(', ')}]`)

        return [...beforeTarget, targetWithCommas, ...afterTarget]
    }

    // Fallback al parseo normal
    return parseCSVLine(line)
}

/**
 * Parsea múltiples líneas CSV con manejo de errores
 */
export function parseCSVLines(
    lines: string[],
    expectedColumns: number,
    columnCommasConfig?: ColumnCommasConfig,
): { tokens: string[][]; errors: CSVParseError[] } {
    const tokens: string[][] = []
    const errors: CSVParseError[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
            const lineTokens = parseCSVLineWithSmartCategoryDetection(
                line,
                expectedColumns,
                columnCommasConfig,
            )
            tokens.push(lineTokens)
        } catch (error) {
            const parseError = createCSVParseError(
                `Error al parsear línea ${i + 1}: ${error}`,
                i + 1,
                line,
            )
            errors.push(parseError)
        }
    }

    return { tokens, errors }
}

/**
 * Valida que una línea tenga el número correcto de columnas
 */
export function validateLineColumns(
    tokens: string[],
    expectedColumns: number,
    lineNumber: number,
): boolean {
    if (tokens.length < expectedColumns) {
        console.warn(
            `Línea ${lineNumber}: tokens insuficientes (${tokens.length} < ${expectedColumns})`,
        )
        return false
    }
    return true
}

/**
 * Extrae información de debug de una línea parseada
 */
export function getLineDebugInfo(
    line: string,
    tokens: string[],
    expectedColumns: number,
    lineNumber: number,
): {
    lineNumber: number
    originalLine: string
    tokensRaw: string[]
    tokensProcessed: string[]
    tokensLength: number
    expectedColumns: number
    hasExtraCommas: boolean
    extraCommasCount: number
} {
    const totalCommas = (line.match(/,/g) || []).length
    const extraCommasCount = Math.max(0, totalCommas - (expectedColumns - 1))

    return {
        lineNumber,
        originalLine: line,
        tokensRaw: parseCSVLine(line),
        tokensProcessed: tokens,
        tokensLength: tokens.length,
        expectedColumns,
        hasExtraCommas: extraCommasCount > 0,
        extraCommasCount,
    }
}
