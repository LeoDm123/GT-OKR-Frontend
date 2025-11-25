import { useState } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import PasswordInput from '@/components/shared/PasswordInput'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import useAuth from '@/utils/hooks/useAuth'
import type { CommonProps } from '@/@types/common'

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    signInUrl?: string
}

type SignUpFormSchema = {
    firstName: string
    lastName: string
    email: string
    password: string
    confirmPassword: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validationSchema = Yup.object().shape({
    firstName: Yup.string()
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .required('El nombre es requerido'),
    lastName: Yup.string()
        .trim()
        .min(2, 'El apellido debe tener al menos 2 caracteres')
        .required('El apellido es requerido'),
    email: Yup.string()
        .email('Email inválido')
        .matches(emailRegex, 'Email inválido')
        .required('El email es requerido'),
    password: Yup.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .required('La contraseña es requerida'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
        .required('La confirmación de contraseña es requerida'),
})

const SignUpForm = (props: SignUpFormProps) => {
    const { disableSubmit = false, className, signInUrl = '/sign-in' } = props

    const { signUp } = useAuth()

    const [message, setMessage] = useTimeOutMessage()
    const [messageType, setMessageType] = useState<'success' | 'danger'>(
        'danger',
    )

    const onSignUp = async (
        values: SignUpFormSchema,
        setSubmitting: (isSubmitting: boolean) => void,
    ) => {
        const { firstName, lastName, password, email } = values
        setSubmitting(true)
        const result = await signUp({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email,
            password,
        })

        if (result?.status === 'failed') {
            setMessageType('danger')
            setMessage(result.message)
            setSubmitting(false)
        } else if (result?.status === 'success') {
            // Mostrar mensaje de éxito y redirigir al login después de un breve delay
            setMessageType('success')
            setMessage(result.message || 'Usuario registrado exitosamente')
            setTimeout(() => {
                window.location.href = signInUrl
            }, 2000)
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
                initialValues={{
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                }}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    if (!disableSubmit) {
                        onSignUp(values, setSubmitting)
                    } else {
                        setSubmitting(false)
                    }
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <FormItem
                                label="Nombre *"
                                invalid={errors.firstName && touched.firstName}
                                errorMessage={errors.firstName}
                            >
                                <Field
                                    type="text"
                                    autoComplete="given-name"
                                    name="firstName"
                                    placeholder="Nombre"
                                    component={Input}
                                />
                            </FormItem>
                            <FormItem
                                label="Apellido *"
                                invalid={errors.lastName && touched.lastName}
                                errorMessage={errors.lastName}
                            >
                                <Field
                                    type="text"
                                    autoComplete="family-name"
                                    name="lastName"
                                    placeholder="Apellido"
                                    component={Input}
                                />
                            </FormItem>
                            <FormItem
                                label="Correo Electrónico *"
                                invalid={errors.email && touched.email}
                                errorMessage={errors.email}
                            >
                                <Field
                                    type="email"
                                    autoComplete="email"
                                    name="email"
                                    placeholder="Correo Electrónico"
                                    component={Input}
                                />
                            </FormItem>
                            <FormItem
                                label="Contraseña"
                                invalid={errors.password && touched.password}
                                errorMessage={errors.password}
                            >
                                <Field
                                    autoComplete="off"
                                    name="password"
                                    placeholder="Contraseña"
                                    component={PasswordInput}
                                />
                            </FormItem>
                            <FormItem
                                label="Confirmar contraseña"
                                invalid={
                                    errors.confirmPassword &&
                                    touched.confirmPassword
                                }
                                errorMessage={errors.confirmPassword}
                            >
                                <Field
                                    autoComplete="off"
                                    name="confirmPassword"
                                    placeholder="Confirmar contraseña"
                                    component={PasswordInput}
                                />
                            </FormItem>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                            >
                                {isSubmitting
                                    ? 'Creando cuenta...'
                                    : 'Registrarse'}
                            </Button>
                            <div className="mt-4 text-center">
                                <span>¿Ya tenés una cuenta? </span>
                                <ActionLink to={signInUrl}>
                                    Iniciar sesión
                                </ActionLink>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SignUpForm
