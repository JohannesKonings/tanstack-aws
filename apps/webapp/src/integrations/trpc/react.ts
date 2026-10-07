import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { TRPCRouter } from '#apps/webapp/integrations/trpc/router';

export const { TRPCProvider, useTRPC } = createTRPCContext<TRPCRouter>();
