import { useState, useMemo } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { updateKeyResult } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useUsers } from '@/utils/hooks/useUsers'
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
    responsibles: string[] // IDs de usuarios responsables
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
    const { users, loading: usersLoading } = useUsers()

    // Preparar opciones de usuarios para el Select
    // Mostrar TODOS los usuarios con nombre y apellido
    const userOptions = useMemo(() => {
        const options = users
            .map((user) => {
                const userId = user._id || user.id || user.email || ''

                // Construir el label: SOLO nombre y apellido
                const firstName =
                    user.firstName || user.personalData?.firstName || ''
                const lastName =
                    user.lastName || user.personalData?.lastName || ''
                const fullName = `${firstName} ${lastName}`.trim()

                // Mostrar nombre y apellido, o "Sin nombre completo" si no tiene ambos
                const label = fullName || 'Sin nombre completo'

                return {
                    value: userId,
                    label: label,
                    user: user, // Guardar el objeto completo por si acaso
                }
            })
            .filter((opt) => opt.value && opt.value !== '') // Solo filtrar usuarios sin ID válido

        return options
    }, [users])

    // Extraer IDs de responsables del keyResult
    const getOwnerIds = (): string[] => {
        // El backend usa "responsibles", mantener compatibilidad con "owners"
        const responsibles = keyResult.responsibles || keyResult.responsibles
        if (!responsibles || responsibles.length === 0) {
            return []
        }
        // Si responsibles es un array de objetos, extraer los IDs
        return responsibles
            .map((owner) => {
                if (typeof owner === 'string') {
                    return owner
                }
                return owner._id || owner.id || ''
            })
            .filter((id) => id)
    }

    const initialValues: EditKeyResultFormValues = {
        title: keyResult.description || '',
        description: '',
        targetValue: keyResult.target ?? 0,
        unit: keyResult.unit || '',
        responsibles: getOwnerIds(),
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
                responsibles:
                    values.responsibles && values.responsibles.length > 0
                        ? values.responsibles
                        : undefined,
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
            {message && messageType && (
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

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem
                                    label="Valor objetivo *"
                                    invalid={
                                        errors.targetValue &&
                                        touched.targetValue
                                    }
                                    errorMessage={errors.targetValue}
                                    className="mb-4"
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
                                    className="mb-4"
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
                                            control: (provided) => ({
                                                ...provided,
                                                minHeight: '43.7px', // Altura estándar para inputs
                                                height: '43.7px',
                                            }),
                                            valueContainer: (provided) => ({
                                                ...provided,
                                                height: '40px',
                                                padding: '0 8px',
                                            }),
                                            input: (provided) => ({
                                                ...provided,
                                                margin: '0px',
                                            }),
                                            indicatorsContainer: (
                                                provided,
                                            ) => ({
                                                ...provided,
                                                height: '40px',
                                            }),
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

                            {/* Campo de Responsables */}
                            <FormItem
                                label="Responsables"
                                invalid={
                                    errors.responsibles && touched.responsibles
                                }
                                errorMessage={errors.responsibles as string}
                                className="mb-4"
                            >
                                {usersLoading ? (
                                    <div className="flex items-center justify-center py-2">
                                        <Spinner size={20} />
                                    </div>
                                ) : (
                                    <Select
                                        isMulti
                                        options={userOptions}
                                        value={userOptions.filter((opt) =>
                                            values.responsibles?.includes(
                                                opt.value,
                                            ),
                                        )}
                                        onChange={(selectedOptions) => {
                                            setFieldValue(
                                                'responsibles',
                                                selectedOptions
                                                    ? selectedOptions.map(
                                                          (opt) => opt.value,
                                                      )
                                                    : [],
                                            )
                                        }}
                                        isClearable={true}
                                        placeholder="Seleccionar responsables"
                                        menuPortalTarget={document.body}
                                        maxMenuHeight={300}
                                        menuShouldScrollIntoView={true}
                                        styles={{
                                            control: (provided) => ({
                                                ...provided,
                                                minHeight: '43.7px',
                                            }),
                                            valueContainer: (provided) => ({
                                                ...provided,
                                                minHeight: '40px',
                                                padding: '0 8px',
                                            }),
                                            input: (provided) => ({
                                                ...provided,
                                                margin: '0px',
                                            }),
                                            indicatorsContainer: (
                                                provided,
                                            ) => ({
                                                ...provided,
                                                height: '40px',
                                            }),
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
                                )}
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
