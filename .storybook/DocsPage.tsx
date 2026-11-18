// Plantilla de documentación de cada componente (HU-UI-01 §6, 00-REGLAS-COMUNES-FRONT §9).
import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
  useOf,
} from '@storybook/addon-docs/blocks';
import { correctionIssueUrl, designVersionLabel, type DesignParameters } from './design';

/** Enlace de la story abierta en el Storybook (la documentación vive en un iframe del mismo sitio). */
const currentStoryUrl = (): string | undefined => {
  try {
    return window.parent.location.href;
  } catch {
    return undefined;
  }
};

const List = ({ heading, items }: { heading: string; items?: readonly string[] }) =>
  items && items.length > 0 ? (
    <>
      <h3>{heading}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  ) : null;

export function DocsPage() {
  const resolved = useOf('meta');
  // Una página de documentación siempre está atada a un archivo de stories (su `meta`).
  if (resolved.type !== 'meta') return null;
  const { preparedMeta } = resolved;
  const design = preparedMeta.parameters.design as DesignParameters | undefined;
  return (
    <>
      <Title />
      <Subtitle />
      {design && (
        <p>
          <strong>{designVersionLabel(design)}</strong> · ficha <code>{design.ficha}</code> ·{' '}
          <a
            href={correctionIssueUrl({ title: preparedMeta.title, storyUrl: currentStoryUrl() })}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reportar corrección
          </a>
        </p>
      )}
      <Description />
      <List heading="Cuándo usarlo" items={design?.whenToUse} />
      <List heading="Cuándo no usarlo" items={design?.whenNotToUse} />
      <List heading="Se usa en" items={design?.usedIn} />
      <Primary />
      <Controls />
      <Stories />
    </>
  );
}
