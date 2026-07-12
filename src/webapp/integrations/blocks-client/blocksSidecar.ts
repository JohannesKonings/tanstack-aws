export const BLOCKS_SIDECAR_PORT = 3001;

export const BLOCKS_SIDECAR_RPC_PATH = '/aws-blocks/api';

export const BLOCKS_SIDECAR_URL = `http://localhost:${BLOCKS_SIDECAR_PORT}${BLOCKS_SIDECAR_RPC_PATH}`;

export const BLOCKS_SIDECAR_ENV = 'BLOCKS_SIDECAR_URL';

export const readBlocksSidecarUrl = (): string | undefined => process.env[BLOCKS_SIDECAR_ENV];
