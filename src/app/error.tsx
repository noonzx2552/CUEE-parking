"use client";

export default function ErrorPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 py-12">
      <div className="rounded-2xl border border-rose-200 bg-white px-6 py-4 text-sm text-rose-700 shadow-sm">
        Something went wrong while loading the page.
      </div>
    </div>
  );
}
