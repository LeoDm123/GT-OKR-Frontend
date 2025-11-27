import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Spinner from '@/components/ui/Spinner'
import { Field, Form, Formik, FieldArray } from 'formik'
import * as Yup from 'yup'
import { useMemo, useEffect } from 'react'
import dayjs from 'dayjs'
import { createOKR } from '@/api/api'
import { HiX, HiPlus } from 'react-icons/hi'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useUsers } from '@/utils/hooks/useUsers'
import type { CommonProps } from '@/components/ui/@types/common'

interface KeyResultForm {
    title: string
    description?: string
    targetValue: number
    unit?: string
    owners?: string[] // IDs de usuarios responsables
}

interface CreateOKRFormValues {
    title: string
    description?: string
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
    year: number
    startDate: Date | null
    endDate: Date | null
    category?: string
    team?: string
    visibility: 'private' | 'public' | 'team'
    keyResults: KeyResultForm[]
}

interface CreateOKRFormProps extends CommonProps {
    owner: string
    onSuccess?: () => void
    onCancel?: () => void
}

const validationSchema = Yup.object().shape({
    title: Yup.string().required('El título es requerido'),
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
    keyResults: Yup.array().of(
        Yup.object().shape({
            title: Yup.string().required(
                'El título del Key Result es requerido',
            ),
            targetValue: Yup.number()
                .required('El valor objetivo es requerido')
                .min(0, 'El valor objetivo debe ser positivo'),
        }),
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

// Función para calcular las fechas de inicio y fin según el período
const getPeriodDates = (
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom',
    year: number,
): { startDate: Date | null; endDate: Date | null } => {
    if (period === 'custom') {
        return { startDate: null, endDate: null }
    }

    let startDate: Date
    let endDate: Date

    switch (period) {
        case 'Q1':
            startDate = dayjs(`${year}-01-01`).toDate()
            endDate = dayjs(`${year}-03-31`).toDate()
            break
        case 'Q2':
            startDate = dayjs(`${year}-04-01`).toDate()
            endDate = dayjs(`${year}-06-30`).toDate()
            break
        case 'Q3':
            startDate = dayjs(`${year}-07-01`).toDate()
            endDate = dayjs(`${year}-09-30`).toDate()
            break
        case 'Q4':
            startDate = dayjs(`${year}-10-01`).toDate()
            endDate = dayjs(`${year}-12-31`).toDate()
            break
        case 'annual':
            startDate = dayjs(`${year}-01-01`).toDate()
            endDate = dayjs(`${year}-12-31`).toDate()
            break
        default:
            return { startDate: null, endDate: null }
    }

    return { startDate, endDate }
}

const CreateOKRForm = ({
    owner,
    onSuccess,
    onCancel,
    className,
}: CreateOKRFormProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const { users, loading: usersLoading } = useUsers()
    const currentYear = new Date().getFullYear()

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

    // Calcular fechas iniciales para Q1 del año actual
    const initialDates = getPeriodDates('Q1', currentYear)

    const initialValues: CreateOKRFormValues = {
        title: '',
        description: '',
        period: 'Q1',
        year: currentYear,
        startDate: initialDates.startDate,
        endDate: initialDates.endDate,
        category: '',
        team: '',
        visibility: 'private',
        keyResults: [],
    }

    const handleSubmit = async (
        values: CreateOKRFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void },
    ) => {
        try {
            if (!values.startDate || !values.endDate) {
                setMessage('Las fechas de inicio y fin son requeridas')
                setSubmitting(false)
                return
            }

            const okrData = {
                title: values.title,
                description: values.description || undefined,
                owner,
                period: values.period,
                year: values.year,
                startDate: values.startDate,
                endDate: values.endDate,
                category: values.category || undefined,
                team: values.team || undefined,
                visibility: values.visibility,
                keyResults: values.keyResults
                    .filter((kr) => kr.title && kr.targetValue > 0)
                    .map((kr) => ({
                        title: kr.title,
                        description: kr.description || undefined,
                        targetValue: kr.targetValue,
                        unit: kr.unit || undefined,
                        responsibles:
                            kr.owners && kr.owners.length > 0
                                ? kr.owners
                                : undefined,
                    })),
            }

            await createOKR(okrData)
            setMessage('')
            onSuccess?.()
        } catch (error: any) {
            setMessage(error.message || 'Error al crear el OKR')
            setSubmitting(false)
        }
    }

    return (
        <div
            className={`flex flex-col h-full overflow-hidden ${className || ''}`}
        >
            {message && (
                <Alert showIcon className="mb-4 mx-6" type="danger">
                    {message}
                </Alert>
            )}
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ touched, errors, values, isSubmitting, setFieldValue }) => {
                    // Efecto para actualizar fechas cuando cambien el período o el año
                    useEffect(() => {
                        if (
                            values.period &&
                            values.period !== 'custom' &&
                            values.year
                        ) {
                            const { startDate, endDate } = getPeriodDates(
                                values.period,
                                values.year,
                            )
                            // Solo actualizar si las fechas son diferentes para evitar loops infinitos
                            const currentStartTime = values.startDate?.getTime()
                            const currentEndTime = values.endDate?.getTime()
                            const newStartTime = startDate?.getTime()
                            const newEndTime = endDate?.getTime()

                            if (
                                currentStartTime !== newStartTime ||
                                currentEndTime !== newEndTime
                            ) {
                                setFieldValue('startDate', startDate, false)
                                setFieldValue('endDate', endDate, false)
                            }
                        }
                    }, [values.period, values.year])

                    return (
                        <Form className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 flex overflow-hidden px-6 pb-6">
                                {/* Columna izquierda: Formulario del OKR */}
                                <div className="w-1/2 pr-4 flex flex-col ">
                                    <FormContainer>
                                        <FormItem
                                            label="Título *"
                                            invalid={
                                                (errors.title &&
                                                    touched.title) as boolean
                                            }
                                            errorMessage={errors.title}
                                            className="mb-4"
                                        >
                                            <Field
                                                type="text"
                                                autoComplete="off"
                                                name="title"
                                                placeholder="Ej: Aumentar ingresos trimestrales"
                                                component={Input}
                                            <Select
                                                options={periodOptions}
                                                value={periodOptions.find(
                                                    (opt) =>
                                                        opt.value ===
                                                        values.period,
                                                )}
                                                isClearable={false}
                                                menuPortalTarget={document.body}
                                                maxMenuHeight={300}
                                                menuShouldScrollIntoView={true}
                                                styles={{
                                                    control: (provided) => ({
                                                        ...provided,
                                                        minHeight: '43.7px',
                                                        height: '43.7px',
                                                    }),
                                                    valueContainer: (
                                                        provided,
                                                    ) => ({
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
                                                onChange={(option) => {
                                                    setFieldValue(
                                                        'period',
                                                        option?.value,
                                                    )
                                                }}
                                            />
                                        </FormItem>

                                        <FormItem
                                            label="Descripción"
                                            invalid={
                                                (errors.description &&
                                                    touched.description) as boolean
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
                                                invalid={
                                                    (errors.period &&
                                                        touched.period) as boolean
                                                }
                                                errorMessage={errors.period}
                                                className="mb-4"
                                            >
                                                <Select
                                                    options={periodOptions}
                                                    value={periodOptions.find(
                                                        (opt) =>
                                                            opt.value ===
                                                            values.period,
                                                    )}
                                                    onChange={(option) => {
                                                        const newPeriod =
                                                            option?.value as CreateOKRFormValues['period']
                                                        setFieldValue(
                                                            'period',
                                                            newPeriod,
                                                        )

                                                        // Si el período no es "custom", actualizar las fechas automáticamente
                                                        if (
                                                            newPeriod &&
                                                            newPeriod !==
                                                                'custom'
                                                        ) {
                                                            const {
                                                                startDate,
                                                                endDate,
                                                            } = getPeriodDates(
                                                                newPeriod,
                                                                values.year,
                                                            )
                                                            setFieldValue(
                                                                'startDate',
                                                                startDate,
                                                            )
                                                            setFieldValue(
                                                                'endDate',
                                                                endDate,
                                                            )
                                                        }
                                                    }}
                                                    isClearable={false}
                                                    menuPortalTarget={
                                                        document.body
                                                    }
                                                    maxMenuHeight={300}
                                                    menuShouldScrollIntoView={
                                                        true
                                                    }
                                                    styles={{
                                                        control: (
                                                            provided,
                                                        ) => ({
                                                            ...provided,
                                                            minHeight: '43.7px',
                                                            height: '43.7px',
                                                        }),
                                                        valueContainer: (
                                                            provided,
                                                        ) => ({
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

                                            <FormItem
                                                label="Año *"
                                                invalid={
                                                    (errors.year &&
                                                        touched.year) as boolean
                                                }
                                                errorMessage={errors.year}
                                                className="mb-4"
                                            >
                                                <Input
                                                    type="number"
                                                    name="year"
                                                    placeholder="2024"
                                                    value={values.year}
                                                    min={2020}
                                                    max={2100}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>,
                                                    ) => {
                                                        const newYear =
                                                            parseInt(
                                                                e.target.value,
                                                            ) || values.year
                                                        setFieldValue(
                                                            'year',
                                                            newYear,
                                                        )

                                                        // Si el período no es "custom", actualizar las fechas automáticamente
                                                        if (
                                                            values.period &&
                                                            values.period !==
                                                                'custom'
                                                        ) {
                                                            const {
                                                                startDate,
                                                                endDate,
                                                            } = getPeriodDates(
                                                                values.period,
                                                                newYear,
                                                            )
                                                            setFieldValue(
                                                                'startDate',
                                                                startDate,
                                                            )
                                                            setFieldValue(
                                                                'endDate',
                                                                endDate,
                                                            )
                                                        }
                                                    }}
                                                />
                                            </FormItem>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormItem
                                                label="Fecha de inicio *"
                                                invalid={
                                                    (errors.startDate &&
                                                        touched.startDate) as boolean
                                                }
                                                errorMessage={errors.startDate}
                                                className="mb-4"
                                            >
                                                <DatePicker
                                                    inputtable
                                                    placeholder="Seleccionar fecha"
                                                    value={values.startDate}
                                                    onChange={(date) => {
                                                        setFieldValue(
                                                            'startDate',
                                                            date,
                                                        )
                                                    }}
                                                />
                                            </FormItem>
                                        <FormItem
                                            label="Fecha de fin *"
                                            invalid={
                                                (errors.endDate &&
                                                    touched.endDate) as boolean
                                            }
                                            errorMessage={errors.endDate}
                                            className="mb-4"
                                        >
                                            <DatePicker
                                                inputtable
                                                placeholder="Seleccionar fecha"
                                                value={values.endDate}
                                                minDate={
                                                    values.startDate ||
                                                    undefined
                                                }
                                                onChange={(date) => {
                                                    setFieldValue(
                                                        'endDate',
                                                        date,
                                                    )
                                                }}
                                            />
                                        </FormItem>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <FormItem
                                            label="Categoría"
                                            invalid={
                                                (errors.category &&
                                                    touched.category) as boolean
                                            }
                                            errorMessage={errors.category}
                                        >
                                            <Select
                                                options={categoryOptions}
                                                value={categoryOptions.find(
                                                    (opt) =>
                                                        opt.value ===
                                                        values.category,
                                                )}
                                                isClearable={true}
                                                placeholder="Seleccionar categoría"
                                                menuPortalTarget={document.body}
                                                maxMenuHeight={300}
                                                menuShouldScrollIntoView={true}
                                                styles={{
                                                    control: (provided) => ({
                                                        ...provided,
                                                        minHeight: '43.7px',
                                                        height: '43.7px',
                                                    }),
                                                    valueContainer: (
                                                        provided,
                                                    ) => ({
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
                                                onChange={(option) => {
                                                    setFieldValue(
                                                        'category',
                                                        option?.value || '',
                                                    )
                                                }}
                                            />
                                        </FormItem>

                                        <FormItem
                                            label="Visibilidad *"
                                            invalid={
                                                (errors.visibility &&
                                                    touched.visibility) as boolean
                                            }
                                            errorMessage={errors.visibility}
                                        >
                                            <Select
                                                options={visibilityOptions}
                                                value={visibilityOptions.find(
                                                    (opt) =>
                                                        opt.value ===
                                                        values.visibility,
                                                )}
                                                isClearable={false}
                                                menuPortalTarget={document.body}
                                                maxMenuHeight={300}
                                                menuShouldScrollIntoView={true}
                                                styles={{
                                                    control: (provided) => ({
                                                        ...provided,
                                                        minHeight: '43.7px',
                                                        height: '43.7px',
                                                    }),
                                                    valueContainer: (
                                                        provided,
                                                    ) => ({
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
                                                onChange={(option) => {
                                                    setFieldValue(
                                                        'visibility',
                                                        option?.value,
                                                    )
                                                }}
                                            />
                                        </FormItem>
                                    </div>
                                </FormContainer>
                            </div>

                                            <FormItem
                                                label="Fecha de fin *"
                                                invalid={
                                                    (errors.endDate &&
                                                        touched.endDate) as boolean
                                                }
                                                errorMessage={errors.endDate}
                                                className="mb-4"
                                            >
                                                <DatePicker
                                                    inputtable
                                                    placeholder="Seleccionar fecha"
                                                    value={values.endDate}
                                                    onChange={(date) => {
                                                        setFieldValue(
                                                            'endDate',
                                                            date,
                                                        )
                                                    }}
                                                    minDate={
                                                        values.startDate ||
                                                        undefined
                                                    }
                                                />
                                            </FormItem>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <FormItem
                                                label="Categoría"
                                                invalid={
                                                    (errors.category &&
                                                        touched.category) as boolean
                                                }
                                                errorMessage={errors.category}
                                            >
                                                <Select
                                                    options={categoryOptions}
                                                    value={categoryOptions.find(
                                                        (opt) =>
                                                            opt.value ===
                                                            values.category,
                                                    )}
                                                    onChange={(option) => {
                                                        setFieldValue(
                                                            'category',
                                                            option?.value || '',
                                                        )
                                                    }}
                                                    isClearable={true}
                                                    placeholder="Seleccionar categoría"
                                                    menuPortalTarget={
                                                        document.body
                                                    }
                                                    maxMenuHeight={300}
                                                    menuShouldScrollIntoView={
                                                        true
                                                    }
                                                    styles={{
                                                        control: (
                                                            provided,
                                                        ) => ({
                                                            ...provided,
                                                            minHeight: '43.7px',
                                                            height: '43.7px',
                                                        }),
                                                        valueContainer: (
                                                            provided,
                                                        ) => ({
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

                                            <FormItem
                                                label="Visibilidad *"
                                                invalid={
                                                    (errors.visibility &&
                                                        touched.visibility) as boolean
                                                }
                                                errorMessage={errors.visibility}
                                            >
                                                <Select
                                                    options={visibilityOptions}
                                                    value={visibilityOptions.find(
                                                        (opt) =>
                                                            opt.value ===
                                                            values.visibility,
                                                    )}
                                                    onChange={(option) => {
                                                        setFieldValue(
                                                            'visibility',
                                                            option?.value,
                                                        )
                                                    }}
                                                    isClearable={false}
                                                    menuPortalTarget={
                                                        document.body
                                                    }
                                                    maxMenuHeight={300}
                                                    menuShouldScrollIntoView={
                                                        true
                                                    }
                                                    styles={{
                                                        control: (
                                                            provided,
                                                        ) => ({
                                                            ...provided,
                                                            minHeight: '43.7px',
                                                            height: '43.7px',
                                                        }),
                                                        valueContainer: (
                                                            provided,
                                                        ) => ({
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
                                    </FormContainer>
                                </div>

                                {/* Divider vertical */}
                                <div className="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>

                                {/* Columna derecha: Key Results */}
                                <div className="w-1/2 pl-4 flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Key Results
                                        </h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-2">
                                        <FieldArray name="keyResults">
                                            {({ push, remove }) => (
                                                <div className="space-y-4 pb-4">
                                                    {values.keyResults.map(
                                                        (kr, index) => (
                                                            <div
                                                                key={index}
                                                                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                                                            >
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h5 className="font-medium text-sm">
                                                                        Key
                                                                        Result{' '}
                                                                        {index +
                                                                            1}
                                                                    </h5>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="plain"
                                                                        icon={
                                                                            <HiX />
                                                                        }
                                                                        onClick={() =>
                                                                            remove(
                                                                                index,
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <FormItem
                                                                        label="Título *"
                                                                        invalid={
                                                                            (errors.keyResults &&
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.title &&
                                                                                touched.keyResults &&
                                                                                touched
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    touched
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.title) as boolean
                                                                        }
                                                                        errorMessage={
                                                                            (errors.keyResults &&
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.title) as string
                                                                        }
                                                                    >
                                                                        <Field
                                                                            type="text"
                                                                            name={`keyResults.${index}.title`}
                                                                            placeholder="Ej: Cerrar 10 nuevos clientes"
                                                                            component={
                                                                                Input
                                                                            }
                                                                        />
                                                                    </FormItem>

                                                                    <FormItem
                                                                        label="Descripción"
                                                                        invalid={
                                                                            (errors.keyResults &&
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.description &&
                                                                                touched.keyResults &&
                                                                                touched
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    touched
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.description) as boolean
                                                                        }
                                                                        errorMessage={
                                                                            (errors.keyResults &&
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] &&
                                                                                (
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] as any
                                                                                )
                                                                                    ?.description) as string
                                                                        }
                                                                    >
                                                                        <Field
                                                                            type="text"
                                                                            name={`keyResults.${index}.description`}
                                                                            placeholder="Descripción del Key Result"
                                                                            component={
                                                                                Input
                                                                            }
                                                                        />
                                                                    </FormItem>

                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <FormItem
                                                                            label="Valor objetivo *"
                                                                            invalid={
                                                                                (errors.keyResults &&
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        errors
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.targetValue &&
                                                                                    touched.keyResults &&
                                                                                    touched
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        touched
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.targetValue) as boolean
                                                                            }
                                                                            errorMessage={
                                                                                (errors.keyResults &&
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        errors
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.targetValue) as string
                                                                            }
                                                                            className="mb-4"
                                                                        >
                                                                            <Field
                                                                                type="number"
                                                                                name={`keyResults.${index}.targetValue`}
                                                                                placeholder="0"
                                                                                component={
                                                                                    Input
                                                                                }
                                                                                min={
                                                                                    0
                                                                                }
                                                                                step="any"
                                                                            />
                                                                        </FormItem>

                                                                        <FormItem
                                                                            label="Unidad"
                                                                            invalid={
                                                                                (errors.keyResults &&
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        errors
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.unit &&
                                                                                    touched.keyResults &&
                                                                                    touched
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        touched
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.unit) as boolean
                                                                            }
                                                                            errorMessage={
                                                                                (errors.keyResults &&
                                                                                    errors
                                                                                        .keyResults[
                                                                                        index
                                                                                    ] &&
                                                                                    (
                                                                                        errors
                                                                                            .keyResults[
                                                                                            index
                                                                                        ] as any
                                                                                    )
                                                                                        ?.unit) as string
                                                                            }
                                                                            className="mb-4"
                                                                        >
                                                                            <Select
                                                                                options={
                                                                                    unitOptions
                                                                                }
                                                                                value={unitOptions.find(
                                                                                    (
                                                                                        opt,
                                                                                    ) =>
                                                                                        opt.value ===
                                                                                        (values
                                                                                            .keyResults[
                                                                                            index
                                                                                        ]
                                                                                            ?.unit ??
                                                                                            ''),
                                                                                )}
                                                                                onChange={(
                                                                                    option,
                                                                                ) => {
                                                                                    setFieldValue(
                                                                                        `keyResults.${index}.unit`,
                                                                                        option?.value ??
                                                                                            '',
                                                                                    )
                                                                                }}
                                                                                isClearable={
                                                                                    false
                                                                                }
                                                                                placeholder="Seleccionar unidad"
                                                                                menuPortalTarget={
                                                                                    document.body
                                                                                }
                                                                                maxMenuHeight={
                                                                                    300
                                                                                }
                                                                                menuShouldScrollIntoView={
                                                                                    true
                                                                                }
                                                                                styles={{
                                                                                    control:
                                                                                        (
                                                                                            provided,
                                                                                            state,
                                                                                        ) => ({
                                                                                            ...provided,
                                                                                            minHeight:
                                                                                                '43.7px', // Altura estándar para inputs
                                                                                            height: '43.7px',
                                                                                        }),
                                                                                    valueContainer:
                                                                                        (
                                                                                            provided,
                                                                                        ) => ({
                                                                                            ...provided,
                                                                                            height: '40px',
                                                                                            padding:
                                                                                                '0 8px',
                                                                                        }),
                                                                                    input: (
                                                                                        provided,
                                                                                    ) => ({
                                                                                        ...provided,
                                                                                        margin: '0px',
                                                                                    }),
                                                                                    indicatorsContainer:
                                                                                        (
                                                                                            provided,
                                                                                        ) => ({
                                                                                            ...provided,
                                                                                            height: '40px',
                                                                                        }),
                                                                                    menuPortal:
                                                                                        (
                                                                                            base,
                                                                                        ) => ({
                                                                                            ...base,
                                                                                            zIndex: 9999,
                                                                                        }),
                                                                                    menu: (
                                                                                        base,
                                                                                    ) => ({
                                                                                        ...base,
                                                                                        zIndex: 9999,
                                                                                    }),
                                                                                    menuList:
                                                                                        (
                                                                                            base,
                                                                                        ) => ({
                                                                                            ...base,
                                                                                            maxHeight: 300,
                                                                                            overflowY:
                                                                                                'auto',
                                                                                        }),
                                                                                }}
                                                                            />
                                                                        </FormItem>
                                                                    </div>
                                                                </div>

                                                                {/* Campo de Responsables */}
                                                                <FormItem
                                                                    label="Responsables"
                                                                    invalid={
                                                                        (errors.keyResults &&
                                                                            errors
                                                                                .keyResults[
                                                                                index
                                                                            ] &&
                                                                            (
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] as any
                                                                            )
                                                                                ?.owners &&
                                                                            touched.keyResults &&
                                                                            touched
                                                                                .keyResults[
                                                                                index
                                                                            ] &&
                                                                            (
                                                                                touched
                                                                                    .keyResults[
                                                                                    index
                                                                                ] as any
                                                                            )
                                                                                ?.owners) as boolean
                                                                    }
                                                                    errorMessage={
                                                                        (errors.keyResults &&
                                                                            errors
                                                                                .keyResults[
                                                                                index
                                                                            ] &&
                                                                            (
                                                                                errors
                                                                                    .keyResults[
                                                                                    index
                                                                                ] as any
                                                                            )
                                                                                ?.owners) as string
                                                                    }
                                                                >
                                                                    {usersLoading ? (
                                                                        <div className="flex items-center justify-center py-2">
                                                                            <Spinner
                                                                                size={
                                                                                    20
                                                                                }
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <Select
                                                                            isMulti
                                                                            options={
                                                                                userOptions
                                                                            }
                                                                            value={userOptions.filter(
                                                                                (
                                                                                    opt,
                                                                                ) =>
                                                                                    values.keyResults[
                                                                                        index
                                                                                    ]?.owners?.includes(
                                                                                        opt.value,
                                                                                    ),
                                                                            )}
                                                                            onChange={(
                                                                                selectedOptions,
                                                                            ) => {
                                                                                setFieldValue(
                                                                                    `keyResults.${index}.owners`,
                                                                                    selectedOptions
                                                                                        ? selectedOptions.map(
                                                                                              (
                                                                                                  opt,
                                                                                              ) =>
                                                                                                  opt.value,
                                                                                          )
                                                                                        : [],
                                                                                )
                                                                            }}
                                                                            isClearable={
                                                                                true
                                                                            }
                                                                            placeholder="Seleccionar responsables"
                                                                            menuPortalTarget={
                                                                                document.body
                                                                            }
                                                                            maxMenuHeight={
                                                                                300
                                                                            }
                                                                            menuShouldScrollIntoView={
                                                                                true
                                                                            }
                                                                            styles={{
                                                                                control:
                                                                                    (
                                                                                        provided,
                                                                                    ) => ({
                                                                                        ...provided,
                                                                                        minHeight:
                                                                                            '43.7px',
                                                                                    }),
                                                                                valueContainer:
                                                                                    (
                                                                                        provided,
                                                                                    ) => ({
                                                                                        ...provided,
                                                                                        minHeight:
                                                                                            '40px',
                                                                                        padding:
                                                                                            '0 8px',
                                                                                    }),
                                                                                input: (
                                                                                    provided,
                                                                                ) => ({
                                                                                    ...provided,
                                                                                    margin: '0px',
                                                                                }),
                                                                                indicatorsContainer:
                                                                                    (
                                                                                        provided,
                                                                                    ) => ({
                                                                                        ...provided,
                                                                                        height: '40px',
                                                                                    }),
                                                                                menuPortal:
                                                                                    (
                                                                                        base,
                                                                                    ) => ({
                                                                                        ...base,
                                                                                        zIndex: 9999,
                                                                                    }),
                                                                                menu: (
                                                                                    base,
                                                                                ) => ({
                                                                                    ...base,
                                                                                    zIndex: 9999,
                                                                                }),
                                                                                menuList:
                                                                                    (
                                                                                        base,
                                                                                    ) => ({
                                                                                        ...base,
                                                                                        maxHeight: 300,
                                                                                        overflowY:
                                                                                            'auto',
                                                                                    }),
                                                                            }}
                                                                            onChange={(
                                                                                option,
                                                                            ) => {
                                                                                setFieldValue(
                                                                                    `keyResults.${index}.unit`,
                                                                                    option?.value ??
                                                                                        '',
                                                                                )
                                                                            }}
                                                                        />
                                                                    )}
                                                                </FormItem>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </FieldArray>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <FieldArray name="keyResults">
                                            {({ push }) => (
                                                <Button
                                                    type="button"
                                                    variant="plain"
                                                    size="sm"
                                                    icon={<HiPlus />}
                                                    onClick={() =>
                                                        push({
                                                            title: '',
                                                            description: '',
                                                            targetValue: 0,
                                                            unit: '',
                                                            owners: [],
                                                        })
                                                    }
                                                >
                                                    Agregar Key Result
                                                </Button>
                                            )}
                                        </FieldArray>
                                    </div>

                                                            {/* Campo de Responsables */}
                                                            <FormItem
                                                                label="Responsables"
                                                                invalid={
                                                                    (errors.keyResults &&
                                                                        errors
                                                                            .keyResults[
                                                                            index
                                                                        ] &&
                                                                        (
                                                                            errors
                                                                                .keyResults[
                                                                                index
                                                                            ] as any
                                                                        )
                                                                            ?.owners &&
                                                                        touched.keyResults &&
                                                                        touched
                                                                            .keyResults[
                                                                            index
                                                                        ] &&
                                                                        (
                                                                            touched
                                                                                .keyResults[
                                                                                index
                                                                            ] as any
                                                                        )
                                                                            ?.owners) as boolean
                                                                }
                                                                errorMessage={
                                                                    (errors.keyResults &&
                                                                        errors
                                                                            .keyResults[
                                                                            index
                                                                        ] &&
                                                                        (
                                                                            errors
                                                                                .keyResults[
                                                                                index
                                                                            ] as any
                                                                        )
                                                                            ?.owners) as string
                                                                }
                                                            >
                                                                {usersLoading ? (
                                                                    <div className="flex items-center justify-center py-2">
                                                                        <Spinner
                                                                            size={
                                                                                20
                                                                            }
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <Select
                                                                        isMulti
                                                                        options={
                                                                            userOptions
                                                                        }
                                                                        value={userOptions.filter(
                                                                            (
                                                                                opt,
                                                                            ) =>
                                                                                values.keyResults[
                                                                                    index
                                                                                ]?.owners?.includes(
                                                                                    opt.value,
                                                                                ),
                                                                        )}
                                                                        isClearable={
                                                                            true
                                                                        }
                                                                        placeholder="Seleccionar responsables"
                                                                        menuPortalTarget={
                                                                            document.body
                                                                        }
                                                                        maxMenuHeight={
                                                                            300
                                                                        }
                                                                        menuShouldScrollIntoView={
                                                                            true
                                                                        }
                                                                        styles={{
                                                                            control:
                                                                                (
                                                                                    provided,
                                                                                ) => ({
                                                                                    ...provided,
                                                                                    minHeight:
                                                                                        '43.7px',
                                                                                }),
                                                                            valueContainer:
                                                                                (
                                                                                    provided,
                                                                                ) => ({
                                                                                    ...provided,
                                                                                    minHeight:
                                                                                        '40px',
                                                                                    padding:
                                                                                        '0 8px',
                                                                                }),
                                                                            input: (
                                                                                provided,
                                                                            ) => ({
                                                                                ...provided,
                                                                                margin: '0px',
                                                                            }),
                                                                            indicatorsContainer:
                                                                                (
                                                                                    provided,
                                                                                ) => ({
                                                                                    ...provided,
                                                                                    height: '40px',
                                                                                }),
                                                                            menuPortal:
                                                                                (
                                                                                    base,
                                                                                ) => ({
                                                                                    ...base,
                                                                                    zIndex: 9999,
                                                                                }),
                                                                            menu: (
                                                                                base,
                                                                            ) => ({
                                                                                ...base,
                                                                                zIndex: 9999,
                                                                            }),
                                                                            menuList:
                                                                                (
                                                                                    base,
                                                                                ) => ({
                                                                                    ...base,
                                                                                    maxHeight: 300,
                                                                                    overflowY:
                                                                                        'auto',
                                                                                }),
                                                                        }}
                                                                        onChange={(
                                                                            selectedOptions,
                                                                        ) => {
                                                                            setFieldValue(
                                                                                `keyResults.${index}.owners`,
                                                                                selectedOptions
                                                                                    ? selectedOptions.map(
                                                                                          (
                                                                                              opt,
                                                                                          ) =>
                                                                                              opt.value,
                                                                                      )
                                                                                    : [],
                                                                            )
                                                                        }}
                                                                    />
                                                                )}
                                                            </FormItem>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </FieldArray>
                                </div>
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <FieldArray name="keyResults">
                                        {({ push }) => (
                                            <Button
                                                type="button"
                                                variant="plain"
                                                size="sm"
                                                icon={<HiPlus />}
                                                onClick={() =>
                                                    push({
                                                        title: '',
                                                        description: '',
                                                        targetValue: 0,
                                                        unit: '',
                                                        owners: [],
                                                    })
                                                }
                                            >
                                                Agregar Key Result
                                            </Button>
                                        )}
                                    </FieldArray>
                                </div>
                            </div>

                            {/* Footer con botones */}
                            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
                                    type="button"
                                    variant="plain"
                                    disabled={isSubmitting}
                                    onClick={onCancel}
                                >
                                    Crear OKR
                                </Button>
                            </div>
                        </Form>
                    )
                }}
            </Formik>
        </div>
    )
}

export default CreateOKRForm
