export * from 'interfaces';

interface DerivativeRawTrade {
    amount: number;
    ts: number;
    id: bigint;
    price: number;
    direction: string;
}

type DerivativeRawTradesData = DerivativeRawTrade[];

interface DerivativeRawOrderbookData {
    bids: [number, number][],
    asks: [number, number][],
}

interface Config {
    DERIVATIVE_URL: string;
    PUBLIC_CENTER_BASE_URL: string;
}

interface DerivativeMarkets {
    [pair: string]: {
        tradesChannel: string;
        orderbookChannel: string;
    };
};

export {
    DerivativeRawOrderbookData,
    DerivativeRawTradesData,
    Config,
    DerivativeMarkets,
};