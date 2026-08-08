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
import type { DrawerLibraryId } from '#src/webapp/lib/drawer-library-marks';
import TanChatAIAssistant from './example-AIAssistant.tsx';

const navLinkClass =
  'flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2';
const navLinkActiveClass =
  'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2';

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
        <span className="font-medium">{label}</span>
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
      <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <ListIcon size={24} />
          </button>
          <h1 className="ml-4 text-xl font-semibold">
            <Link to="/">
              <img
                src="/images/tanstack-word-logo-white.svg"
                alt="TanStack Logo"
                className="h-10"
              />
            </Link>
          </h1>
        </div>
        <a
          href="https://github.com/JohannesKonings/tanstack-aws"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="View on GitHub"
        >
          <GithubLogoIcon size={24} />
        </a>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={close}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <XIcon size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <DrawerNavLink to="/" onNavigate={close} icon={<HouseIcon size={20} />} label="Home" />

          {/* Demo Links Start */}

          <DrawerNavLink
            to="/demo/start/server-funcs"
            onNavigate={close}
            icon={<FunctionIcon size={20} />}
            label="Start - Server Functions"
            libraryId="start"
          />

          <DrawerNavLink
            to="/demo/start/api-request"
            onNavigate={close}
            icon={<NetworkIcon size={20} />}
            label="Start - API Request"
            libraryId="start"
          />

          <div className="flex flex-row justify-between">
            <DrawerNavLink
              to="/demo/start/ssr"
              onNavigate={close}
              icon={<NoteIcon size={20} />}
              label="Start - SSR Demos"
              libraryId="start"
              className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeClassName="flex-1 flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
            />
            <button
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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
            </button>
          </div>
          {groupedExpanded.StartSSRDemo ? (
            <div className="flex flex-col ml-4">
              <DrawerNavLink
                to="/demo/start/ssr/spa-mode"
                onNavigate={close}
                icon={<NoteIcon size={20} />}
                label="SPA Mode"
                libraryId="start"
              />
              <DrawerNavLink
                to="/demo/start/ssr/full-ssr"
                onNavigate={close}
                icon={<NoteIcon size={20} />}
                label="Full SSR"
                libraryId="start"
              />
              <DrawerNavLink
                to="/demo/start/ssr/data-only"
                onNavigate={close}
                icon={<NoteIcon size={20} />}
                label="Data Only"
                libraryId="start"
              />
            </div>
          ) : null}

          <DrawerNavLink
            to="/demo/trpc-todo"
            onNavigate={close}
            icon={<NetworkIcon size={20} />}
            label="tRPC Todo"
          />

          <DrawerNavLink
            to="/demo/tanstack-query"
            onNavigate={close}
            icon={<NetworkIcon size={20} />}
            label="TanStack Query"
            libraryId="query"
          />

          <DrawerNavLink
            to="/demo/tanchat"
            onNavigate={close}
            icon={<ChatCircleIcon size={20} />}
            label="Chat (TanStack AI with Amazon Bedrock)"
            libraryId="ai"
          />

          <DrawerNavLink
            to="/example/guitars"
            onNavigate={close}
            icon={<GuitarIcon size={20} />}
            label="Guitar Demo"
            libraryId="ai"
          />

          <DrawerNavLink
            to="/demo/store"
            onNavigate={close}
            icon={<StorefrontIcon size={20} />}
            label="Store"
            libraryId="store"
          />

          <DrawerNavLink
            to="/demo/db-todo"
            onNavigate={close}
            icon={<DatabaseIcon size={20} />}
            label="DB Todo"
            libraryId="db"
          />

          <DrawerNavLink
            to="/demo/db-person"
            onNavigate={close}
            icon={<UsersIcon size={20} />}
            label="DB Persons"
            libraryId="db"
          />

          {/* Demo Links End */}
        </nav>

        <div className="p-4 border-t border-gray-700 bg-gray-800 flex flex-col gap-2">
          <TanChatAIAssistant />
        </div>
      </aside>
    </>
  );
}
