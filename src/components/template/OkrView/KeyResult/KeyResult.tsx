import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import classNames from 'classnames'
import {
    HiCheckCircle,
    HiXCircle,
    HiClock,
    HiExclamationCircle,
} from 'react-icons/hi'
import UpdateKeyResultProgressDialog from './UpdateKeyResultProgressDialog'
import type { KeyResult as KeyResultType } from '../types/okr.types'
import type { CommonProps } from '@/components/ui/@types/common'

export interface KeyResultProps extends CommonProps {
    keyResult: KeyResultType
    okrId: string
    objective?: import('../types/okr.types').Objective
    onUpdateSuccess?: () => void
}

const getStatusIcon = (status?: string) => {
    switch (status) {
        case 'completed':
            return <HiCheckCircle className="text-emerald-500 text-sm" />
        case 'at_risk':
            return <HiExclamationCircle className="text-red-500 text-sm" />
        case 'in_progress':
            return <HiClock className="text-blue-500 text-sm" />
        default:
            return <HiXCircle className="text-gray-400 text-sm" />
    }
}

const getStatusBadge = (status?: string) => {
    switch (status) {
        case 'completed':
            return 'success'
        case 'at_risk':
            return 'danger'
        case 'in_progress':
            return 'info'
        default:
            return 'default'
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
    const status = keyResult.status ?? 'not_started'
    const progress =
        keyResult.current !== undefined && keyResult.target !== undefined
            ? calculateProgress(keyResult.current, keyResult.target)
            : 0

    const handleUpdateSuccess = () => {
        setIsUpdateDialogOpen(false)
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
                        {getStatusIcon(status)}
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {keyResult.description}
                        </p>
                    </div>
                    <Badge variant={getStatusBadge(status)}>
                        {getStatusLabel(status)}
                    </Badge>
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
            </div>
            <UpdateKeyResultProgressDialog
                isOpen={isUpdateDialogOpen}
                onClose={() => setIsUpdateDialogOpen(false)}
                onSuccess={handleUpdateSuccess}
                okrId={okrId}
                keyResult={keyResult}
                objective={objective}
            />
        </>
    )
}

export default KeyResult
