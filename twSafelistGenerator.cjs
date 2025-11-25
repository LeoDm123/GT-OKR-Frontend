const fs = require('fs')
const path = require('path')

/**
 * Tailwind CSS safelist generator plugin
 * Generates safelist entries based on patterns and writes them to a file
 */
module.exports = function twSafelistGenerator(options = {}) {
    const { path: outputPath = 'safelist.txt', patterns = [] } = options

    return function ({ theme }) {
        // Get all color names from theme
        const colors = theme('colors', {})
        const colorNames = Object.keys(colors).filter(
            (key) =>
                typeof colors[key] === 'object' ||
                typeof colors[key] === 'string',
        )

        // Generate safelist entries
        const safelistEntries = new Set()

        patterns.forEach((pattern) => {
            // Handle color patterns like text-{colors}
            if (pattern.includes('{colors}')) {
                colorNames.forEach((colorName) => {
                    // Handle color shades (e.g., red-50, red-100, etc.)
                    if (
                        typeof colors[colorName] === 'object' &&
                        colors[colorName] !== null
                    ) {
                        const shades = Object.keys(colors[colorName])
                        shades.forEach((shade) => {
                            const className = pattern.replace(
                                '{colors}',
                                `${colorName}-${shade}`,
                            )
                            safelistEntries.add(className)
                        })
                    } else {
                        // Handle single color values
                        const className = pattern.replace('{colors}', colorName)
                        safelistEntries.add(className)
                    }
                })
            }
            // Handle height patterns like h-{height}
            else if (pattern.includes('{height}')) {
                const heights = [
                    '0',
                    '1',
                    '2',
                    '3',
                    '4',
                    '5',
                    '6',
                    '7',
                    '8',
                    '9',
                    '10',
                    '11',
                    '12',
                    '14',
                    '16',
                    '20',
                    '24',
                    '28',
                    '32',
                    '36',
                    '40',
                    '44',
                    '48',
                    '52',
                    '56',
                    '60',
                    '64',
                    '72',
                    '80',
                    '96',
                    'auto',
                    'px',
                    '0.5',
                    '1.5',
                    '2.5',
                    '3.5',
                    '1/2',
                    '1/3',
                    '2/3',
                    '1/4',
                    '2/4',
                    '3/4',
                    '1/5',
                    '2/5',
                    '3/5',
                    '4/5',
                    '1/6',
                    '2/6',
                    '3/6',
                    '4/6',
                    '5/6',
                    'full',
                    'screen',
                    'svh',
                    'lvh',
                    'dvh',
                    'min',
                    'max',
                    'fit',
                ]
                heights.forEach((height) => {
                    const className = pattern.replace('{height}', height)
                    safelistEntries.add(className)
                })
            }
            // Handle width patterns like w-{width}
            else if (pattern.includes('{width}')) {
                const widths = [
                    '0',
                    '1',
                    '2',
                    '3',
                    '4',
                    '5',
                    '6',
                    '7',
                    '8',
                    '9',
                    '10',
                    '11',
                    '12',
                    '14',
                    '16',
                    '20',
                    '24',
                    '28',
                    '32',
                    '36',
                    '40',
                    '44',
                    '48',
                    '52',
                    '56',
                    '60',
                    '64',
                    '72',
                    '80',
                    '96',
                    'auto',
                    'px',
                    '0.5',
                    '1.5',
                    '2.5',
                    '3.5',
                    '1/2',
                    '1/3',
                    '2/3',
                    '1/4',
                    '2/4',
                    '3/4',
                    '1/5',
                    '2/5',
                    '3/5',
                    '4/5',
                    '1/6',
                    '2/6',
                    '3/6',
                    '4/6',
                    '5/6',
                    '1/12',
                    '2/12',
                    '3/12',
                    '4/12',
                    '5/12',
                    '6/12',
                    '7/12',
                    '8/12',
                    '9/12',
                    '10/12',
                    '11/12',
                    'full',
                    'screen',
                    'svw',
                    'lvw',
                    'dvw',
                    'min',
                    'max',
                    'fit',
                ]
                widths.forEach((width) => {
                    const className = pattern.replace('{width}', width)
                    safelistEntries.add(className)
                })
            }
            // Add pattern as-is if no placeholders
            else {
                safelistEntries.add(pattern)
            }
        })

        // Write safelist to file
        const filePath = path.resolve(process.cwd(), outputPath)
        const content = Array.from(safelistEntries).sort().join('\n') + '\n'
        fs.writeFileSync(filePath, content, 'utf8')
    }
}
