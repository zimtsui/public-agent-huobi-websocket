export * from 'interfaces';
interface RawTrade {
    amount: number | string;
    ts: number;
    tradeId?: number;
    id: string | number;
    price: number | string;
    direction: string;
}
declare type RawTradesData = RawTrade[];
interface RawOrderbookData {
    bids: [number, number][];
    asks: [number, number][];
}
interface Config {
    DERIVATIVE_URL: string;
    SPOT_URL: string;
    PUBLIC_CENTER_BASE_URL: string;
    DERIVATIVE_PING_INTERVAL: number;
    SPOT_PING_INTERVAL: number;
    ORDERBOOK_DEPTH: number;
}
interface MarketsDescriptor {
    [pair: string]: {
        server: 'spot' | 'derivative';
        tradesChannel: string;
        orderbookChannel: string;
    };
}
export { RawOrderbookData, RawTradesData, Config, MarketsDescriptor, };
