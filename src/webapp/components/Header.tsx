import {
  CaretDownIcon,
  CaretRightIcon,
  ChatCircleIcon,
  DatabaseIcon,
  FunctionIcon,
  GithubLogoIcon,
  GuitarIcon,
  HouseIcon,
  ListIcon,
  NetworkIcon,
  NoteIcon,
  StorefrontIcon,
  UsersIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { DrawerLibraryMark } from '#src/webapp/components/DrawerLibraryMark';
import { ThemeToggle } from '#src/webapp/components/ThemeToggle';
import { Button } from '#src/webapp/components/ui/button';
import { TanStackLandscapeLogo } from '#src/webapp/components/ui/logo';
import type { DrawerLibraryId } from '#src/webapp/lib/drawer-library-marks';
import TanChatAIAssistant from './example-AIAssistant.tsx';

const navLinkClass =
  'flex items-center gap-3 p-3 rounded-lg hover:bg-surface-state-hover transition-colors mb-2 text-text-primary';
const navLinkActiveClass =
  'flex items-center gap-3 p-3 rounded-lg bg-action-primary/10 text-text-primary border border-border-focus/30 transition-colors mb-2';

function DrawerNavLink({
  to,
  onNavigate,
  icon,
  label,
  libraryId,
  className = navLinkClass,
  activeClassName = navLinkActiveClass,
}: {
  to: LinkProps['to'];
  onNavigate: () => void;
  icon: ReactNode;
  label: string;
  libraryId?: DrawerLibraryId;
  className?: string;
  activeClassName?: string;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={className}
      activeProps={{ className: activeClassName }}
    >
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="font-medium text-ds-label-md">{label}</span>
        {libraryId ? <DrawerLibraryMark libraryId={libraryId} /> : null}
      </span>
    </Link>
  );
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupedExpanded, setGroupedExpanded] = useState<Record<string, boolean>>({});
  const close = () => {
    setIsOpen(false);
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background-surface p-4 text-text-primary shadow-sm">
        <div className="flex items-center">
          <Button
            type="button"
            variant="icon"
            color="gray"
            size="icon-md"
            aria-label="Open menu"
            onClick={() => setIsOpen(true)}
          >
            <ListIcon size={24} />
          </Button>
          <h1 className="ml-4 text-ds-heading-5 font-display">
            <Link to="/">
              <TanStackLandscapeLogo className="h-8" />
            </Link>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            as="a"
            href="https://github.com/JohannesKonings/tanstack-aws"
            target="_blank"
            rel="noopener noreferrer"
            variant="icon"
            color="gray"
            size="icon-md"
            aria-label="View on GitHub"
          >
            <GithubLogoIcon size={24} />
          </Button>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-80 transform flex-col border-r border-border bg-background-elevated text-text-primary shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-ds-heading-4">Navigation</h2>
          <Button
            type="button"
            variant="icon"
            color="gray"
            size="icon-md"
            aria-label="Close menu"
            onClick={close}
          >
            <XIcon size={24} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <DrawerNavLink
            to="/"
            onNavigate={close}
            icon={<HouseIcon size={20} className="shrink-0 text-icon-default" />}
            label="Home"
          />

          {/* Demo Links Start */}

          <DrawerNavLink
            to="/demo/start/server-funcs"
            onNavigate={close}
            icon={<FunctionIcon size={20} className="shrink-0 text-icon-default" />}
            label="Start - Server Functions"
            libraryId="start"
          />

          <DrawerNavLink
            to="/demo/start/api-request"
            onNavigate={close}
            icon={<NetworkIcon size={20} className="shrink-0 text-icon-default" />}
            label="Start - API Request"
            libraryId="start"
          />

          <div className="flex flex-row justify-between">
            <DrawerNavLink
              to="/demo/start/ssr"
              onNavigate={close}
              icon={<NoteIcon size={20} className="shrink-0 text-icon-default" />}
              label="Start - SSR Demos"
              libraryId="start"
              className="mb-2 flex flex-1 items-center gap-3 rounded-lg p-3 text-text-primary transition-colors hover:bg-surface-state-hover"
              activeClassName="mb-2 flex flex-1 items-center gap-3 rounded-lg border border-border-focus/30 bg-action-primary/10 p-3 text-text-primary transition-colors"
            />
            <Button
              type="button"
              variant="icon"
              color="gray"
              size="icon-md"
              aria-label="Toggle SSR demos"
              onClick={() =>
                setGroupedExpanded((prev) => ({
                  ...prev,
                  StartSSRDemo: !prev.StartSSRDemo,
                }))
              }
            >
              {groupedExpanded.StartSSRDemo ? (
                <CaretDownIcon size={20} />
              ) : (
                <CaretRightIcon size={20} />
              )}
            </Button>
          </div>
          {groupedExpanded.StartSSRDemo ? (
            <div className="ml-4 flex flex-col">
              <DrawerNavLink
                to="/demo/start/ssr/spa-mode"
                onNavigate={close}
                icon={<NoteIcon size={20} className="shrink-0 text-icon-default" />}
                label="SPA Mode"
                libraryId="start"
              />

              <DrawerNavLink
                to="/demo/start/ssr/full-ssr"
                onNavigate={close}
                icon={<NoteIcon size={20} className="shrink-0 text-icon-default" />}
                label="Full SSR"
                libraryId="start"
              />

              <DrawerNavLink
                to="/demo/start/ssr/data-only"
                onNavigate={close}
                icon={<NoteIcon size={20} className="shrink-0 text-icon-default" />}
                label="Data Only"
                libraryId="start"
              />
            </div>
          ) : null}

          <DrawerNavLink
            to="/demo/trpc-todo"
            onNavigate={close}
            icon={<NetworkIcon size={20} className="shrink-0 text-icon-default" />}
            label="tRPC Todo"
          />

          <DrawerNavLink
            to="/demo/tanstack-query"
            onNavigate={close}
            icon={<NetworkIcon size={20} className="shrink-0 text-icon-default" />}
            label="TanStack Query"
            libraryId="query"
          />

          <DrawerNavLink
            to="/demo/tanchat"
            onNavigate={close}
            icon={<ChatCircleIcon size={20} className="shrink-0 text-icon-default" />}
            label="Chat (TanStack AI with Amazon Bedrock)"
            libraryId="ai"
          />

          <DrawerNavLink
            to="/example/guitars"
            onNavigate={close}
            icon={<GuitarIcon size={20} className="shrink-0 text-icon-default" />}
            label="Guitar Demo"
          />

          <DrawerNavLink
            to="/demo/store"
            onNavigate={close}
            icon={<StorefrontIcon size={20} className="shrink-0 text-icon-default" />}
            label="Store"
            libraryId="store"
          />

          <DrawerNavLink
            to="/demo/db-todo"
            onNavigate={close}
            icon={<DatabaseIcon size={20} className="shrink-0 text-icon-default" />}
            label="DB Todo"
            libraryId="db"
          />

          <DrawerNavLink
            to="/demo/db-person"
            onNavigate={close}
            icon={<UsersIcon size={20} className="shrink-0 text-icon-default" />}
            label="DB Persons"
            libraryId="db"
          />

          {/* Demo Links End */}
        </nav>

        <div className="flex flex-col gap-2 border-t border-border bg-background-surface p-4">
          <TanChatAIAssistant />
        </div>
      </aside>
    </>
  );
}
