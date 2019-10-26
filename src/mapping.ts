import {
    MarketsDescriptor,
} from './interfaces';

const MARKETS: MarketsDescriptor = {
    // 'BTC-CW/USD': {
    //     server: 'derivative',
    //     tradesChannel: 'market.BTC_CW.trade.detail',
    //     orderbookChannel: 'market.BTC_CW.depth.step6',
    // },
    // 'BTC-NW/USD': {
    //     server: 'derivative',
    //     tradesChannel: 'market.BTC_NW.trade.detail',
    //     orderbookChannel: 'market.BTC_NW.depth.step6',
    // },
    'BTC-CQ/USD': {
        server: 'derivative',
        tradesChannel: 'market.BTC_CQ.trade.detail',
        orderbookChannel: 'market.BTC_CQ.depth.step6',
    },
    // 'BTC/USDT': {
    //     server: 'spot',
    //     tradesChannel: 'market.btcusdt.trade.detail',
    //     orderbookChannel: 'market.btcusdt.depth.step0',
    // }
}

export {
    MARKETS,
}