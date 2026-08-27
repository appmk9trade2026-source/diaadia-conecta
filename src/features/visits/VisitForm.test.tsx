import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VisitForm } from './VisitForm';

describe('VisitForm', () => {
  it('renders the operational fields and required evidence guidance', () => {
    const html = renderToStaticMarkup(
      <VisitForm actionError={null} actionState="idle" busy={false} onSubmit={vi.fn().mockResolvedValue(false)} />,
    );

    expect(html).toContain('Nome do estabelecimento');
    expect(html).toContain('Resultado da visita');
    expect(html).toContain('Adicionar foto');
    expect(html).toContain('A localização será capturada');
    expect(html).toContain('Registrar visita');
  });

  it('blocks a duplicate submit while the visit is being sent', () => {
    const html = renderToStaticMarkup(
      <VisitForm actionError={null} actionState="submitting" busy onSubmit={vi.fn().mockResolvedValue(false)} />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Registrando visita...');
  });
});
