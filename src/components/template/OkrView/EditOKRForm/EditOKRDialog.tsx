import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import EditOKRForm from './EditOKRForm'
import Spinner from '@/components/ui/Spinner'
import { getOKRById } from '@/api/api'
import type { Objective } from '../types/okr.types'

interface EditOKRDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    okrId: string
    objective: Objective
    category?: string
}

interface OKRData {
    period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    visibility?: 'private' | 'public' | 'team'
    team?: string
    [key: string]: any
}

const EditOKRDialog = ({
    isOpen,
    onClose,
    onSuccess,
    okrId,
    objective,
    category,
}: EditOKRDialogProps) => {
    const [okrData, setOkrData] = useState<OKRData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && okrId) {
            setLoading(true)
            setError(null)
            getOKRById(okrId)
                .then((data) => {
                    setOkrData(data.okr || data)
                })
                .catch((err) => {
                    setError(err.message || 'Error al cargar los datos del OKR')
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            setOkrData(null)
        }
    }, [isOpen, okrId])

    const handleSuccess = () => {
        onSuccess?.()
        onClose()
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            closable={true}
            width="800px"
            height="80vh"
            contentClassName="!m-4 !rounded-lg flex flex-col"
        >
            <div className="flex flex-col h-full overflow-hidden">
                <h3 className="text-xl font-semibold mb-4 px-2 pt-2">
                    Editar OKR
                </h3>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner size={40} />
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500">{error}</div>
                    ) : (
                        <EditOKRForm
                            okrId={okrId}
                            objective={objective}
                            category={category || okrData?.category}
                            okrData={okrData}
                            onSuccess={handleSuccess}
                            onCancel={onClose}
                        />
                    )}
                </div>
            </div>
        </Dialog>
    )
}

export default EditOKRDialog
