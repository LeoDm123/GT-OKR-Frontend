import { useState, useMemo, useEffect } from 'react'
import OkrCategory from '../OkrCategory'
import Button from '@/components/ui/Button'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'
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
    // Estado para controlar qué categorías están expandidas
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        () => new Set(defaultExpandedCategories),
    )

    // Actualizar estado cuando cambien las categorías o defaultExpandedCategories
    useEffect(() => {
        setExpandedCategories(new Set(defaultExpandedCategories))
    }, [defaultExpandedCategories.join(',')])

    // Verificar si todas las categorías están expandidas
    const allExpanded = useMemo(() => {
        if (categories.length === 0) return false
        return categories.every((category) =>
            expandedCategories.has(category.id),
        )
    }, [categories, expandedCategories])

    // Función para expandir todas las categorías
    const expandAll = () => {
        const allCategoryIds = new Set(categories.map((cat) => cat.id))
        setExpandedCategories(allCategoryIds)
    }

    // Función para colapsar todas las categorías
    const collapseAll = () => {
        setExpandedCategories(new Set())
    }

    // Función para toggle de una categoría específica
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId)
            } else {
                newSet.add(categoryId)
            }
            return newSet
        })
    }

    return (
        <div className={className}>
            {categories.length > 0 && (
                <div className="flex items-center justify-end mb-4 gap-2">
                    {allExpanded ? (
                        <Button
                            variant="plain"
                            size="sm"
                            icon={<HiChevronUp />}
                            onClick={collapseAll}
                        >
                            Contraer Todo
                        </Button>
                    ) : (
                        <Button
                            variant="plain"
                            size="sm"
                            icon={<HiChevronDown />}
                            onClick={expandAll}
                        >
                            Expandir Todo
                        </Button>
                    )}
                </div>
            )}
            {categories.length > 0 ? (
                categories.map((category) => (
                    <OkrCategory
                        key={category.id}
                        category={category}
                        isExpanded={expandedCategories.has(category.id)}
                        onToggleExpand={() => toggleCategory(category.id)}
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
