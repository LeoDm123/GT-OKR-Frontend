import { useMemo } from 'react'
import Chart from '@/components/shared/Chart'
import type { KeyResult, ProgressRecord } from '../types/okr.types'
import dayjs from 'dayjs'

interface KeyResultProgressChartProps {
    keyResult: KeyResult
    startDate?: string | Date
    endDate?: string | Date
}

// Unidades que requieren valores enteros (discretas)
const INTEGER_UNITS = [
    'unidades',
    'personas',
    'clientes',
    'ventas',
    'proyectos',
    'tareas',
    'reuniones',
    'años',
    'meses',
    'semanas',
    'días',
    'horas',
]

// Determinar si una unidad requiere valores enteros
const requiresInteger = (unit?: string): boolean => {
    if (!unit) return false
    return INTEGER_UNITS.includes(unit.toLowerCase())
}

const KeyResultProgressChart = ({
    keyResult,
    startDate,
    endDate,
}: KeyResultProgressChartProps) => {
    const { theoreticalData, actualData, categories } = useMemo(() => {
        if (!startDate || !endDate) {
            return {
                theoreticalData: [],
                actualData: [],
                categories: [],
            }
        }

        const start = dayjs(startDate)
        const end = dayjs(endDate)
        const totalDays = end.diff(start, 'day')
        const targetValue = keyResult.target ?? 0
        const isIntegerUnit = requiresInteger(keyResult.unit)

        // Generar puntos teóricos (progreso lineal)
        const theoreticalPoints: number[] = []
        const dateCategories: string[] = []
        const steps = Math.min(10, totalDays + 1) // Máximo 10 puntos

        for (let i = 0; i <= steps; i++) {
            const date = start.add((totalDays * i) / steps, 'day')
            dateCategories.push(date.format('DD/MM/YY'))
            // Progreso teórico: de 0 a targetValue de forma lineal
            let value = (targetValue * i) / steps
            // Si la unidad requiere valores enteros, redondear
            if (isIntegerUnit) {
                value = Math.round(value)
            }
            theoreticalPoints.push(value)
        }

        // Procesar progresos reales acumulados
        const progressRecords = keyResult.progressRecords || []
        const sortedRecords = [...progressRecords].sort((a, b) => {
            const dateA = dayjs(a.advanceDate)
            const dateB = dayjs(b.advanceDate)
            return dateA.diff(dateB)
        })

        const actualPoints: (number | null)[] = new Array(
            dateCategories.length,
        ).fill(null)
        let accumulatedValue = 0

        // Mapear los progresos reales a las fechas más cercanas
        sortedRecords.forEach((record) => {
            const recordDate = dayjs(record.advanceDate)
            accumulatedValue += record.advanceUnits

            // Encontrar el índice más cercano en las categorías
            let closestIndex = 0
            let minDiff = Infinity

            dateCategories.forEach((catDate, index) => {
                const catDayjs = dayjs(catDate, 'DD/MM/YY')
                const diff = Math.abs(recordDate.diff(catDayjs, 'day'))
                if (diff < minDiff) {
                    minDiff = diff
                    closestIndex = index
                }
            })

            // Actualizar el valor acumulado en ese punto y todos los siguientes
            for (let i = closestIndex; i < actualPoints.length; i++) {
                let value = Math.min(accumulatedValue, targetValue)
                // Si la unidad requiere valores enteros, redondear
                if (isIntegerUnit) {
                    value = Math.round(value)
                }
                actualPoints[i] = value
            }
        })

        // Si no hay registros, el primer punto es 0
        if (sortedRecords.length === 0) {
            actualPoints[0] = 0
        }

        return {
            theoreticalData: theoreticalPoints,
            actualData: actualPoints.map((val) => val ?? 0),
            categories: dateCategories,
        }
    }, [keyResult, startDate, endDate])

    if (!startDate || !endDate) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No hay fechas disponibles para el gráfico</p>
            </div>
        )
    }

    const series = [
        {
            name: 'Progreso Teórico',
            data: theoreticalData,
        },
        {
            name: 'Progreso Real',
            data: actualData,
        },
    ]

    const isIntegerUnit = requiresInteger(keyResult.unit)
    const unitLabel = keyResult.unit ? `Valor (${keyResult.unit})` : 'Valor'

    // Formatter para valores del eje Y y tooltip
    const valueFormatter = (val: number): string => {
        if (isIntegerUnit) {
            return Math.round(val).toString()
        }
        // Para valores decimales, mostrar hasta 1 decimal
        return val.toFixed(1)
    }

    return (
        <div className="h-full">
            <Chart
                type="line"
                series={series}
                xAxis={categories}
                height={350}
                customOptions={{
                    colors: ['#94a3b8', '#3b82f6'],
                    stroke: {
                        width: [2, 3],
                        curve: 'smooth',
                        dashArray: [5, 0], // Teórico punteado, real sólido
                    },
                    markers: {
                        size: [0, 5], // Sin marcadores en teórico, con marcadores en real
                    },
                    legend: {
                        show: true,
                        position: 'top',
                    },
                    yaxis: {
                        title: {
                            text: unitLabel,
                        },
                        labels: {
                            formatter: (val: number) => valueFormatter(val),
                        },
                        // Si es unidad entera, asegurar que los ticks sean enteros
                        ...(isIntegerUnit && {
                            tickAmount: undefined,
                            decimalsInFloat: 0,
                        }),
                    },
                    tooltip: {
                        y: {
                            formatter: (val: number) => {
                                const formatted = valueFormatter(val)
                                return `${formatted}${keyResult.unit ? ` ${keyResult.unit}` : ''}`
                            },
                        },
                    },
                    xaxis: {
                        title: {
                            text: 'Fecha',
                        },
                    },
                }}
            />
        </div>
    )
}

export default KeyResultProgressChart
