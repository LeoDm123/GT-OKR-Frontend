/**
 * ============================================
 *  Utilidades para procesamiento CSV
 * ============================================
 */

import { CSVRow, Movement, APIMovement, ColumnCommasConfig } from './csv.types'

/**
 * Verifica si una cadena parece ser un número
 */
export const looksLikeNumber = (val: string): boolean => {
    const trimmed = (val ?? '').trim()
    return /^-?\d+(?:\.\d+)?$/.test(trimmed)
}

/**
 * Clave auxiliar de ordenamiento (usa YYMMDD o YYYYMMDD si viene con 4 dígitos).
 * No altera la fecha original.
 */
export const toSortableKeyYY = (d: string): string => {
    const [dd, mm, yy] = (d || '').split('/')
    if (!dd || !mm || !yy) return d
    return `${yy.padStart(2, '0')}${mm.padStart(2, '0')}${dd.padStart(2, '0')}`
}

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
 * Convierte un archivo File a string usando FileReader
 */
export function parseCSVFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            const content = event.target?.result as string
            resolve(content)
        }
        reader.onerror = () => reject(new Error('Error al leer el archivo'))
        reader.readAsText(file, 'UTF-8')
    })
}

/**
 * Convierte movimientos a formato API
 */
export function convertMovementsToAPI(movements: Movement[]): APIMovement[] {
    return movements.map((movement) => ({
        fecha: movement.fecha,
        categoria: movement.categoria,
        tipo: movement.tipo,
        monto: movement.monto,
        saldo: movement.saldo,
        nota: movement.nota,
        externalId: movement.externalId,
    }))
}

/**
 * Divide movimientos en lotes para procesamiento por lotes
 */
export function splitMovementsIntoBatches(
    movements: APIMovement[],
    batchSize: number = 1000,
): APIMovement[][] {
    const batches: APIMovement[][] = []
    for (let i = 0; i < movements.length; i += batchSize) {
        batches.push(movements.slice(i, i + batchSize))
    }
    return batches
}

/**
 * Extrae y limpia un número de una cadena
 */
export function extractNumber(value: string): number {
    const cleaned = (value ?? '').replace(/[^\d.-]/g, '').trim()
    return parseFloat(cleaned || '0') || 0
}

/**
 * Verifica si una línea parece ser un header CSV
 */
export function isCSVHeader(tokens: string[]): boolean {
    const headerKeywords = [
        'identificador',
        'fecha',
        'estado',
        'tipo',
        'cuenta',
        'beneficiario',
        'categoría',
        'categoria',
        'importe',
        'divisa',
        'número',
        'numero',
        'notas',
    ]

    return tokens.some((token) =>
        headerKeywords.includes(token.toLowerCase().trim()),
    )
}

/**
 * Crea un mapa de índices de columnas basado en headers
 */
export function createColumnIndexMap(headers: string[]): {
    [key: string]: number
} {
    const indexMap: { [key: string]: number } = {}
    headers.forEach((header, index) => {
        indexMap[header.toLowerCase().trim()] = index
    })
    return indexMap
}
