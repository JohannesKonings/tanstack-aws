import {
  BrainIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  CrosshairIcon,
  DatabaseIcon,
  DresserIcon,
  GearSixIcon,
  GogglesIcon,
  HighlighterIcon,
  type Icon,
  MarkdownLogoIcon,
  PencilRulerIcon,
  SealQuestionIcon,
  SlidersIcon,
  SmileyMeltingIcon,
  SunHorizonIcon,
  TableIcon,
  TargetIcon,
  TerminalWindowIcon,
  TimerIcon,
  TrafficSignIcon,
} from '@phosphor-icons/react';

/**
 * Canonical per-library icon map — adapted from tanstack.com/src/libraries/icons.ts.
 * Icons match the Figma "Mega Menu" design.
 */
export const libraryIcons: Record<string, Icon> = {
  start: SunHorizonIcon,
  router: TrafficSignIcon,
  query: SealQuestionIcon,
  db: DatabaseIcon,
  store: DresserIcon,
  ai: BrainIcon,
  table: TableIcon,
  charts: ChartLineUpIcon,
  form: ClipboardTextIcon,
  hotkeys: SmileyMeltingIcon,
  markdown: MarkdownLogoIcon,
  highlight: HighlighterIcon,
  virtual: GogglesIcon,
  pacer: TimerIcon,
  devtools: PencilRulerIcon,
  config: GearSixIcon,
  cli: TerminalWindowIcon,
  intent: CrosshairIcon,
  ranger: SlidersIcon,
};

/** Fallback icon for libraries without a specific mapping. */
export const fallbackLibraryIcon: Icon = TargetIcon;
