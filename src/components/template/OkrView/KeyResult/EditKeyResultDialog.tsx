import Dialog from '@/components/ui/Dialog'
import EditKeyResultForm from './EditKeyResultForm'
import type { KeyResult as KeyResultType } from '../types/okr.types'

interface EditKeyResultDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    okrId: string
    keyResult: KeyResultType
}

const EditKeyResultDialog = ({
    isOpen,
    onClose,
    onSuccess,
    okrId,
    keyResult,
}: EditKeyResultDialogProps) => {
    const handleSuccess = () => {
        onSuccess?.()
        onClose()
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} closable={true} width="600px">
            <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                    Editar Key Result
                </h3>
                <EditKeyResultForm
                    okrId={okrId}
                    keyResult={keyResult}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                />
            </div>
        </Dialog>
    )
}

export default EditKeyResultDialog
