import { useState } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { updateOKR } from '@/api/api'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import dayjs from 'dayjs'
import type { CommonProps } from '@/components/ui/@types/common'
import type { Objective } from '../types/okr.types'

interface KeyResultForm {
    title: string
    description?: string
    targetValue: number
    unit?: string
}

interface EditOKRFormValues {
    title: string
    description?: string
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    year: number
    startDate: Date | null
    endDate: Date | null
    category?: string
    team?: string
    visibility: 'private' | 'public' | 'team'
}

interface EditOKRFormProps extends CommonProps {
    okrId: string
    objective: Objective
    category?: string
    okrData?: any
    onSuccess?: () => void
    onCancel?: () => void
}

const validationSchema = Yup.object().shape({
    title: Yup.string()
        .required('El título es requerido')
        .min(3, 'El título debe tener al menos 3 caracteres'),
    period: Yup.string()
        .oneOf(['Q1', 'Q2', 'Q3', 'Q4', 'annual', 'custom'])
        .required('El período es requerido'),
    year: Yup.number()
        .required('El año es requerido')
        .min(2020, 'El año debe ser válido')
        .max(2100, 'El año debe ser válido'),
    startDate: Yup.date()
        .required('La fecha de inicio es requerida')
        .nullable(),
    endDate: Yup.date()
        .required('La fecha de fin es requerida')
        .nullable()
        .min(
            Yup.ref('startDate'),
            'La fecha de fin debe ser posterior a la fecha de inicio',
        ),
})

const periodOptions = [
    { value: 'Q1', label: 'Q1 (Primer trimestre)' },
    { value: 'Q2', label: 'Q2 (Segundo trimestre)' },
    { value: 'Q3', label: 'Q3 (Tercer trimestre)' },
    { value: 'Q4', label: 'Q4 (Cuarto trimestre)' },
    { value: 'annual', label: 'Anual' },
    { value: 'custom', label: 'Personalizado' },
]

const visibilityOptions = [
    { value: 'private', label: 'Privado' },
    { value: 'team', label: 'Equipo' },
    { value: 'public', label: 'Público' },
]

