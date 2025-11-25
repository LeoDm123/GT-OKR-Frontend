import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { ProgressRecord } from '../types/okr.types'

interface ProgressRecordsListProps {
    progressRecords?: ProgressRecord[]
    unit?: string
}

const ProgressRecordsList = ({
    progressRecords = [],
    unit = '',
}: ProgressRecordsListProps) => {
    const sortedRecords = useMemo(() => {
        return [...progressRecords].sort((a, b) => {
            const dateA = dayjs(a.advanceDate)
            const dateB = dayjs(b.advanceDate)
            return dateB.diff(dateA) // Más reciente primero
        })
    }, [progressRecords])

    if (sortedRecords.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                <p>No hay registros de progreso aún</p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto pr-2">
            {/* Encabezados de columna */}
            <div className="flex items-center gap-4 py-2 px-3 border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <span className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-24 flex-shrink-0">
                    Unidades
                </span>
                <span className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">
                    Fecha Avance
                </span>
                <span className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1 min-w-0">
                    Comentario
                </span>
                <span className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-32 flex-shrink-0 text-right">
                    Fecha Registro
                </span>
            </div>
            <div className="space-y-1">
                {sortedRecords.map((record, index) => {
                    const date = dayjs(record.advanceDate)
                    const createdAt = record.createdAt
                        ? dayjs(record.createdAt)
                        : null

                    return (
                        <div
                            key={record.id || record._id || index}
                            className="flex items-center gap-4 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors text-sm"
                        >
                            <span className="font-semibold text-gray-900 dark:text-gray-100 w-24 flex-shrink-0">
                                +{record.advanceUnits}
                                {unit ? ` ${unit}` : ''}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 w-28 flex-shrink-0">
                                {date.format('DD/MM/YYYY')}
                            </span>
                            {record.comment && (
                                <span className="text-gray-600 dark:text-gray-400 flex-1 min-w-0 truncate">
                                    {record.comment}
                                </span>
                            )}
                            {createdAt && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-32 flex-shrink-0 text-right">
                                    {createdAt.format('DD/MM/YY HH:mm')}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ProgressRecordsList
