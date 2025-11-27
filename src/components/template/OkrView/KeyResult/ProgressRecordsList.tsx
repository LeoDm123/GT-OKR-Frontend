import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { deleteProgressRecord } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { HiTrash } from 'react-icons/hi'
import Alert from '@/components/ui/Alert'
import type { ProgressRecord } from '../types/okr.types'

interface ProgressRecordsListProps {
    progressRecords?: ProgressRecord[]
    unit?: string
    okrId: string
    keyResultId: string
    onDeleteSuccess?: () => void
}

const ProgressRecordsList = ({
    progressRecords = [],
    unit = '',
    okrId,
    keyResultId,
    onDeleteSuccess,
}: ProgressRecordsListProps) => {
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
    const [message, setMessage] = useTimeOutMessage()
    const [messageType, setMessageType] = useState<'success' | 'danger' | ''>(
        '',
    )
    const [isDeleting, setIsDeleting] = useState(false)

    const sortedRecords = useMemo(() => {
        return [...progressRecords].sort((a, b) => {
            const dateA = dayjs(a.advanceDate)
            const dateB = dayjs(b.advanceDate)
            return dateB.diff(dateA) // Más reciente primero
        })
    }, [progressRecords])

    const handleDeleteClick = (recordId: string) => {
        setRecordToDelete(recordId)
        setConfirmDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return

        setIsDeleting(true)
        try {
            await deleteProgressRecord(okrId, keyResultId, recordToDelete)
            setMessage('Registro de progreso eliminado exitosamente')
            setMessageType('success')
            setConfirmDialogOpen(false)
            setRecordToDelete(null)
            onDeleteSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al eliminar el registro')
            setMessageType('danger')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false)
        setRecordToDelete(null)
    }

    if (sortedRecords.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                <p>No hay registros de progreso aún</p>
            </div>
        )
    }

    return (
        <>
            {message && (
                <Alert showIcon className="mb-4" type={messageType || 'info'}>
                    {message}
                </Alert>
            )}
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
                    <span className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-20 flex-shrink-0 text-center">
                        Acciones
                    </span>
                </div>
                <div className="space-y-1">
                    {sortedRecords.map((record, index) => {
                        const date = dayjs(record.advanceDate)
                        const createdAt = record.createdAt
                            ? dayjs(record.createdAt)
                            : null

                        const recordId = record.id || record._id
                        if (!recordId) return null

                        return (
                            <div
                                key={recordId}
                                className="flex items-center gap-4 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors text-sm"
                            >
                                <span className="font-semibold text-gray-900 dark:text-gray-100 w-24 flex-shrink-0">
                                    +{record.advanceUnits}
                                    {unit ? ` ${unit}` : ''}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 w-28 flex-shrink-0">
                                    {date.format('DD/MM/YYYY')}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 flex-1 min-w-0 truncate">
                                    {record.comment || '-'}
                                </span>
                                {createdAt && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 w-32 flex-shrink-0 text-right">
                                        {createdAt.format('DD/MM/YY HH:mm')}
                                    </span>
                                )}
                                <div className="w-20 flex-shrink-0 flex justify-center">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="plain"
                                        icon={<HiTrash />}
                                        onClick={() =>
                                            handleDeleteClick(recordId)
                                        }
                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialogOpen}
                onClose={handleCancelDelete}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                type="danger"
                title="Eliminar registro de progreso"
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                cancelText="Cancelar"
                confirmButtonColor="red"
                loading={isDeleting}
            >
                <p>
                    ¿Estás seguro de que deseas eliminar este registro de
                    progreso? Esta acción no se puede deshacer y las unidades de
                    avance se restarán del valor actual.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default ProgressRecordsList
