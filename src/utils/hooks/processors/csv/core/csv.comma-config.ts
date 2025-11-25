/**
 * ============================================
 *  Configuración de Comas en CSV
 * ============================================
 */

import { ColumnCommasConfig, ColumnDefinition } from './csv.types'

/**
 * Configuraciones predefinidas para diferentes tipos de archivos CSV
 */
export const COMMA_CONFIG_PRESETS = {
    /**
     * Configuración para archivos MMEX estándar
     * Asume que la categoría está en la columna 2 (índice 2)
     */
    MMEX_STANDARD: {
        columnCommasConfig: {
            2: 2, // Categoría puede tener hasta 2 comas extra
        } as ColumnCommasConfig,
        description:
            'Para archivos MMEX con categorías como "Alimentación:Supermercado" o "Empresa, S.A."',
    },

    /**
     * Configuración para archivos con múltiples campos de texto
     */
    MULTI_TEXT_FIELDS: {
        columnCommasConfig: {
            1: 1, // Campo 1 puede tener 1 coma extra
            2: 2, // Campo 2 puede tener 2 comas extra
            5: 1, // Campo 5 puede tener 1 coma extra
        } as ColumnCommasConfig,
        description:
            'Para archivos con múltiples campos que pueden contener comas',
    },

    /**
     * Configuración conservadora - solo categoría
     */
    CONSERVATIVE: {
        columnCommasConfig: {
            2: 1, // Solo categoría con máximo 1 coma extra
        } as ColumnCommasConfig,
        description: 'Configuración conservadora para archivos simples',
    },

    /**
     * Sin configuración - usar detección automática
     */
    AUTO_DETECT: {
        columnCommasConfig: {} as ColumnCommasConfig,
        description: 'Detección automática basada en patrones del contenido',
    },
} as const

/**
 * Crea una configuración personalizada de comas
 */
export function createCommaConfig(
    columnIndex: number,
    maxCommas: number,
): ColumnCommasConfig {
    return {
        [columnIndex]: maxCommas,
    }
}

/**
 * Combina múltiples configuraciones de comas
 */
export function combineCommaConfigs(
    ...configs: ColumnCommasConfig[]
): ColumnCommasConfig {
    const combined: ColumnCommasConfig = {}

    configs.forEach((config) => {
        Object.entries(config).forEach(([index, maxCommas]) => {
            const columnIndex = parseInt(index)
            if (combined[columnIndex] !== undefined) {
                // Si ya existe, usar el valor más alto
                combined[columnIndex] = Math.max(
                    combined[columnIndex],
                    maxCommas,
                )
            } else {
                combined[columnIndex] = maxCommas
            }
        })
    })

    return combined
}

/**
 * Crea definiciones de columnas con configuración de comas
 */
export function createColumnDefinitionsWithCommas(
    columnNames: string[],
    commaConfig: ColumnCommasConfig,
): ColumnDefinition[] {
    return columnNames.map((name, index) => ({
        name,
        order: index,
        maxCommas: commaConfig[index] || 0,
    }))
}

/**
 * Detecta automáticamente qué columnas pueden tener comas basándose en el contenido
 */
export function detectCommaColumns(
    sampleLines: string[],
    expectedColumns: number,
): ColumnCommasConfig {
    const commaConfig: ColumnCommasConfig = {}

    // Analizar cada línea de muestra
    sampleLines.forEach((line) => {
        const totalCommas = (line.match(/,/g) || []).length
        const extraCommas = totalCommas - (expectedColumns - 1)

        if (extraCommas > 0) {
            // Hay comas extra, intentar detectar dónde
            const tokens = line.split(',')

            // Buscar patrones comunes
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].trim()

                // Si el token contiene ":" probablemente es una categoría
                if (token.includes(':')) {
                    commaConfig[i] = Math.max(commaConfig[i] || 0, extraCommas)
                }

                // Si el token parece ser texto puro (no número)
                if (
                    /^[a-zA-Z\s,áéíóúÁÉÍÓÚñÑ]+$/.test(token) &&
                    !/^-?\d+(\.\d+)?$/.test(token)
                ) {
                    commaConfig[i] = Math.max(commaConfig[i] || 0, 1)
                }
            }
        }
    })

    return commaConfig
}

/**
 * Valida una configuración de comas contra el contenido real
 */
export function validateCommaConfig(
    csvContent: string,
    commaConfig: ColumnCommasConfig,
): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    const lines = csvContent.split('\n').filter((line) => line.trim())

    lines.forEach((line, lineIndex) => {
        const totalCommas = (line.match(/,/g) || []).length
        const tokens = line.split(',')

        // Verificar cada columna configurada
        Object.entries(commaConfig).forEach(([columnIndex, maxCommas]) => {
            const index = parseInt(columnIndex)

            if (index >= tokens.length) {
                errors.push(
                    `Línea ${lineIndex + 1}: Columna ${index} no existe`,
                )
                return
            }

            // Contar comas en esta columna específica
            const columnValue = tokens[index]
            const commasInColumn = (columnValue.match(/,/g) || []).length

            if (commasInColumn > maxCommas) {
                errors.push(
                    `Línea ${lineIndex + 1}: Columna ${index} tiene ${commasInColumn} comas, máximo permitido: ${maxCommas}`,
                )
            } else if (commasInColumn > 0) {
                warnings.push(
                    `Línea ${lineIndex + 1}: Columna ${index} tiene ${commasInColumn} comas`,
                )
            }
        })
    })

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}

/**
 * Función helper para obtener la configuración recomendada basada en el tipo de archivo
 */
export function getRecommendedCommaConfig(
    fileName: string,
    sampleContent?: string,
): {
    config: ColumnCommasConfig
    preset: keyof typeof COMMA_CONFIG_PRESETS
    description: string
} {
    const lowerFileName = fileName.toLowerCase()

    // Detectar tipo de archivo por nombre
    if (lowerFileName.includes('mmex') || lowerFileName.includes('money')) {
        return {
            config: COMMA_CONFIG_PRESETS.MMEX_STANDARD.columnCommasConfig,
            preset: 'MMEX_STANDARD',
            description: COMMA_CONFIG_PRESETS.MMEX_STANDARD.description,
        }
    }

    // Si tenemos contenido de muestra, usar detección automática
    if (sampleContent) {
        const lines = sampleContent.split('\n').slice(0, 5) // Primeras 5 líneas
        const expectedColumns = lines[0]?.split(',').length || 0

        if (expectedColumns > 0) {
            const detectedConfig = detectCommaColumns(lines, expectedColumns)

            if (Object.keys(detectedConfig).length > 0) {
                return {
                    config: detectedConfig,
                    preset: 'AUTO_DETECT',
                    description:
                        'Configuración detectada automáticamente del contenido',
                }
            }
        }
    }

    // Fallback a configuración conservadora
    return {
        config: COMMA_CONFIG_PRESETS.CONSERVATIVE.columnCommasConfig,
        preset: 'CONSERVATIVE',
        description: COMMA_CONFIG_PRESETS.CONSERVATIVE.description,
    }
}
