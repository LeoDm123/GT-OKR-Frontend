import { useState } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Select from '@/components/ui/Select'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { updateKeyResult } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import type { CommonProps } from '@/components/ui/@types/common'
import type { KeyResult as KeyResultType } from '../types/okr.types'

export interface EditKeyResultFormProps extends CommonProps {
    okrId: string
    keyResult: KeyResultType
    onSuccess?: () => void
    onCancel?: () => void
}

interface EditKeyResultFormValues {
    title: string
    description: string
    targetValue: number
    unit: string
}

const validationSchema = Yup.object().shape({
    title: Yup.string()
        .required('El título es requerido')
        .min(3, 'El título debe tener al menos 3 caracteres'),
    description: Yup.string(),
    targetValue: Yup.number()
        .required('El valor objetivo es requerido')
        .min(0, 'El valor objetivo debe ser positivo'),
    unit: Yup.string(),
})

const unitOptions = [
    { value: '', label: 'Sin unidad' },
    { value: '%', label: '% (Porcentaje)' },
    { value: 'unidades', label: 'Unidades' },
    { value: 'kg', label: 'kg (Kilogramos)' },
    { value: 'g', label: 'g (Gramos)' },
    { value: 'l', label: 'l (Litros)' },
    { value: 'ml', label: 'ml (Mililitros)' },
    { value: 'm', label: 'm (Metros)' },
    { value: 'cm', label: 'cm (Centímetros)' },
    { value: 'km', label: 'km (Kilómetros)' },
    { value: 'horas', label: 'Horas' },
    { value: 'minutos', label: 'Minutos' },
    { value: 'días', label: 'Días' },
    { value: 'semanas', label: 'Semanas' },
    { value: 'meses', label: 'Meses' },
    { value: 'años', label: 'Años' },
    { value: 'USD', label: 'USD (Dólares)' },
    { value: 'EUR', label: 'EUR (Euros)' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'proyectos', label: 'Proyectos' },
    { value: 'tareas', label: 'Tareas' },
    { value: 'reuniones', label: 'Reuniones' },
    { value: 'personas', label: 'Personas' },
]

const EditKeyResultForm = ({
    okrId,
    keyResult,
    onSuccess,
    onCancel,
    className,
}: EditKeyResultFormProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const [messageType, setMessageType] = useState<'success' | 'danger' | ''>(
        '',
    )

    const initialValues: EditKeyResultFormValues = {
        title: keyResult.description || '',
        description: '',
        targetValue: keyResult.target ?? 0,
        unit: keyResult.unit || '',
    }

    const handleSubmit = async (
        values: EditKeyResultFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void },
    ) => {
        try {
            const updateData = {
                title: values.title,
                description: values.description || undefined,
                targetValue: values.targetValue,
                unit: values.unit || undefined,
            }

            await updateKeyResult(okrId, keyResult.id, updateData)
            setMessage('Key Result actualizado exitosamente')
            setMessageType('success')
            setSubmitting(false)
            onSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al actualizar el Key Result')
            setMessageType('danger')
            setSubmitting(false)
        }
    }

    return (
        <div className={className}>
            {message && (
                <Alert showIcon className="mb-4" type={messageType}>
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
                                label="Título *"
                                invalid={errors.title && touched.title}
                                errorMessage={errors.title}
                                className="mb-4"
                            >
                                <Field
                                    type="text"
                                    autoComplete="off"
                                    name="title"
                                    placeholder="Ej: Cerrar 10 nuevos clientes"
                                    component={Input}
                                />
                            </FormItem>

                            <FormItem
                                label="Descripción"
                                invalid={
                                    errors.description && touched.description
                                }
                                errorMessage={errors.description}
                                className="mb-4"
                            >
                                <Field
                                    type="text"
                                    autoComplete="off"
                                    name="description"
                                    placeholder="Descripción del Key Result"
                                    component={Input}
                                />
                            </FormItem>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <FormItem
                                    label="Valor objetivo *"
                                    invalid={
                                        errors.targetValue &&
                                        touched.targetValue
                                    }
                                    errorMessage={errors.targetValue}
                                >
                                    <Field
                                        type="number"
                                        name="targetValue"
                                        placeholder="0"
                                        component={Input}
                                        min={0}
                                        step="any"
                                    />
                                </FormItem>

                                <FormItem
                                    label="Unidad"
                                    invalid={errors.unit && touched.unit}
                                    errorMessage={errors.unit}
                                >
                                    <Select
                                        options={unitOptions}
                                        value={unitOptions.find(
                                            (opt) =>
                                                opt.value ===
                                                (values.unit ?? ''),
                                        )}
                                        onChange={(option) => {
                                            setFieldValue(
                                                'unit',
                                                option?.value ?? '',
                                            )
                                        }}
                                        isClearable={false}
                                        placeholder="Seleccionar unidad"
                                        menuPortalTarget={document.body}
                                        maxMenuHeight={300}
                                        menuShouldScrollIntoView={true}
                                        styles={{
                                            menuPortal: (base) => ({
                                                ...base,
                                                zIndex: 9999,
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                zIndex: 9999,
                                            }),
                                            menuList: (base) => ({
                                                ...base,
                                                maxHeight: 300,
                                                overflowY: 'auto',
                                            }),
                                        }}
                                    />
                                </FormItem>
                            </div>

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
                                    Guardar Cambios
                                </Button>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default EditKeyResultForm
