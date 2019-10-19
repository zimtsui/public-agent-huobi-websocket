import {
    DerivativeRawTradesData,
    DerivativeRawOrderbookData,
    Trade,
    Orderbook,
    Action,
} from './interfaces';

function formatDerivativeRawTradesData(
    raw: DerivativeRawTradesData
): Trade[] {
    return raw.map(rawTrade => ({
        id: rawTrade.id.toString(),
        time: rawTrade.ts,
        amount: rawTrade.amount * 100 / rawTrade.price,
        price: rawTrade.price,
        action: rawTrade.direction === 'buy' ? Action.BID : Action.ASK,
    }));
}

function formatDerivativeRawOrderbookData(
    raw: DerivativeRawOrderbookData
): Orderbook {
    // api bug during settlement
    raw.bids = raw.bids || [];
    raw.asks = raw.asks || [];

    return {
        bids: raw.bids.map(([price, amount]) => ({
            price,
            amount: amount * 100 / price,
            action: Action.BID,
        })),
        asks: raw.bids.map(([price, amount]) => ({
            price,
            amount: amount * 100 / price,
            action: Action.ASK,
        })),
    }
}

export {
    formatDerivativeRawOrderbookData,
    formatDerivativeRawTradesData,
};