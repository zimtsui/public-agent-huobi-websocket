import { DerivativeRawTradesData, DerivativeRawOrderbookData, Trade, Orderbook } from './interfaces';
declare function formatDerivativeRawTradesData(raw: DerivativeRawTradesData): Trade[];
declare function formatDerivativeRawOrderbookData(raw: DerivativeRawOrderbookData): Orderbook;
export { formatDerivativeRawOrderbookData, formatDerivativeRawTradesData, };
