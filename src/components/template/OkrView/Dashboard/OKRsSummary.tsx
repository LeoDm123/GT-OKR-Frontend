import { useMemo } from 'react'
import Card from '@/components/ui/Card'
import StatCard from './StatCard'
import Progress from '@/components/ui/Progress'
import { useOKRs } from '@/utils/hooks/useOKRs'
import Spinner from '@/components/ui/Spinner'
import {
    HiChartBar,
    HiCheckCircle,
    HiClock,
    HiExclamationCircle,
    HiXCircle,
    HiTrendingUp,
} from 'react-icons/hi'
import type { Objective, KeyResult } from '../types/okr.types'

interface OKRsSummaryStats {
    totalOKRs: number
    totalKeyResults: number
    averageProgress: number
    completedOKRs: number
    inProgressOKRs: number
    atRiskOKRs: number
    notStartedOKRs: number
    completedKeyResults: number
    inProgressKeyResults: number
    atRiskKeyResults: number
    notStartedKeyResults: number
    categoriesCount: number
    progressByCategory: Array<{
        categoryName: string
        okrsCount: number
        averageProgress: number
    }>
}

const calculateStats = (
    categories: Array<{
        name: string
        objectives: Objective[]
    }>,
): OKRsSummaryStats => {
    const allObjectives: Objective[] = []
    const allKeyResults: KeyResult[] = []

    categories.forEach((category) => {
        allObjectives.push(...category.objectives)
        category.objectives.forEach((objective) => {
            allKeyResults.push(...objective.keyResults)
        })
    })

    // Calcular estadísticas de OKRs
    const totalOKRs = allObjectives.length
    const totalKeyResults = allKeyResults.length

    const completedOKRs = allObjectives.filter(
        (obj) => obj.status === 'completed',
    ).length
    const inProgressOKRs = allObjectives.filter(
        (obj) => obj.status === 'in_progress',
    ).length
    const atRiskOKRs = allObjectives.filter(
        (obj) => obj.status === 'at_risk',
    ).length
    const notStartedOKRs = allObjectives.filter(
        (obj) => obj.status === 'not_started',
    ).length

    // Calcular estadísticas de Key Results
    const completedKeyResults = allKeyResults.filter(
        (kr) => kr.status === 'completed',
    ).length
    const inProgressKeyResults = allKeyResults.filter(
        (kr) => kr.status === 'in_progress',
    ).length
    const atRiskKeyResults = allKeyResults.filter(
        (kr) => kr.status === 'at_risk',
    ).length
    const notStartedKeyResults = allKeyResults.filter(
        (kr) => kr.status === 'not_started',
    ).length

    // Calcular progreso promedio
    const totalProgress = allObjectives.reduce(
        (sum, obj) => sum + (obj.progress || 0),
        0,
    )
    const averageProgress =
        totalOKRs > 0 ? Math.round(totalProgress / totalOKRs) : 0

    // Calcular progreso por categoría
    const progressByCategory = categories.map((category) => {
        const categoryOKRs = category.objectives.length
        const categoryProgress = category.objectives.reduce(
            (sum, obj) => sum + (obj.progress || 0),
            0,
        )
        const avgProgress =
            categoryOKRs > 0 ? Math.round(categoryProgress / categoryOKRs) : 0

        return {
            categoryName: category.name,
            okrsCount: categoryOKRs,
            averageProgress: avgProgress,
        }
    })

    return {
        totalOKRs,
        totalKeyResults,
        averageProgress,
        completedOKRs,
        inProgressOKRs,
        atRiskOKRs,
        notStartedOKRs,
        completedKeyResults,
        inProgressKeyResults,
        atRiskKeyResults,
        notStartedKeyResults,
        categoriesCount: categories.length,
        progressByCategory,
    }
}

const OKRsSummary = () => {
    const { categories, loading, error } = useOKRs()

    const stats = useMemo(() => {
        return calculateStats(categories)
    }, [categories])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">
                        Error al cargar los OKRs: {error}
                    </p>
                </div>
            </div>
        )
    }

    if (stats.totalOKRs === 0) {
        return (
            <Card>
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                        No hay OKRs disponibles. Crea tu primer OKR para ver las
                        estadísticas.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Tarjetas de estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total OKRs"
                    value={stats.totalOKRs}
                    icon={<HiChartBar className="text-2xl" />}
                    color="indigo"
                />
                <StatCard
                    title="Progreso Promedio"
                    value={`${stats.averageProgress}%`}
                    icon={<HiTrendingUp className="text-2xl" />}
                    color="blue"
                />
                <StatCard
                    title="Key Results"
                    value={stats.totalKeyResults}
                    icon={<HiCheckCircle className="text-2xl" />}
                    color="green"
                />
                <StatCard
                    title="Categorías"
                    value={stats.categoriesCount}
                    icon={<HiChartBar className="text-2xl" />}
                    color="purple"
                />
            </div>

            {/* OKRs por estado */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    OKRs por Estado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Completados
                            </span>
                            <HiCheckCircle className="text-emerald-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.completedOKRs}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalOKRs > 0
                                ? Math.round(
                                      (stats.completedOKRs / stats.totalOKRs) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                En Progreso
                            </span>
                            <HiClock className="text-blue-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.inProgressOKRs}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalOKRs > 0
                                ? Math.round(
                                      (stats.inProgressOKRs / stats.totalOKRs) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                En Riesgo
                            </span>
                            <HiExclamationCircle className="text-red-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.atRiskOKRs}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalOKRs > 0
                                ? Math.round(
                                      (stats.atRiskOKRs / stats.totalOKRs) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                No Iniciados
                            </span>
                            <HiXCircle className="text-gray-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                            {stats.notStartedOKRs}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalOKRs > 0
                                ? Math.round(
                                      (stats.notStartedOKRs / stats.totalOKRs) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>
                </div>
            </Card>

            {/* Key Results por estado */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Key Results por Estado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Completados
                            </span>
                            <HiCheckCircle className="text-emerald-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.completedKeyResults}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalKeyResults > 0
                                ? Math.round(
                                      (stats.completedKeyResults /
                                          stats.totalKeyResults) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                En Progreso
                            </span>
                            <HiClock className="text-blue-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.inProgressKeyResults}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalKeyResults > 0
                                ? Math.round(
                                      (stats.inProgressKeyResults /
                                          stats.totalKeyResults) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                En Riesgo
                            </span>
                            <HiExclamationCircle className="text-red-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.atRiskKeyResults}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalKeyResults > 0
                                ? Math.round(
                                      (stats.atRiskKeyResults /
                                          stats.totalKeyResults) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                No Iniciados
                            </span>
                            <HiXCircle className="text-gray-500 text-xl" />
                        </div>
                        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                            {stats.notStartedKeyResults}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.totalKeyResults > 0
                                ? Math.round(
                                      (stats.notStartedKeyResults /
                                          stats.totalKeyResults) *
                                          100,
                                  )
                                : 0}
                            % del total
                        </p>
                    </div>
                </div>
            </Card>

            {/* Progreso por categoría */}
            {stats.progressByCategory.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Progreso por Categoría
                    </h3>
                    <div className="space-y-4">
                        {stats.progressByCategory.map((category) => (
                            <div key={category.categoryName}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {category.categoryName}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ({category.okrsCount} OKR
                                            {category.okrsCount !== 1
                                                ? 's'
                                                : ''}
                                            )
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {category.averageProgress}%
                                    </span>
                                </div>
                                <Progress
                                    percent={category.averageProgress}
                                    size="sm"
                                    showInfo={false}
                                />
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

export default OKRsSummary
