import Dialog from '@/components/ui/Dialog'
import UpdateKeyResultProgressForm from './UpdateKeyResultProgressForm'
import KeyResultProgressChart from './KeyResultProgressChart'
import ProgressRecordsList from './ProgressRecordsList'
import type { KeyResult as KeyResultType, Objective } from '../types/okr.types'

interface UpdateKeyResultProgressDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    okrId: string
    keyResult: KeyResultType
    objective?: Objective
}

const UpdateKeyResultProgressDialog = ({
    isOpen,
    onClose,
    onSuccess,
    okrId,
    keyResult,
    objective,
}: UpdateKeyResultProgressDialogProps) => {
    const handleSuccess = () => {
        // Refrescar los datos del padre para actualizar el gráfico y la lista
        onSuccess?.()
        // No cerrar el modal automáticamente para que el usuario pueda ver el gráfico actualizado
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            closable={true}
            width="90%"
            height="95%"
            contentClassName="!m-4 !rounded-lg flex flex-col max-w-[1600px]"
        >
            <div className="flex flex-col h-full overflow-hidden">
                <h3 className="text-xl font-semibold mb-2 px-2 pt-2">
                    Actualizar Progreso del Key Result
                </h3>

                {/* Información del Key Result */}
                <div className="mb-4 px-2">
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-1/2">
                            {keyResult.description}
                        </h4>
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 w-1/2">
                            <p>
                                Valor actual: {keyResult.current ?? 0}
                                {keyResult.unit
                                    ? ` ${keyResult.unit}`
                                    : ''} / {keyResult.target ?? 0}
                                {keyResult.unit ? ` ${keyResult.unit}` : ''}
                            </p>
                            <p className="mt-1">
                                Progreso:{' '}
                                {keyResult.target && keyResult.target > 0
                                    ? Math.round(
                                          ((keyResult.current ?? 0) /
                                              keyResult.target) *
                                              100,
                                      )
                                    : 0}
                                %
                            </p>
                        </div>
                    </div>
                </div>

                {/* Primera fila: 70% del alto - Dos columnas 50-50 */}
                <div
                    className="flex-1 flex overflow-hidden px-2 pb-2"
                    style={{ height: '75%' }}
                >
                    {/* Columna izquierda: Formulario */}
                    <div className="w-1/3 pr-4 flex flex-col overflow-y-auto">
                        <UpdateKeyResultProgressForm
                            okrId={okrId}
                            keyResult={keyResult}
                            onSuccess={handleSuccess}
                            onCancel={onClose}
                        />
                    </div>

                    {/* Divider vertical */}
                    <div className="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>

                    {/* Columna derecha: Gráfico */}
                    <div className="w-2/3 pl-4 flex flex-col">
                        <div className="mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Progreso del Key Result
                            </h4>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <KeyResultProgressChart
                                keyResult={keyResult}
                                startDate={objective?.startDate}
                                endDate={
                                    objective?.endDate || objective?.dueDate
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Segunda fila: 30% del alto - Lista de progresos */}
                <div
                    className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4"
                    style={{ height: '25%' }}
                >
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Historial de Progresos
                    </h4>
                    <div className="h-full">
                        <ProgressRecordsList
                            progressRecords={keyResult.progressRecords}
                            unit={keyResult.unit}
                            okrId={okrId}
                            keyResultId={keyResult.id}
                            onDeleteSuccess={handleSuccess}
                        />
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default UpdateKeyResultProgressDialog
