import { cloneElement } from 'react'
import Avatar from '@/components/ui/Avatar'
import Logo from '@/components/template/Logo'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div className="grid lg:grid-cols-3 h-full">
            <div
                className="bg-no-repeat bg-cover py-6 px-16 flex-col justify-between hidden lg:flex"
                style={{
                    backgroundColor: '#9276b4',
                }}
            >
                <Logo mode="dark" background="dark" />
                <div>
                    <div className="mb-6 flex items-center gap-4">
                        <Avatar
                            className="border-2 border-white"
                            shape="circle"
                            src="/img/avatars/ceo-1.jpg"
                        />
                        <div className="text-dark">
                            <div className="font-semibold text-base text-white">
                                Ariel Saban
                            </div>
                            <span className="opacity-100 text-white">
                                Co-Founder & CEO
                            </span>
                        </div>
                    </div>
                    <p
                        className="text-lg text-dark opacity-100 text-white"
                        style={{ marginBottom: '80px' }}
                    >
                        Since 2015 we help banks, fintechs and insurance
                        companies to transform their processes with artificial
                        intelligence, data and cloud.
                    </p>
                </div>
                <span className="text-dark text-white">
                    Copyright &copy; {`${new Date().getFullYear()}`}{' '}
                    <span className="font-semibold">{`${APP_NAME}`}</span>{' '}
                </span>
            </div>
            <div className="col-span-2 flex flex-col justify-center items-center bg-white dark:bg-gray-800">
                <div className="xl:min-w-[450px] px-8">
                    <div className="mb-8">{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Side
