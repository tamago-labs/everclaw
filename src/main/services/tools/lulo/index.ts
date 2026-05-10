// Lulo lending tools - exports all Lulo-related tools

export { luloQuoteSupplyTool, luloQuoteSupplySchema, luloQuoteSupplyMetadata } from './supply';
export { luloExecuteSupplyTool, luloExecuteSupplySchema, luloExecuteSupplyMetadata } from './supply';
export { luloQuoteWithdrawTool, luloQuoteWithdrawSchema, luloQuoteWithdrawMetadata } from './withdraw';
export { luloExecuteWithdrawTool, luloExecuteWithdrawSchema, luloExecuteWithdrawMetadata } from './withdraw';

// All Lulo tools
export const LULO_TOOLS = [
  require('./supply').luloQuoteSupplyTool,
  require('./supply').luloExecuteSupplyTool,
  require('./withdraw').luloQuoteWithdrawTool,
  require('./withdraw').luloExecuteWithdrawTool,
];