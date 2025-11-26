import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import CreateOKRForm from './CreateOKRForm'

interface CreateOKRDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    owner: string
}

const CreateOKRDialog = ({
    isOpen,
    onClose,
    onSuccess,
    owner,
}: CreateOKRDialogProps) => {
    const handleSuccess = () => {
        onSuccess?.()
        onClose()
    }

    return (
        <Dialog
            isOpen={isOpen}
            closable={true}
            width="100vw"
            height="100vh"
            contentClassName="!m-0 !rounded-none h-full flex flex-col"
            style={{
                content: {
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    position: 'fixed',
                },
            }}
            onClose={onClose}
        >
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <h3 className="text-xl font-semibold mb-4 px-6 pt-6">
                    Crear Nuevo OKR
                </h3>
                <CreateOKRForm
                    owner={owner}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                />
            </div>
        </Dialog>
    )
}

export default CreateOKRDialog
