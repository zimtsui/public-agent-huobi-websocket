import { RawTradesData, RawOrderbookData, Trade, Orderbook } from './interfaces';
declare function formatRawTradesData(raw: RawTradesData, isFutures?: boolean): Trade[];
declare function formatRawOrderbookData(raw: RawOrderbookData, isFutures?: boolean): Orderbook;
export { formatRawOrderbookData, formatRawTradesData, };
