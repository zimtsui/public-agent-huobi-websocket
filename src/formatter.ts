import {
    RawTradesData,
    RawOrderbookData,
    Trade,
    Orderbook,
    Action,
} from './interfaces';

function formatRawTradesData(
    raw: RawTradesData,
    isFutures = false,
): Trade[] {
    return raw.map(rawTrade => {
        const rawAmount = typeof rawTrade.amount === 'string'
            ? Number.parseFloat(rawTrade.amount)
            : rawTrade.amount;
        const rawPrice = typeof rawTrade.price === 'string'
            ? Number.parseFloat(rawTrade.price)
            : rawTrade.price;
        return {
            id: rawTrade.tradeId ? rawTrade.tradeId : rawTrade.id.toString(),
            time: rawTrade.ts,
            amount: isFutures
                ? rawAmount * 100 / rawPrice
                : rawAmount,
            price: Math.round(rawPrice * 100),
            action: rawTrade.direction === 'buy' ? Action.BID : Action.ASK,
        };
    });
}

function formatRawOrderbookData(
    raw: RawOrderbookData,
    isFutures = false,
): Orderbook {
    // api bug during settlement
    raw.bids = raw.bids || [];
    raw.asks = raw.asks || [];

    return {
        bids: raw.bids.map(([price, amount]) => ({
            price: Math.round(price * 100),
            amount: isFutures ? amount * 100 / price : amount,
            action: Action.BID,
        })),
        asks: raw.bids.map(([price, amount]) => ({
            price: Math.round(price * 100),
            amount: isFutures ? amount * 100 / price : amount,
            action: Action.ASK,
        })),
    }
}

export {
    formatRawOrderbookData,
    formatRawTradesData,
};