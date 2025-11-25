import { useState, useEffect } from 'react'
import { OkrList } from '@/components/template/OkrView'
import { CreateOKRDialog } from '@/components/template/OkrView/CreateOKRForm'
import { useOKRs } from '@/utils/hooks/useOKRs'
import { useCurrentUserId } from '@/utils/hooks/useCurrentUser'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { HiPlus } from 'react-icons/hi'

const OKRsDashboard = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const userId = useCurrentUserId()
    const { categories, loading, error, refresh } = useOKRs()

    const handleCreateSuccess = () => {
        // Refrescar los OKRs después de crear uno nuevo
        refresh()
        setIsDialogOpen(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size={40} />
            </div>
        )
    }

    return (
        <div className="p-2 bg-white dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header siempre visible */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        OKRs Dashboard
                    </h1>
                    <Button
                        variant="solid"
                        icon={<HiPlus />}
                        onClick={() => setIsDialogOpen(true)}
                        disabled={!userId}
                    >
                        Crear OKR
                    </Button>
                </div>

                {/* Contenido condicional */}
                {error ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <p className="text-red-500 mb-4">
                                Error al cargar los OKRs: {error}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                No hay OKRs disponibles
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                Haz clic en "Crear OKR" para comenzar
                            </p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <OkrList
                            categories={categories}
                            defaultExpandedCategories={
                                categories.length > 0 ? [categories[0].id] : []
                            }
                            onUpdateSuccess={refresh}
                        />
                    </div>
                )}
            </div>

            {/* Dialog siempre disponible */}
            <CreateOKRDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleCreateSuccess}
                owner={userId}
            />
        </div>
    )
}

export default OKRsDashboard
