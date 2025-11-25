import { useState } from 'react'
import { motion } from 'framer-motion'
import classNames from 'classnames'
import { HiChevronDown } from 'react-icons/hi'
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

    return (
        <div className={classNames('mb-6', className)}>
            <div
                className="flex items-center gap-2 cursor-pointer py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors"
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
                <motion.div
                    animate={{
                        rotate: isExpanded ? 90 : 0,
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
