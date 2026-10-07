import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { Input } from '#src/webapp/components/ui/input';

describe('Input', () => {
  it('renders with DS border and neutral focus treatment', () => {
    const html = renderToStaticMarkup(<Input placeholder="Name" />);
    expect(html).toContain('border-border-default');
    expect(html).toContain('focus:border-border-strong');
    expect(html).not.toContain('focus:ring-2');
  });
});
