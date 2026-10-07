// oxlint-disable no-ternary
import { ArrowsClockwiseIcon, WifiHighIcon, WifiSlashIcon } from '@phosphor-icons/react';
import { Button } from '#src/webapp/components/ui/button';
import { useSseSync } from '#src/webapp/hooks/useSseSync';
import { cn } from '#src/webapp/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface SyncStatusProps {
  /** Show detailed info including last sync time */
  showDetails?: boolean;
  /** Custom class name for container */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Format last sync time for display */
const formatLastSync = (date: Date | null): string => {
  if (!date) {
    return 'Never';
  }
  return date.toLocaleTimeString();
};

// =============================================================================
// Components
// =============================================================================

/**
 * SyncStatus - Displays real-time sync connection status
 *
 * Shows connection state with visual indicator, optional last sync time,
 * and reconnect button when disconnected.
 */
export const SyncStatus = ({
  showDetails = true,
  className = '',
}: SyncStatusProps): React.ReactElement => {
  const { isConnected, lastSyncTime, reconnect } = useSseSync();

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border-default bg-background-subtle px-3 py-2 text-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <WifiHighIcon className="size-4 text-status-success" aria-hidden="true" />
            <span className="font-medium text-text-success">Connected</span>
          </>
        ) : (
          <>
            <WifiSlashIcon className="size-4 text-status-error" aria-hidden="true" />
            <span className="font-medium text-text-error">Disconnected</span>
          </>
        )}
      </div>

      {showDetails && lastSyncTime && (
        <span className="text-text-muted">Last sync: {formatLastSync(lastSyncTime)}</span>
      )}

      {!isConnected && (
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={reconnect}
          className="ml-1"
          aria-label="Reconnect to sync"
        >
          <ArrowsClockwiseIcon className="size-3" aria-hidden="true" />
          Reconnect
        </Button>
      )}
    </div>
  );
};

/**
 * Compact sync status indicator - just shows the icon with tooltip
 */
export const SyncStatusIndicator = ({
  className = '',
}: {
  className?: string;
}): React.ReactElement => {
  const { isConnected, reconnect } = useSseSync();

  const handleClick = (): void => {
    if (!isConnected) {
      reconnect();
    }
  };

  return (
    <Button
      type="button"
      variant="icon"
      color={isConnected ? 'green' : 'red'}
      size="icon-sm"
      onClick={handleClick}
      className={className}
      title={isConnected ? 'Sync connected' : 'Sync disconnected - click to reconnect'}
      aria-label={isConnected ? 'Sync connected' : 'Sync disconnected - click to reconnect'}
    >
      {isConnected ? (
        <WifiHighIcon className="size-4" aria-hidden="true" />
      ) : (
        <WifiSlashIcon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
};
