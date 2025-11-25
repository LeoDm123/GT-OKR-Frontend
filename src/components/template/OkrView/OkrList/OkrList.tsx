import OkrCategory from '../OkrCategory'
import type { OkrListProps } from '../types/okr.types'
import type { CommonProps } from '@/components/ui/@types/common'

export interface OkrListComponentProps extends CommonProps, OkrListProps {
    onUpdateSuccess?: () => void
}

const OkrList = ({
    categories,
    defaultExpandedCategories = [],
    className,
    onUpdateSuccess,
}: OkrListComponentProps) => {
    return (
        <div className={className}>
            {categories.length > 0 ? (
                categories.map((category) => (
                    <OkrCategory
                        key={category.id}
                        category={category}
                        defaultExpanded={defaultExpandedCategories.includes(
                            category.id,
                        )}
                        onUpdateSuccess={onUpdateSuccess}
                    />
                ))
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                        No hay categorías de OKRs disponibles
                    </p>
                </div>
            )}
        </div>
    )
}

export default OkrList
