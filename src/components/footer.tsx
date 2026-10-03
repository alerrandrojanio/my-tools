export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-[clamp(16px,4vw,32px)] py-7">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} My Tools
        </p>
        <p className="text-sm text-muted">
          Most tools run entirely in your browser.
        </p>
      </div>
    </footer>
  );
}
