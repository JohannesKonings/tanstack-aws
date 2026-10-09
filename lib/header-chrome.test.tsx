import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { DrawerLibraryMark } from '#apps/webapp/components/DrawerLibraryMark';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    activeProps: _activeProps,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    activeProps?: { className?: string };
    to: string;
    onClick?: () => void;
  }) => (
    <a href={props.to} className={className} onClick={props.onClick}>
      {children}
    </a>
  ),
}));

vi.mock('#apps/webapp/components/example-AIAssistant.tsx', () => ({
  default: () => <div data-testid="ai-assistant" />,
}));

import Header from '#apps/webapp/components/Header';

describe('DrawerLibraryMark', () => {
  it('renders inline icon and short library name with category color', () => {
    const html = renderToStaticMarkup(<DrawerLibraryMark libraryId="start" />);
    expect(html).toContain('Start');
    expect(html).toContain('text-category-framework');
  });

  it('renders data category color for query', () => {
    const html = renderToStaticMarkup(<DrawerLibraryMark libraryId="query" />);
    expect(html).toContain('Query');
    expect(html).toContain('text-category-data');
  });
});

describe('Header chrome', () => {
  it('uses DS semantic tokens and Button for chrome controls', () => {
    const html = renderToStaticMarkup(<Header />);
    expect(html).toContain('bg-background-surface');
    expect(html).toContain('text-text-primary');
    expect(html).toContain('border-border');
    expect(html).toContain('hover:bg-surface-state-hover');
    expect(html).toContain('Switch to light mode');
    expect(html).toContain('View on GitHub');
  });

  it('renders Variant C library marks on demo nav items but not Home or tRPC', () => {
    const html = renderToStaticMarkup(<Header />);
    expect(html).toContain('Start - Server Functions');
    expect(html).toContain('text-category-framework');
    expect(html).not.toContain('tRPC Todo</span><span class="mt-0.5');
    expect(html).not.toMatch(/Home<\/span><span class="mt-0\.5/);
  });
});
