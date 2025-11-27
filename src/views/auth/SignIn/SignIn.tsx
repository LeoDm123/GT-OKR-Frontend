import SignInForm from './SignInForm'

const SignIn = () => {
    return (
        <>
            <div className="mb-8">
                <h3 className="mb-1 text-center" style={{ color: '#241a43' }}>
                    ¡Bienvenido de vuelta!
                </h3>
                <p className="text-center">
                    ¡Por favor, ingresa tus datos para ingresar!
                </p>
            </div>
            <SignInForm disableSubmit={false} />
        </>
    )
}

export default SignIn
