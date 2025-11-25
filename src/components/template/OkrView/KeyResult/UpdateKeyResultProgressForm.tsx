import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import DatePicker from '@/components/ui/DatePicker'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { addProgressRecord } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import type { CommonProps } from '@/components/ui/@types/common'
import type { KeyResult as KeyResultType } from '../types/okr.types'

interface UpdateKeyResultProgressFormValues {
    progressDate: Date | null
    progressUnits: number
    comment: string
}

interface UpdateKeyResultProgressFormProps extends CommonProps {
    okrId: string
    keyResult: KeyResultType
    onSuccess?: () => void
    onCancel?: () => void
}

const validationSchema = Yup.object().shape({
    progressDate: Yup.date().required('La fecha es requerida').nullable(),
    progressUnits: Yup.number()
        .required('Las unidades de progreso son requeridas')
        .min(0, 'Las unidades deben ser positivas'),
    comment: Yup.string(),
})

const UpdateKeyResultProgressForm = ({
    okrId,
    keyResult,
    onSuccess,
    onCancel,
    className,
}: UpdateKeyResultProgressFormProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const currentValue = keyResult.current ?? 0
    const targetValue = keyResult.target ?? 0
    const unit = keyResult.unit || ''

    const initialValues: UpdateKeyResultProgressFormValues = {
        progressDate: new Date(),
        progressUnits: 0,
        comment: '',
    }

    const handleSubmit = async (
        values: UpdateKeyResultProgressFormValues,
        {
            setSubmitting,
            resetForm,
        }: {
            setSubmitting: (isSubmitting: boolean) => void
            resetForm: () => void
        },
    ) => {
        try {
            if (!values.progressDate) {
                setMessage('La fecha es requerida')
                setSubmitting(false)
                return
            }

            if (values.progressUnits <= 0) {
                setMessage('Las unidades de progreso deben ser mayores a 0')
                setSubmitting(false)
                return
            }

            // Crear el registro de progreso
            const progressRecord = {
                advanceUnits: values.progressUnits,
                advanceDate: values.progressDate,
                comment: values.comment || undefined,
            }

            // El backend deberá:
            // 1. Agregar el registro al array progressRecords
            // 2. Actualizar currentValue sumando advanceUnits
            // 3. Recalcular el progress y status
            await addProgressRecord(okrId, keyResult.id, progressRecord)
            // Resetear el formulario
            resetForm()
            setSubmitting(false)
            // Llamar a onSuccess para refrescar los datos del padre
            onSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al actualizar el progreso')
            setSubmitting(false)
        }
    }

    return (
        <div className={className}>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    {message}
                </Alert>
            )}

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ touched, errors, values, isSubmitting, setFieldValue }) => (
                    <Form>
                        <FormContainer>
                            <FormItem
                                label="Fecha de progreso *"
                                invalid={
                                    (errors.progressDate &&
                                        touched.progressDate) as boolean
                                }
                                errorMessage={errors.progressDate}
                                className="mb-4"
                            >
                                <DatePicker
                                    inputtable
                                    placeholder="Seleccionar fecha"
                                    value={values.progressDate}
                                    onChange={(date) => {
                                        setFieldValue('progressDate', date)
                                    }}
                                />
                            </FormItem>

                            <FormItem
                                label={`Unidades de progreso * ${unit ? `(${unit})` : ''}`}
                                invalid={
                                    (errors.progressUnits &&
                                        touched.progressUnits) as boolean
                                }
                                errorMessage={errors.progressUnits}
                                className="mb-4"
                            >
                                <Field
                                    type="number"
                                    name="progressUnits"
                                    placeholder="0"
                                    component={Input}
                                    min={0}
                                    step="any"
                                />
                                {values.progressUnits > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Nuevo valor:{' '}
                                        {currentValue + values.progressUnits}
                                        {unit ? ` ${unit}` : ''} / {targetValue}
                                        {unit ? ` ${unit}` : ''} (
                                        {targetValue > 0
                                            ? Math.round(
                                                  ((currentValue +
                                                      values.progressUnits) /
                                                      targetValue) *
                                                      100,
                                              )
                                            : 0}
                                        %)
                                    </p>
                                )}
                            </FormItem>

                            <FormItem
                                label="Comentario"
                                invalid={
                                    (errors.comment &&
                                        touched.comment) as boolean
                                }
                                errorMessage={errors.comment}
                                className="mb-4"
                            >
                                <Field
                                    type="text"
                                    name="comment"
                                    placeholder="Comentario sobre este progreso..."
                                    component={Input}
                                />
                            </FormItem>

                            <div className="flex justify-end gap-2 mt-6">
                                {onCancel && (
                                    <Button
                                        type="button"
                                        variant="plain"
                                        onClick={onCancel}
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    variant="solid"
                                    loading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Actualizar Progreso
                                </Button>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default UpdateKeyResultProgressForm
