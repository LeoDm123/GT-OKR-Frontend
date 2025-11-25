import { ReactNode } from 'react'
import Card from '@/components/ui/Card'
import classNames from 'classnames'
import type { CommonProps } from '@/components/ui/@types/common'

export interface StatCardProps extends CommonProps {
    title: string
    value: string | number
    icon?: ReactNode
    trend?: {
        value: number
        isPositive: boolean
    }
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo'
}

const StatCard = ({
    title,
    value,
    icon,
    trend,
    color = 'blue',
    className,
}: StatCardProps) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-emerald-500',
        yellow: 'bg-amber-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500',
        indigo: 'bg-indigo-500',
    }

    return (
        <Card className={classNames('h-full', className)}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {value}
                    </p>
                    {trend && (
                        <div className="mt-2 flex items-center">
                            <span
                                className={classNames(
                                    'text-xs font-medium',
                                    trend.isPositive
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400',
                                )}
                            >
                                {trend.isPositive ? '+' : ''}
                                {trend.value}%
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                vs anterior
                            </span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div
                        className={classNames(
                            'w-12 h-12 rounded-lg flex items-center justify-center text-white',
                            colorClasses[color],
                        )}
                    >
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    )
}

export default StatCard
