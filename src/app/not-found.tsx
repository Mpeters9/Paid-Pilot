/* eslint-disable @next/next/no-html-link-for-pages -- keep plain anchor here to avoid sporadic prerender/link crashes in /_not-found */
export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="chip">404</p>
      <h1 className="text-4xl font-extrabold text-slate-900">Page not found</h1>
      <p className="text-slate-600">The page you requested does not exist.</p>
      <a href="/" className="btn-primary px-5 py-2 text-sm">
        Back to home
      </a>
    </main>
  );
}
