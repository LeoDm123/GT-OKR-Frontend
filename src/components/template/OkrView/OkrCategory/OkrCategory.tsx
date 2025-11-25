import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import classNames from 'classnames'
import { HiChevronDown } from 'react-icons/hi'
import Progress from '@/components/ui/Progress'
import OkrItem from '../OkrItem'
import type { OkrCategory as OkrCategoryType } from '../types/okr.types'
import type { CommonProps } from '@/components/ui/@types/common'

export interface OkrCategoryProps extends CommonProps {
    category: OkrCategoryType
    defaultExpanded?: boolean
    onUpdateSuccess?: () => void
}

const OkrCategory = ({
    category,
    defaultExpanded = false,
    className,
    onUpdateSuccess,
}: OkrCategoryProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    const toggleExpand = () => {
        setIsExpanded(!isExpanded)
    }

    // Calcular el total de OKRs y el progreso promedio de la categoría
    const { totalOKRs, averageProgress } = useMemo(() => {
        const total = category.objectives.length
        if (total === 0) {
            return { totalOKRs: 0, averageProgress: 0 }
        }

        const totalProgress = category.objectives.reduce((sum, objective) => {
            return sum + (objective.progress || 0)
        }, 0)

        const average = Math.round(totalProgress / total)

        return {
            totalOKRs: total,
            averageProgress: average,
        }
    }, [category.objectives])

    return (
        <div className={classNames('mb-6', className)}>
            <div
                className="flex items-center justify-between cursor-pointer py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors px-2"
                onClick={toggleExpand}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpand()
                    }
                }}
            >
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{
                            rotate: isExpanded ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center"
                    >
                        <HiChevronDown className="text-lg text-gray-500" />
                    </motion.div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {category.name}
                    </h3>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {totalOKRs} OKR{totalOKRs !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[150px]">
                        <div className="flex-1">
                            <Progress
                                percent={averageProgress}
                                size="sm"
                                showInfo={false}
                            />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[40px] text-right">
                            {averageProgress}%
                        </span>
                    </div>
                </div>
            </div>

            <motion.div
                initial={false}
                animate={{
                    height: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
            >
                {category.objectives.length > 0 ? (
                    <div className="pl-6">
                        <div className="grid grid-cols-3 gap-4 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="col-span-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Nombre
                                </span>
                            </div>
                            <div className="col-span-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Deadline
                                </span>
                            </div>
                            <div className="col-span-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Progress
                                </span>
                            </div>
                        </div>
                        {category.objectives.map((objective) => (
                            <OkrItem
                                key={objective.id}
                                objective={objective}
                                onUpdateSuccess={onUpdateSuccess}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="pl-6 py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No hay OKRs en esta categoría
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

export default OkrCategory
