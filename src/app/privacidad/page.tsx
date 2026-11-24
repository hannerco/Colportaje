import type { Metadata } from 'next';
import Link from 'next/link';
import { copy } from '@/copy/es';
import { ROUTES } from '@/features/shell';
import styles from './page.module.css';

export const metadata: Metadata = { title: `${copy.privacy.title} · ${copy.app.name}` };

/** Política de privacidad: pública (está fuera de `(app)`, no pide sesión). Google exige esta dirección para publicar. */
export default function PrivacyPage() {
  const { privacy } = copy;
  return (
    <main className={styles.page}>
      <article className={styles.column}>
        <h1 className={styles.title}>{privacy.title}</h1>
        <p className={styles.meta}>{privacy.updated}</p>
        <p className={styles.text}>{privacy.intro}</p>
        {privacy.sections.map((section) => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.heading}>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className={styles.text}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <Link href={ROUTES.signIn} className={styles.back}>
          {privacy.back}
        </Link>
      </article>
    </main>
  );
}
