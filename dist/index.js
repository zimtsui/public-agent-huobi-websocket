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
const autonomous_1 = __importDefault(require("autonomous"));
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const autobind_decorator_1 = require("autobind-decorator");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const zlib_1 = require("zlib");
// @ts-ignore
const json_bigint_1 = __importDefault(require("json-bigint"));
const formatter_1 = require("./formatter");
const mapping_1 = require("./mapping");
const config = fs_extra_1.readJsonSync(path_1.join(__dirname, '../cfg/config.json'));
const ACTIVE_CLOSE = 4000;
class PublicAgentHuobiWebsocket extends autonomous_1.default {
    constructor() {
        super(...arguments);
        this.publicCenterDerivative = {};
    }
    async _start() {
        await this.connectHuobiDerivative();
        await this.subscribeDerivativeTrades();
        await this.subscribeDerivativeOrderbook();
        await this.connectPublicCenterDerivative();
        this.huobiDerivative.on('data', this.onDerivativeRawData);
    }
    async _stop() {
        if (this.huobiDerivative) {
            if (this.huobiDerivative.readyState < 2)
                this.huobiDerivative.close(ACTIVE_CLOSE);
            if (this.huobiDerivative.readyState < 3)
                await events_1.once(this.huobiDerivative, 'close');
        }
        for (const center of Object.values(this.publicCenterDerivative)) {
            if (center.readyState < 2)
                center.close(ACTIVE_CLOSE);
            if (center.readyState < 3)
                await events_1.once(center, 'close');
        }
    }
    async connectHuobiDerivative() {
        this.huobiDerivative = new ws_1.default(config.DERIVATIVE_URL);
        this.huobiDerivative.on('error', console.error);
        this.huobiDerivative.on('close', code => {
            if (code !== ACTIVE_CLOSE) {
                console.error(new Error('huobi derivative closed'));
                this.stop();
            }
        });
        this.huobiDerivative.on('message', (message) => {
            this.huobiDerivative.emit('data', json_bigint_1.default.parse(zlib_1.gunzipSync(message)));
        });
        await events_1.once(this.huobiDerivative, 'open');
    }
    async subscribeDerivativeTrades() {
        for (const pair in mapping_1.DERIVATIVE_MARKETS) {
            this.huobiDerivative.send(JSON.stringify({
                sub: mapping_1.DERIVATIVE_MARKETS[pair].tradesChannel,
                id: `${pair} trades`,
            }));
            const onSub = (data) => {
                if (data.subbed !== mapping_1.DERIVATIVE_MARKETS[pair].tradesChannel)
                    return;
                if (data.status === 'ok') {
                    this.huobiDerivative.emit(`${pair} trades subscribed`);
                }
                else {
                    console.error(new Error(`failed to subscribe ${pair} trades`));
                    this.stop();
                }
            };
            this.huobiDerivative.on('data', onSub);
            await events_1.once(this.huobiDerivative, `${pair} trades subscribed`);
            this.huobiDerivative.off('data', onSub);
        }
    }
    async subscribeDerivativeOrderbook() {
        for (const pair in mapping_1.DERIVATIVE_MARKETS) {
            this.huobiDerivative.send(JSON.stringify({
                sub: mapping_1.DERIVATIVE_MARKETS[pair].orderbookChannel,
                id: `${pair} orderbook`,
            }));
            const onSub = (data) => {
                if (data.subbed !== mapping_1.DERIVATIVE_MARKETS[pair].orderbookChannel)
                    return;
                if (data.status === 'ok') {
                    this.huobiDerivative.emit(`${pair} orderbook subscribed`);
                }
                else {
                    console.error(new Error(`failed to subscribe ${pair} orderbook`));
                    this.stop();
                }
            };
            this.huobiDerivative.on('data', onSub);
            await events_1.once(this.huobiDerivative, `${pair} orderbook subscribed`);
            this.huobiDerivative.off('data', onSub);
        }
    }
    async connectPublicCenterDerivative() {
        for (const pair in mapping_1.DERIVATIVE_MARKETS) {
            const center = this.publicCenterDerivative[pair]
                = new ws_1.default(`${config.PUBLIC_CENTER_BASE_URL}/huobi/${pair}`);
            center.on('error', console.error);
            center.on('close', code => {
                if (code !== ACTIVE_CLOSE) {
                    console.error(`public center for ${pair} closed`);
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
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades')
                this.onDerivativeRawTradesData(pair, data.tick.data);
            if (type === 'orderbook')
                this.onDerivativeRawOrderbookData(pair, data.tick);
        }
        catch (err) {
            console.error(err);
            this.stop();
        }
        ;
    }
    onDerivativeRawTradesData(pair, raw) {
        const trades = formatter_1.formatDerivativeRawTradesData(raw);
        const data = { trades };
        this.publicCenterDerivative[pair].send(JSON.stringify(data));
    }
    onDerivativeRawOrderbookData(pair, raw) {
        const orderbook = formatter_1.formatDerivativeRawOrderbookData(raw);
        const data = { orderbook };
        this.publicCenterDerivative[pair].send(JSON.stringify(data));
    }
    onDerivativePing(raw) {
        this.huobiDerivative.send(JSON.stringify({
            pong: raw.ping,
        }));
    }
    channelMap(channel) {
        for (const pair in mapping_1.DERIVATIVE_MARKETS) {
            if (channel === mapping_1.DERIVATIVE_MARKETS[pair].tradesChannel)
                return {
                    pair,
                    type: 'trades',
                };
            if (channel === mapping_1.DERIVATIVE_MARKETS[pair].orderbookChannel)
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
exports.PublicAgentHuobiWebsocket = PublicAgentHuobiWebsocket;
exports.default = PublicAgentHuobiWebsocket;
//# sourceMappingURL=index.js.map