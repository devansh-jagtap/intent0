import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeCopy } from "@/components/code-copy";
import { allDocs, renderDoc } from "@/lib/docs";

export function generateStaticParams() {
  return allDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: allDocs().find((d) => d.slug === slug)?.title ?? "Docs" };
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const docs = allDocs();
  const i = docs.findIndex((d) => d.slug === slug);
  const doc = docs[i];
  if (!doc) notFound();
  const prev = docs[i - 1];
  const next = docs[i + 1];

  return (
    <main className="wrap docs">
      <nav className="docs-nav" aria-label="Docs">
        <ol>
          {docs.map((d) => (
            <li key={d.slug}>
              <Link href={`/docs/${d.slug}`} aria-current={d.slug === slug ? "page" : undefined}>
                {d.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <article>
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderDoc(doc) }} />
        <CodeCopy slug={slug} />
        <div className="docs-next prose">
          {prev ? <Link href={`/docs/${prev.slug}`}>Previous: {prev.title}</Link> : <span />}
          {next ? <Link href={`/docs/${next.slug}`}>Next: {next.title}</Link> : <span />}
        </div>
      </article>
    </main>
  );
}
