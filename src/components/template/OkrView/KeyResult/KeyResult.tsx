import { useState, useMemo } from 'react'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EditKeyResultDialog from './EditKeyResultDialog'
import UpdateKeyResultProgressDialog from './UpdateKeyResultProgressDialog'
import { deleteKeyResult } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useUsers } from '@/utils/hooks/useUsers'
import useTwColorByName from '@/utils/hooks/useTwColorByName'
import classNames from 'classnames'
import {
    HiCheckCircle,
    HiXCircle,
    HiClock,
    HiExclamationCircle,
    HiPencil,
    HiTrash,
    HiUser,
} from 'react-icons/hi'
import type { KeyResult as KeyResultType } from '../types/okr.types'
import type { CommonProps } from '@/components/ui/@types/common'

export interface KeyResultProps extends CommonProps {
    keyResult: KeyResultType
    okrId: string
    objective?: import('../types/okr.types').Objective
    onUpdateSuccess?: () => void
}

const getStatusBadgeColor = (status?: string): string => {
    switch (status) {
        case 'completed':
            return 'bg-emerald-500 text-white'
        case 'at_risk':
            return 'bg-red-500 text-white'
        case 'in_progress':
            return 'bg-blue-500 text-white'
        default:
            return 'bg-gray-400 text-white'
    }
}

const getStatusLabel = (status?: string) => {
    switch (status) {
        case 'completed':
            return 'Completado'
        case 'at_risk':
            return 'En riesgo'
        case 'in_progress':
            return 'En progreso'
        default:
            return 'No iniciado'
    }
}

const calculateProgress = (current?: number, target?: number): number => {
    if (current === undefined || target === undefined || target === 0) {
        return 0
    }
    return Math.min(Math.round((current / target) * 100), 100)
}

const KeyResult = ({
    keyResult,
    okrId,
    objective,
    onUpdateSuccess,
    className,
}: KeyResultProps) => {
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [message, setMessage] = useTimeOutMessage()
    const { users } = useUsers()
    const bgColor = useTwColorByName()
    const status = keyResult.status ?? 'not_started'
    const progress =
        keyResult.current !== undefined && keyResult.target !== undefined
            ? calculateProgress(keyResult.current, keyResult.target)
            : 0

    // Obtener información completa de los responsables con iniciales
    const responsibleInfo = useMemo(() => {
        // El backend usa "responsibles", mantener compatibilidad con "owners"
        const responsibles = keyResult.responsibles || keyResult.owners
        if (!responsibles || responsibles.length === 0) {
            return []
        }

        return (
            responsibles
                .map((responsible) => {
                    let user = null
                    let firstName = ''
                    let lastName = ''
                    let email = ''
                    let id = ''

                    // Si responsible es un string (ID), buscar el usuario completo
                    if (typeof responsible === 'string') {
                        user = users.find(
                            (u) =>
                                u._id === responsible ||
                                u.id === responsible ||
                                u.email === responsible,
                        )
                        if (user) {
                            firstName =
                                user.firstName ||
                                user.personalData?.firstName ||
                                ''
                            lastName =
                                user.lastName ||
                                user.personalData?.lastName ||
                                ''
                            email = user.email || ''
                            id = user._id || user.id || ''
                        } else {
                            return null
                        }
                    } else {
                        // Si responsible es un objeto, usar sus datos
                        firstName =
                            responsible.firstName ||
                            responsible.personalData?.firstName ||
                            ''
                        lastName =
                            responsible.lastName ||
                            responsible.personalData?.lastName ||
                            ''
                        email = responsible.email || ''
                        id = responsible._id || responsible.id || ''
                    }

                    // Obtener la inicial (primera letra del nombre o apellido)
                    let initial = ''
                    if (firstName) {
                        initial = firstName.charAt(0).toUpperCase()
                    } else if (lastName) {
                        initial = lastName.charAt(0).toUpperCase()
                    } else if (email) {
                        initial = email.charAt(0).toUpperCase()
                    }

                    const fullName =
                        `${firstName} ${lastName}`.trim() || email || 'Usuario'

                    return {
                        id,
                        initial,
                        fullName,
                    }
                })
                .filter(
                    (
                        item,
                    ): item is {
                        id: string
                        initial: string
                        fullName: string
                    } => item !== null && item.initial !== '',
                )
                // Eliminar duplicados por ID
                .filter(
                    (item, index, self) =>
                        index === self.findIndex((t) => t.id === item.id),
                )
        )
    }, [keyResult.responsibles, keyResult.owners, users])

    const handleUpdateSuccess = () => {
        setIsUpdateDialogOpen(false)
        onUpdateSuccess?.()
    }

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditDialogOpen(true)
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteKeyResult(okrId, keyResult.id)
            setMessage('Key Result eliminado exitosamente')
            setIsDeleteDialogOpen(false)
            onUpdateSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al eliminar el Key Result')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEditSuccess = () => {
        setIsEditDialogOpen(false)
        onUpdateSuccess?.()
    }

    return (
        <>
            <div
                className={classNames(
                    'p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors',
                    className,
                )}
                onClick={() => setIsUpdateDialogOpen(true)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsUpdateDialogOpen(true)
                    }
                }}
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {keyResult.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                            <Button
                                type="button"
                                size="sm"
                                variant="plain"
                                icon={<HiPencil />}
                                onClick={handleEditClick}
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="plain"
                                icon={<HiTrash />}
                                onClick={handleDeleteClick}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            />
                        </div>
                        <Badge innerClass={getStatusBadgeColor(status)}>
                            {getStatusLabel(status)}
                        </Badge>
                    </div>
                </div>

                {keyResult.target !== undefined && (
                    <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {keyResult.current !== undefined
                                    ? `${keyResult.current}${keyResult.unit ? ` ${keyResult.unit}` : ''} / ${keyResult.target}${keyResult.unit ? ` ${keyResult.unit}` : ''}`
                                    : `Objetivo: ${keyResult.target}${keyResult.unit ? ` ${keyResult.unit}` : ''}`}
                            </span>
                            {keyResult.current !== undefined && (
                                <span className="text-xs font-semibold">
                                    {progress}%
                                </span>
                            )}
                        </div>
                        {keyResult.current !== undefined && progress > 0 && (
                            <Progress percent={progress} size="sm" />
                        )}
                    </div>
                )}

                {/* Mostrar responsables */}
                {responsibleInfo.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 flex-wrap">
                            <HiUser className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                Responsables:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                                {responsibleInfo.map((responsible) => (
                                    <Tooltip
                                        key={responsible.id}
                                        title={responsible.fullName}
                                    >
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Avatar
                                                size={20}
                                                shape="circle"
                                                className={bgColor(
                                                    responsible.fullName,
                                                )}
                                            >
                                                {responsible.initial}
                                            </Avatar>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <UpdateKeyResultProgressDialog
                isOpen={isUpdateDialogOpen}
                onClose={() => setIsUpdateDialogOpen(false)}
                onSuccess={handleUpdateSuccess}
                okrId={okrId}
                keyResult={keyResult}
                objective={objective}
            />

            <EditKeyResultDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSuccess={handleEditSuccess}
                okrId={okrId}
                keyResult={keyResult}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onCancel={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                type="danger"
                title="Eliminar Key Result"
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                cancelText="Cancelar"
                confirmButtonColor="red"
                loading={isDeleting}
            >
                <p>
                    ¿Estás seguro de que deseas eliminar este Key Result? Esta
                    acción no se puede deshacer y se eliminarán todos los
                    registros de progreso asociados.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default KeyResult
