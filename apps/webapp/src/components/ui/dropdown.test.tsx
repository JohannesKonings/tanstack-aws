import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { SelectDropdown } from '#apps/webapp/components/ui/dropdown';

describe('SelectDropdown', () => {
  it('renders a trigger styled like DS inputs', () => {
    const html = renderToStaticMarkup(
      <SelectDropdown
        value="home"
        onChange={() => {}}
        placeholder="Select address type"
        options={[{ value: 'home', label: 'Home' }]}
      />,
    );
    expect(html).toContain('border-border-default');
    expect(html).toContain('Home');
  });
});
