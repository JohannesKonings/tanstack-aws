import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { Button } from '#apps/webapp/components/ui/button';

describe('Button', () => {
  it('renders primary neutral by default', () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain('bg-background-inverse');
    expect(html).toContain('Save');
  });

  it('renders secondary variant', () => {
    const html = renderToStaticMarkup(<Button variant="secondary">Create</Button>);
    expect(html).toContain('bg-action-secondary');
  });

  it('renders icon variant with destructive color', () => {
    const html = renderToStaticMarkup(
      <Button variant="icon" color="red" size="icon-sm" aria-label="Delete">
        ×
      </Button>,
    );
    expect(html).toContain('text-ds-terracotta-400');
    expect(html).toContain('active:scale-90');
  });
});
