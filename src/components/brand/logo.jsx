// Text-based reproduction of the iziecole wordmark, used until the real SVG
// asset lands in public/brand/ (see public/brand/README.md).
function DotlessI() {
  return (
    <span className="relative inline-block">
      ı
      <span className="absolute -top-[0.5em] left-1/2 h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full bg-brand-saffron" />
    </span>
  );
}

export function Logo({ className = "" }) {
  return (
    <span
      className={`inline-flex items-baseline font-heading font-bold tracking-tight ${className}`}
    >
      <span className="text-brand-blue">
        <DotlessI />z<DotlessI />
      </span>
      <span className="text-brand-ink">ecole</span>
    </span>
  );
}
