// Sanctum LST tools - exports all Sanctum-related tools

export { sanctumQuoteSwapTool, sanctumQuoteSwapSchema, sanctumQuoteSwapMetadata } from './quoteSwap';
export { sanctumExecuteSwapTool, sanctumExecuteSwapSchema, sanctumExecuteSwapMetadata } from './executeSwap';
export { sanctumGetLSTInfoTool, sanctumGetLSTInfoSchema, sanctumGetLSTInfoMetadata } from './getLSTInfo';
export { sanctumGetOwnedLSTsTool, sanctumGetOwnedLSTsSchema, sanctumGetOwnedLSTsMetadata } from './getOwnedLSTs';

// All Sanctum tools
export const SANCTUM_TOOLS = [
  require('./quoteSwap').sanctumQuoteSwapTool,
  require('./executeSwap').sanctumExecuteSwapTool,
  require('./getLSTInfo').sanctumGetLSTInfoTool,
  require('./getOwnedLSTs').sanctumGetOwnedLSTsTool,
];
