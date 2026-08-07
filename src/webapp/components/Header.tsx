// oxlint-disable no-ternary
/**
 * PROTOTYPE branch: drawer nav body swapped for library icon+name variants.
 * See src/webapp/components/prototype/drawer-nav-library-tooltips/
 */
import { Link } from '@tanstack/react-router';
import { Github, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { PrototypeDrawerNav } from './prototype/drawer-nav-library-tooltips/PrototypeDrawerNav';
import TanChatAIAssistant from './example-AIAssistant.tsx';

export default function Header() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <header className="flex items-center justify-between bg-gray-800 p-4 text-white shadow-lg">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-700"
            aria-label="Open menu"
          >
            <Menu size={24} />
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
          className="rounded-lg p-2 transition-colors hover:bg-gray-700"
          aria-label="View on GitHub"
        >
          <Github size={24} />
        </a>
      </header>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-80 transform flex-col bg-gray-900 text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-visible p-4">
          <PrototypeDrawerNav onNavigate={() => setIsOpen(false)} />
        </nav>

        <div className="flex flex-col gap-2 border-t border-gray-700 bg-gray-800 p-4">
          <TanChatAIAssistant />
        </div>
      </aside>
    </>
  );
}
