"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_1 = require("autonomous");
const ws_1 = __importDefault(require("ws"));
const lodash_1 = require("lodash");
const events_1 = require("events");
const autobind_decorator_1 = require("autobind-decorator");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const zlib_1 = require("zlib");
// @ts-ignore
const json_bigint_1 = __importDefault(require("json-bigint"));
const formatter_1 = require("./formatter");
const mapping_1 = require("./mapping");
const jsonBigintString = json_bigint_1.default({ storeAsString: true });
const config = fs_extra_1.readJsonSync(path_1.join(__dirname, '../cfg/config.json'));
const ACTIVE_CLOSE = 'public-agent-huobi-websocket';
class PublicAgentHuobiWebsocket extends autonomous_1.Autonomous {
    constructor() {
        super(...arguments);
        this.publicCenter = {};
    }
    async _start() {
        await this.connectPublicCenter();
        await this.connectHuobiDerivative();
        this.huobiDerivative.on('data', this.onDerivativeRawData);
        // await this.connectHuobiSpot();
        // this.huobiSpot.on('data', this.onSpotRawData);
        await this.subscribeTrades();
        await this.subscribeOrderbook();
    }
    async _stop() {
        /*
            火币的服务器是直接 terminate，不仅不发 close frame，有时候
            连 tcp 都不关，如果等 close 经常等不到，所以我也直接 terminate
        */
        // debouced 被 cancel 之后还能继续 invoke，所以先关网络。
        if (this.huobiSpot)
            this.huobiSpot.terminate();
        if (this.spotDebouncedStop)
            this.spotDebouncedStop.cancel();
        if (this.huobiDerivative)
            this.huobiDerivative.terminate();
        if (this.derivativeDebouncedStop)
            this.derivativeDebouncedStop.cancel();
        for (const center of Object.values(this.publicCenter)) {
            if (center.readyState < 2)
                center.close(1000, ACTIVE_CLOSE);
            if (center.readyState < 3)
                await events_1.once(center, 'close');
        }
    }
    async connectHuobiDerivative() {
        this.huobiDerivative = new ws_1.default(config.DERIVATIVE_URL);
        this.huobiDerivative.on('error', console.error);
        this.huobiDerivative.on('close', (code, reason) => {
            if (reason !== ACTIVE_CLOSE) {
                console.error(`huobi derivative closed: ${code}`);
                this.stop();
            }
        });
        this.huobiDerivative.on('message', (message) => {
            this.huobiDerivative.emit('data', jsonBigintString.parse(zlib_1.gunzipSync(message)));
        });
        await events_1.once(this.huobiDerivative, 'open');
        this.derivativeDebouncedStop = lodash_1.debounce(() => {
            console.error('huobi derivative lost ping');
            this.stop();
        }, config.DERIVATIVE_PING_INTERVAL * 2);
        this.derivativeDebouncedStop();
    }
    async connectHuobiSpot() {
        this.huobiSpot = new ws_1.default(config.SPOT_URL);
        this.huobiSpot.on('error', console.error);
        this.huobiSpot.on('close', (code, reason) => {
            if (reason !== ACTIVE_CLOSE) {
                console.error(`huobi spot closed: ${code}`);
                this.stop();
            }
        });
        this.huobiSpot.on('message', (message) => {
            this.huobiSpot.emit('data', JSON.parse(zlib_1.gunzipSync(message).toString('ascii')));
        });
        await events_1.once(this.huobiSpot, 'open');
        this.spotDebouncedStop = lodash_1.debounce(() => {
            console.error('huobi spot lost ping');
            this.stop();
        }, config.SPOT_PING_INTERVAL * 2);
        this.spotDebouncedStop();
    }
    async subscribeTrades() {
        for (const pair in mapping_1.MARKETS) {
            const huobi = mapping_1.MARKETS[pair].server === 'spot'
                ? this.huobiSpot : this.huobiDerivative;
            huobi.send(JSON.stringify({
                sub: mapping_1.MARKETS[pair].tradesChannel,
                id: `${pair} trades`,
            }));
            const onSub = (data) => {
                if (data.subbed !== mapping_1.MARKETS[pair].tradesChannel)
                    return;
                if (data.status === 'ok') {
                    huobi.emit(`${pair} trades subscribed`);
                }
                else {
                    console.error(`failed to subscribe ${pair} trades`);
                    this.stop();
                }
            };
            huobi.on('data', onSub);
            await events_1.once(huobi, `${pair} trades subscribed`);
            huobi.off('data', onSub);
        }
    }
    async subscribeOrderbook() {
        for (const pair in mapping_1.MARKETS) {
            const huobi = mapping_1.MARKETS[pair].server === 'spot'
                ? this.huobiSpot : this.huobiDerivative;
            huobi.send(JSON.stringify({
                sub: mapping_1.MARKETS[pair].orderbookChannel,
                id: `${pair} orderbook`,
            }));
            const onSub = (data) => {
                if (data.subbed !== mapping_1.MARKETS[pair].orderbookChannel)
                    return;
                if (data.status === 'ok') {
                    huobi.emit(`${pair} orderbook subscribed`);
                }
                else {
                    console.error(`failed to subscribe ${pair} orderbook`);
                    this.stop();
                }
            };
            huobi.on('data', onSub);
            await events_1.once(huobi, `${pair} orderbook subscribed`);
            huobi.off('data', onSub);
        }
    }
    async connectPublicCenter() {
        for (const pair in mapping_1.MARKETS) {
            const center = this.publicCenter[pair]
                = new ws_1.default(`${config.PUBLIC_CENTER_BASE_URL}/huobi/${pair}`);
            center.on('error', console.error);
            center.on('close', (code, reason) => {
                if (reason !== ACTIVE_CLOSE) {
                    console.error(`public center for ${pair} closed: ${code}`);
                    this.stop();
                }
            });
            await events_1.once(center, 'open');
        }
    }
    onDerivativeRawData(data) {
        try {
            if (data.ping) {
                this.onDerivativePing(data);
                return;
            }
            if (!data.ch)
                return;
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades')
                this.onRawTradesData(pair, data.tick.data);
            if (type === 'orderbook')
                this.onRawOrderbookData(pair, data.tick);
        }
        catch (err) {
            console.error(err);
            this.stop();
        }
        ;
    }
    onSpotRawData(data) {
        try {
            if (data.ping) {
                this.onSpotPing(data);
                return;
            }
            if (!data.ch)
                return;
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades')
                this.onRawTradesData(pair, data.tick.data);
            if (type === 'orderbook')
                this.onRawOrderbookData(pair, data.tick);
        }
        catch (err) {
            console.error(err);
            this.stop();
        }
        ;
    }
    onRawTradesData(pair, raw) {
        const isFutures = pair !== 'BTC/USDT';
        const trades = formatter_1.formatRawTradesData(raw, isFutures);
        const data = { trades };
        this.publicCenter[pair].send(JSON.stringify(data));
    }
    onRawOrderbookData(pair, raw) {
        const isFutures = pair !== 'BTC/USDT';
        const fullOrderbook = formatter_1.formatRawOrderbookData(raw, isFutures);
        const orderbook = {
            bids: fullOrderbook.bids.slice(0, config.ORDERBOOK_DEPTH),
            asks: fullOrderbook.asks.slice(0, config.ORDERBOOK_DEPTH),
        };
        const data = { orderbook };
        this.publicCenter[pair].send(JSON.stringify(data));
    }
    onDerivativePing(raw) {
        this.huobiDerivative.send(JSON.stringify({
            pong: raw.ping,
        }));
        this.derivativeDebouncedStop();
    }
    onSpotPing(raw) {
        this.huobiSpot.send(JSON.stringify({
            pong: raw.ping,
        }));
        this.spotDebouncedStop();
    }
    channelMap(channel) {
        for (const pair in mapping_1.MARKETS) {
            if (channel === mapping_1.MARKETS[pair].tradesChannel)
                return {
                    pair,
                    type: 'trades',
                };
            if (channel === mapping_1.MARKETS[pair].orderbookChannel)
                return {
                    pair,
                    type: 'orderbook',
                };
        }
        throw new Error('no channel matched');
    }
}
__decorate([
    autobind_decorator_1.boundMethod
], PublicAgentHuobiWebsocket.prototype, "onDerivativeRawData", null);
__decorate([
    autobind_decorator_1.boundMethod
], PublicAgentHuobiWebsocket.prototype, "onSpotRawData", null);
exports.PublicAgentHuobiWebsocket = PublicAgentHuobiWebsocket;
exports.default = PublicAgentHuobiWebsocket;
//# sourceMappingURL=index.js.map