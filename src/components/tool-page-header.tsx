import Link from "next/link";

interface ToolPageHeaderProps {
  title: string;
  description: string;
}

export function ToolPageHeader({ title, description }: ToolPageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Link
        href="/#tools"
        className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent-soft hover:text-ink"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        All tools
      </Link>
      <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        {title}
      </h1>
      <p className="max-w-[620px] text-[clamp(16px,1.4vw,18px)] leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}
