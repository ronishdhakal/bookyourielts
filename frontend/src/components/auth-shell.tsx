export function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-10 py-10 md:py-16 lg:grid-cols-[1fr_28rem] lg:gap-20">
      <div className="hidden lg:block">
        <p className="eyebrow">bookyourielts.com</p>
        <p className="font-display mt-3 max-w-md text-5xl leading-[1.05] font-extrabold">
          Your IELTS date is one conversation away.
        </p>
        <p className="text-muted mt-5 max-w-sm text-lg">
          A free account lets us link your booking requests to you, so you can come back and resend
          your WhatsApp message any time.
        </p>
      </div>
      <div>
        <h1 className="text-4xl font-extrabold">{title}</h1>
        {lede && <p className="text-muted mt-3 mb-8 text-lg">{lede}</p>}
        {!lede && <div className="mb-8" />}
        {children}
      </div>
    </div>
  );
}
