import {
    DerivativeMarkets,
} from './interfaces';

const DERIVATIVE_MARKETS: DerivativeMarkets = {
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
}

export {
    DERIVATIVE_MARKETS,
}