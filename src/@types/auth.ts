export type SignInCredential = {
    email: string
    password: string
}

export type SignInResponse = {
    token: string
    user: {
        userName: string
        authority: string[]
        avatar: string
        email: string
    }
}

export type SignUpResponse = SignInResponse

export type SignUpCredential = {
    email: string
    password: string
    firstName: string
    lastName: string
    userName?: string // Opcional por si se quiere mantener compatibilidad
}

export type ForgotPassword = {
    email: string
}

export type ResetPassword = {
    password: string
}