const categoryOptions = [
    { value: 'Operations', label: 'Operations' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Admin & Finance', label: 'Admin & Finance' },
    { value: 'People - Recruiting', label: 'People - Recruiting' },
    { value: 'People - C&E', label: 'People - C&E' },
]

const EditOKRForm = ({
    okrId,
    objective,
    category,
    okrData,
    onSuccess,
    onCancel,
    className,
}: EditOKRFormProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const [messageType, setMessageType] = useState<'success' | 'danger' | ''>(
        '',
    )

    // Determinar el período basado en las fechas
    const getPeriod = (
        startDate?: string | Date,
        endDate?: string | Date,
    ): 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom' => {
        if (!startDate || !endDate) return 'custom'

        const start = dayjs(startDate)
        const end = dayjs(endDate)
        const year = start.year()
        const month = start.month() + 1 // dayjs month is 0-indexed

        // Calcular duración en días
        const days = end.diff(start, 'day')

        // Si es aproximadamente un trimestre (90 días)
        if (days >= 85 && days <= 95) {
            if (month >= 1 && month <= 3) return 'Q1'
            if (month >= 4 && month <= 6) return 'Q2'
            if (month >= 7 && month <= 9) return 'Q3'
            if (month >= 10 && month <= 12) return 'Q4'
        }

        // Si es aproximadamente un año (365 días)
        if (days >= 360 && days <= 370) {
            return 'annual'
        }

        return 'custom'
    }

    const initialValues: EditOKRFormValues = {
        title: objective.title || '',
        description: objective.description || '',
        period:
            okrData?.period ||
            getPeriod(
                objective.startDate,
                objective.endDate || objective.dueDate,
            ),
        year:
            okrData?.year ||
            (objective.startDate
                ? dayjs(objective.startDate).year()
                : new Date().getFullYear()),
        startDate: objective.startDate ? new Date(objective.startDate) : null,
        endDate:
            objective.endDate || objective.dueDate
                ? new Date(objective.endDate || objective.dueDate || '')
                : null,
        category: category || okrData?.category || '',
        team: okrData?.team || '',
        visibility: okrData?.visibility || 'private',
    }

    const handleSubmit = async (
        values: EditOKRFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void },
    ) => {
        try {
            if (!values.startDate || !values.endDate) {
                setMessage('Las fechas de inicio y fin son requeridas')
                setMessageType('danger')
                setSubmitting(false)
                return
            }

            const updateData = {
                title: values.title,
                description: values.description || undefined,
                period: values.period,
                year: values.year,
                startDate: values.startDate,
                endDate: values.endDate,
                category: values.category || undefined,
                team: values.team || undefined,
                visibility: values.visibility,
            }

            await updateOKR(okrId, updateData)
            setMessage('OKR actualizado exitosamente')
            setMessageType('success')
            onSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al actualizar el OKR')
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
                                    placeholder="Ej: Aumentar ingresos trimestrales"
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
                                    placeholder="Descripción del OKR"
                                    component={Input}
                                />
                            </FormItem>

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem
                                    label="Período *"
                                    invalid={errors.period && touched.period}
                                    errorMessage={errors.period}
                                    className="mb-4"
                                >
                                    <Select
                                        options={periodOptions}
                                        value={periodOptions.find(
                                            (opt) =>
                                                opt.value === values.period,
                                        )}
                                        onChange={(option) => {
                                            setFieldValue(
                                                'period',
                                                option?.value,
                                            )
                                        }}
                                        isClearable={false}
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

                                <FormItem
                                    label="Año *"
                                    invalid={errors.year && touched.year}
                                    errorMessage={errors.year}
                                    className="mb-4"
                                >
                                    <Field
                                        type="number"
                                        name="year"
                                        placeholder="2024"
                                        component={Input}
                                        min={2020}
                                        max={2100}
                                    />
                                </FormItem>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem
                                    label="Fecha de inicio *"
                                    invalid={
                                        errors.startDate && touched.startDate
                                    }
                                    errorMessage={errors.startDate}
                                    className="mb-4"
                                >
                                    <DatePicker
                                        inputtable
                                        placeholder="Seleccionar fecha"
                                        value={values.startDate}
                                        onChange={(date) => {
                                            setFieldValue('startDate', date)
                                        }}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Fecha de fin *"
                                    invalid={errors.endDate && touched.endDate}
                                    errorMessage={errors.endDate}
                                    className="mb-4"
                                >
                                    <DatePicker
                                        inputtable
                                        placeholder="Seleccionar fecha"
                                        value={values.endDate}
                                        onChange={(date) => {
                                            setFieldValue('endDate', date)
                                        }}
                                        minDate={values.startDate || undefined}
                                    />
                                </FormItem>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <FormItem
                                    label="Categoría"
                                    invalid={
                                        errors.category && touched.category
                                    }
                                    errorMessage={errors.category}
                                >
                                    <Select
                                        options={categoryOptions}
                                        value={categoryOptions.find(
                                            (opt) =>
                                                opt.value === values.category,
                                        )}
                                        onChange={(option) => {
                                            setFieldValue(
                                                'category',
                                                option?.value || '',
                                            )
                                        }}
                                        isClearable={true}
                                        placeholder="Seleccionar categoría"
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

                                <FormItem
                                    label="Visibilidad *"
                                    invalid={
                                        errors.visibility && touched.visibility
                                    }
                                    errorMessage={errors.visibility}
                                >
                                    <Select
                                        options={visibilityOptions}
                                        value={visibilityOptions.find(
                                            (opt) =>
                                                opt.value === values.visibility,
                                        )}
                                        onChange={(option) => {
                                            setFieldValue(
                                                'visibility',
                                                option?.value,
                                            )
                                        }}
                                        isClearable={false}
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
                        </FormContainer>

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
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default EditOKRForm
