"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
function formatRawTradesData(raw, isFutures = false) {
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
            action: rawTrade.direction === 'buy' ? interfaces_1.Action.BID : interfaces_1.Action.ASK,
        };
    });
}
exports.formatRawTradesData = formatRawTradesData;
function formatRawOrderbookData(raw, isFutures = false) {
    // api bug during settlement
    raw.bids = raw.bids || [];
    raw.asks = raw.asks || [];
    return {
        bids: raw.bids.map(([price, amount]) => ({
            price: Math.round(price * 100),
            amount: isFutures ? amount * 100 / price : amount,
            action: interfaces_1.Action.BID,
        })),
        asks: raw.bids.map(([price, amount]) => ({
            price: Math.round(price * 100),
            amount: isFutures ? amount * 100 / price : amount,
            action: interfaces_1.Action.ASK,
        })),
    };
}
exports.formatRawOrderbookData = formatRawOrderbookData;
//# sourceMappingURL=formatter.js.map