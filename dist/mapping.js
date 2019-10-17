"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DERIVATIVE_MARKETS = {
    'BTC-CW/USD': {
        tradesChannel: 'market.BTC_CW.trade.detail',
        orderbookChannel: 'market.BTC_CW.depth.step6',
    },
    'BTC-NW/USD': {
        tradesChannel: 'market.BTC_NW.trade.detail',
        orderbookChannel: 'market.BTC_NW.depth.step6',
    },
    'BTC-CQ/USD': {
        tradesChannel: 'market.BTC_CQ.trade.detail',
        orderbookChannel: 'market.BTC_CQ.depth.step6',
    },
};
exports.DERIVATIVE_MARKETS = DERIVATIVE_MARKETS;
//# sourceMappingURL=mapping.js.map