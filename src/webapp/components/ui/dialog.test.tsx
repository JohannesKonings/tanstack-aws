import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '#src/webapp/components/ui/dialog';

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
