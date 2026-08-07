import {ReactNode} from 'react'
import AuthForms from "@/components/AuthForms";
import {isAuthenticated} from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const AuthLayout = async ({ children}: {children: ReactNode}) => {
    const isUserAuthicated = await isAuthenticated();
    if (isUserAuthicated) redirect("/")
    return <div className="auth-layout">{children}</div>;
};
export default AuthLayout;