export default function VolunteersLayout({ children }: LayoutProps<"/volunteers">) {
    return <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">{children}</main>;
}
