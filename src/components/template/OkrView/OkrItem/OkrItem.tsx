import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Progress from '@/components/ui/Progress'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { EditOKRDialog } from '../EditOKRForm'
import { deleteOKR } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useUsers } from '@/utils/hooks/useUsers'
import useTwColorByName from '@/utils/hooks/useTwColorByName'
import classNames from 'classnames'
import { HiChevronDown, HiPencil, HiTrash } from 'react-icons/hi'
import {
    HiStar,
    HiCheckCircle,
    HiXCircle,
    HiClock,
    HiExclamationCircle,
} from 'react-icons/hi'
import KeyResult from '../KeyResult'
import type { Objective } from '../types/okr.types'
import type { CommonProps } from '@/components/ui/@types/common'

export interface OkrItemProps extends CommonProps {
    objective: Objective
    categoryName?: string
    defaultExpanded?: boolean
    onUpdateSuccess?: () => void
}

const getObjectiveIcon = (objective: Objective) => {
    switch (objective.status) {
        case 'completed':
            return <HiCheckCircle className="text-emerald-500 text-base" />
        case 'at_risk':
            return <HiExclamationCircle className="text-red-500 text-base" />
        case 'in_progress':
            return <HiClock className="text-blue-500 text-base" />
        default:
            return <HiXCircle className="text-gray-400 text-base" />
    }
}

const getProgressColor = (progress: number): string => {
    if (progress >= 80) {
        return 'emerald-500'
    } else if (progress >= 50) {
        return 'orange-500'
    } else if (progress >= 25) {
        return 'blue-500'
    } else {
        return 'gray-400'
    }
}

const OkrItem = ({
    objective,
    categoryName,
    className,
    defaultExpanded = false,
    onUpdateSuccess,
}: OkrItemProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [message, setMessage] = useTimeOutMessage()
    const { users } = useUsers()
    const bgColor = useTwColorByName()
    const progress = objective.progress ?? 0
    const hasKeyResults =
        objective.keyResults && objective.keyResults.length > 0

    // Recolectar todos los responsables únicos de todos los Key Results
    const uniqueResponsibles = useMemo(() => {
        const responsibleIds = new Set<string>()

        // Recolectar todos los IDs de responsables de todos los Key Results
        objective.keyResults?.forEach((kr) => {
            const responsibles = kr.responsibles || kr.owners
            if (responsibles && responsibles.length > 0) {
                responsibles.forEach((owner) => {
                    if (typeof owner === 'string') {
                        responsibleIds.add(owner)
                    } else {
                        const id = owner._id || owner.id
                        if (id) {
                            responsibleIds.add(id)
                        }
                    }
                })
            }
        })

        // Obtener información completa de los usuarios y generar iniciales
        return (
            Array.from(responsibleIds)
                .map((id) => {
                    const user = users.find(
                        (u) => u._id === id || u.id === id || u.email === id,
                    )
                    if (user) {
                        const firstName =
                            user.firstName || user.personalData?.firstName || ''
                        const lastName =
                            user.lastName || user.personalData?.lastName || ''

                        // Obtener la inicial (primera letra del nombre o apellido)
                        let initial = ''
                        if (firstName) {
                            initial = firstName.charAt(0).toUpperCase()
                        } else if (lastName) {
                            initial = lastName.charAt(0).toUpperCase()
                        } else if (user.email) {
                            initial = user.email.charAt(0).toUpperCase()
                        }

                        const fullName =
                            `${firstName} ${lastName}`.trim() ||
                            user.email ||
                            'Usuario'

                        return {
                            id: user._id || user.id || '',
                            initial,
                            fullName,
                        }
                    }
                    return null
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
    }, [objective.keyResults, users])

    const toggleExpand = () => {
        if (hasKeyResults) {
            setIsExpanded(!isExpanded)
        }
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
            await deleteOKR(objective.id)
            setMessage('OKR eliminado exitosamente')
            setIsDeleteDialogOpen(false)
            onUpdateSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al eliminar el OKR')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEditSuccess = () => {
        setIsEditDialogOpen(false)
        onUpdateSuccess?.()
    }

    const formatDeadline = (date?: string): string => {
        if (!date) return 'N/A'
        try {
            const dateObj = new Date(date)
            const day = String(dateObj.getDate()).padStart(2, '0')
            const month = String(dateObj.getMonth() + 1).padStart(2, '0')
            const year = dateObj.getFullYear()
            return `${day}-${month}-${year}`
        } catch {
            return 'N/A'
        }
    }

    return (
        <>
            <div className={classNames('mb-3', className)}>
                <div
                    className={classNames(
                        'grid grid-cols-4 gap-4 items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors',
                        hasKeyResults && 'cursor-pointer',
                    )}
                    onClick={toggleExpand}
                    role={hasKeyResults ? 'button' : undefined}
                    tabIndex={hasKeyResults ? 0 : undefined}
                    onKeyPress={(e) => {
                        if (
                            hasKeyResults &&
                            (e.key === 'Enter' || e.key === ' ')
                        ) {
                            e.preventDefault()
                            toggleExpand()
                        }
                    }}
                >
                    {/* Nombre */}
                    <div className="col-span-1 flex items-center gap-2">
                        {getObjectiveIcon(objective)}
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {objective.title}
                        </h4>
                    </div>

                    {/* Deadline */}
                    <div className="col-span-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDeadline(objective.dueDate)}
                        </span>
                    </div>

                    {/* Responsables */}
                    <div className="col-span-1 flex items-center gap-1">
                        {uniqueResponsibles.length > 0 ? (
                            uniqueResponsibles.map((responsible) => (
                                <Tooltip
                                    key={responsible.id}
                                    title={responsible.fullName}
                                >
                                    <Avatar
                                        size={24}
                                        shape="circle"
                                        className={bgColor(
                                            responsible.fullName,
                                        )}
                                    >
                                        {responsible.initial}
                                    </Avatar>
                                </Tooltip>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                Sin responsables
                            </span>
                        )}
                    </div>

                    {/* Progress y Acciones */}
                    <div className="col-span-1 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <Progress
                                percent={progress}
                                showInfo={false}
                                color={getProgressColor(progress)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {progress}%
                            </span>
                            <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
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
                            {hasKeyResults && (
                                <motion.div
                                    animate={{
                                        rotate: isExpanded ? 180 : 0,
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <HiChevronDown className="text-sm text-gray-500" />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Key Results expandidos */}
                {hasKeyResults && (
                    <motion.div
                        initial={false}
                        animate={{
                            height: isExpanded ? 'auto' : 0,
                            opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="pl-7 pr-4 pb-3 mt-2 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                Key Results:
                            </h5>
                            <div className="space-y-2">
                                {objective.keyResults.map((kr) => (
                                    <KeyResult
                                        key={kr.id}
                                        keyResult={kr}
                                        okrId={objective.id}
                                        objective={objective}
                                        onUpdateSuccess={onUpdateSuccess}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <EditOKRDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSuccess={handleEditSuccess}
                okrId={objective.id}
                objective={objective}
                category={categoryName}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onCancel={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                type="danger"
                title="Eliminar OKR"
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                cancelText="Cancelar"
                confirmButtonColor="red"
                loading={isDeleting}
            >
                <p>
                    ¿Estás seguro de que deseas eliminar este OKR? Esta acción
                    no se puede deshacer y se eliminarán todos los Key Results
                    asociados.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default OkrItem
