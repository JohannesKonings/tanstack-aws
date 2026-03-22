// oxlint-disable no-ternary
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useSseSync } from '#src/webapp/hooks/useSseSync';

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
  // const isConnected = false;
  // const lastSyncTime = null;
  // const reconnect = () => {};

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${className}`}>
      {/* Connection Status Indicator */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="size-4 text-green-500" aria-hidden="true" />
            <span className="text-green-500">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="size-4 text-red-500" aria-hidden="true" />
            <span className="text-red-500">Disconnected</span>
          </>
        )}
      </div>

      {/* Last Sync Time */}
      {showDetails && lastSyncTime && (
        <span className="text-gray-500">Last sync: {formatLastSync(lastSyncTime)}</span>
      )}

      {/* Reconnect Button (only shown when disconnected) */}
      {!isConnected && (
        <button
          type="button"
          onClick={reconnect}
          className="ml-2 flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-600"
          aria-label="Reconnect to sync"
        >
          <RefreshCw className="size-3" aria-hidden="true" />
          Reconnect
        </button>
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
    <button
      type="button"
      onClick={handleClick}
      className={`rounded p-1 transition-colors hover:bg-gray-700 ${className}`}
      title={isConnected ? 'Sync connected' : 'Sync disconnected - click to reconnect'}
      aria-label={isConnected ? 'Sync connected' : 'Sync disconnected - click to reconnect'}
    >
      {isConnected ? (
        <Wifi className="size-4 text-green-500" aria-hidden="true" />
      ) : (
        <WifiOff className="size-4 text-red-500" aria-hidden="true" />
      )}
    </button>
  );
};
