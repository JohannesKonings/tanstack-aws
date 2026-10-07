import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';

vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-dialog')>();
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('Dialog', () => {
  it('renders Radix-backed dialog shell with DS panel attributes', () => {
    const html = renderToStaticMarkup(
      <Dialog open>
        <DialogContent size="sm">
          <DialogHeader title="Create Person" />
          <DialogBody>
            <p>Form content</p>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(html).toContain('data-ds-dialog-scrim');
    expect(html).toContain('data-ds-dialog-panel');
    expect(html).toContain('Create Person');
  });
});
