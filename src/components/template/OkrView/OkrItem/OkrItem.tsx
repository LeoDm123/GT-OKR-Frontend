import { useState } from 'react'
import { motion } from 'framer-motion'
import Progress from '@/components/ui/Progress'
import classNames from 'classnames'
import { HiChevronDown } from 'react-icons/hi'
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
    className,
    defaultExpanded = false,
    onUpdateSuccess,
}: OkrItemProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const progress = objective.progress ?? 0
    const hasKeyResults =
        objective.keyResults && objective.keyResults.length > 0

    const toggleExpand = () => {
        if (hasKeyResults) {
            setIsExpanded(!isExpanded)
        }
    }

    const formatDeadline = (date?: string): string => {
        if (!date) return 'N/A'
        try {
            const dateObj = new Date(date)
            return dateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            })
        } catch {
            return 'N/A'
        }
    }

    return (
        <div className={classNames('mb-3', className)}>
            <div
                className={classNames(
                    'grid grid-cols-3 gap-4 items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors',
                    hasKeyResults && 'cursor-pointer',
                )}
                onClick={toggleExpand}
                role={hasKeyResults ? 'button' : undefined}
                tabIndex={hasKeyResults ? 0 : undefined}
                onKeyPress={(e) => {
                    if (hasKeyResults && (e.key === 'Enter' || e.key === ' ')) {
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

                {/* Progress */}
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
                        {hasKeyResults && (
                            <motion.div
                                animate={{
                                    rotate: isExpanded ? 90 : 0,
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
    )
}

export default OkrItem
