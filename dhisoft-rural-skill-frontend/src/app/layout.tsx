import './globals.css';import AppShell from '@/components/app-shell';import PwaRegister from '@/components/pwa-register';
export const metadata={title:'DHISOFT Rural Skill and Livelihood OS',description:'From mobilisation to verified skill, safe work and measurable income outcomes.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><PwaRegister/><AppShell>{children}</AppShell></body></html>}
