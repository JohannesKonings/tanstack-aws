import type { TRPCRouter } from '@/webapp/integrations/trpc/router';
import { createTRPCContext } from '@trpc/tanstack-react-query';

export const { TRPCProvider, useTRPC } = createTRPCContext<TRPCRouter>();
