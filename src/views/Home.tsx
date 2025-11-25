import { OKRsSummary } from '@/components/template/OkrView/Dashboard'

const Home = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Resumen
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Resumen general de todos tus OKRs y su progreso
                    </p>
                </div>
                <OKRsSummary />
            </div>
        </div>
    )
}

export default Home
