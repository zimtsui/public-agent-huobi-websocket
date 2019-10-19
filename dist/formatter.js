"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
function formatDerivativeRawTradesData(raw) {
    return raw.map(rawTrade => ({
        id: rawTrade.id.toString(),
        time: rawTrade.ts,
        amount: rawTrade.amount * 100 / rawTrade.price,
        price: rawTrade.price,
        action: rawTrade.direction === 'buy' ? interfaces_1.Action.BID : interfaces_1.Action.ASK,
    }));
}
exports.formatDerivativeRawTradesData = formatDerivativeRawTradesData;
function formatDerivativeRawOrderbookData(raw) {
    // api bug during settlement
    raw.bids = raw.bids || [];
    raw.asks = raw.asks || [];
    return {
        bids: raw.bids.map(([price, amount]) => ({
            price,
            amount: amount * 100 / price,
            action: interfaces_1.Action.BID,
        })),
        asks: raw.bids.map(([price, amount]) => ({
            price,
            amount: amount * 100 / price,
            action: interfaces_1.Action.ASK,
        })),
    };
}
exports.formatDerivativeRawOrderbookData = formatDerivativeRawOrderbookData;
//# sourceMappingURL=formatter.js.map