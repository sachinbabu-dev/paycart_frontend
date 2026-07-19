import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="stamp mb-3">§ 404</div>
      <h1 className="display text-7xl leading-none">
        We spilled it.<span className="text-ember">.</span>
      </h1>
      <p className="mt-6 text-lg text-ink-soft">
        The page you asked for isn&apos;t on the menu.
      </p>
      <Link href="/" className="btn-primary mt-8 inline-flex">
        Back to the catalog
      </Link>
    </div>
  );
}
