import { Autonomous } from 'autonomous';
import WebSocket from 'ws';
import { debounce, Cancelable } from 'lodash';
import { once } from 'events';
import { boundMethod } from 'autobind-decorator';
import { readJsonSync } from 'fs-extra';
import { join } from 'path';
import { gunzipSync } from 'zlib';
// @ts-ignore
import jsonBigint from 'json-bigint';
import {
    formatRawOrderbookData,
    formatRawTradesData,
} from './formatter';
import {
    MARKETS,
} from './mapping';
import {
    PublicDataFromAgentToCenter as PDFATC,
    RawOrderbookData,
    RawTradesData,
    Config,
    Orderbook,
} from './interfaces';
const jsonBigintString = jsonBigint({ storeAsString: true });

const config: Config = readJsonSync(join(__dirname, '../cfg/config.json'));

const ACTIVE_CLOSE = 'public-agent-huobi-websocket';

class PublicAgentHuobiWebsocket extends Autonomous {
    private huobiDerivative!: WebSocket;
    private huobiSpot!: WebSocket;
    private publicCenter: {
        [pair: string]: WebSocket;
    } = {};
    private derivativeDebouncedStop!: Function & Cancelable;
    private spotDebouncedStop!: Function & Cancelable;

    protected async _start(): Promise<void> {
        await this.connectPublicCenter();
        await this.connectHuobiDerivative();
        this.huobiDerivative.on('data', this.onDerivativeRawData);
        // await this.connectHuobiSpot();
        // this.huobiSpot.on('data', this.onSpotRawData);

        await this.subscribeTrades();
        await this.subscribeOrderbook();
    }

    protected async _stop(): Promise<void> {
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
            if (center.readyState < 2) center.close(1000, ACTIVE_CLOSE);
            if (center.readyState < 3) await once(center, 'close');
        }
    }

    private async connectHuobiDerivative(): Promise<void> {
        this.huobiDerivative = new WebSocket(config.DERIVATIVE_URL);

        this.huobiDerivative.on('error', console.error);
        this.huobiDerivative.on('close', (code, reason) => {
            if (reason !== ACTIVE_CLOSE) {
                console.error(`huobi derivative closed: ${code}`);
                this.stop();
            }
        });
        this.huobiDerivative.on('message', (message: Buffer) => {
            this.huobiDerivative.emit('data', jsonBigintString.parse(
                gunzipSync(message)
            ));
        })

        await once(this.huobiDerivative, 'open');
        this.derivativeDebouncedStop = debounce(() => {
            console.error('huobi derivative lost ping');
            this.stop();
        }, config.DERIVATIVE_PING_INTERVAL * 2);
        this.derivativeDebouncedStop();
    }

    private async connectHuobiSpot(): Promise<void> {
        this.huobiSpot = new WebSocket(config.SPOT_URL);

        this.huobiSpot.on('error', console.error);
        this.huobiSpot.on('close', (code, reason) => {
            if (reason !== ACTIVE_CLOSE) {
                console.error(`huobi spot closed: ${code}`);
                this.stop();
            }
        });
        this.huobiSpot.on('message', (message: Buffer) => {
            this.huobiSpot.emit('data', JSON.parse(
                gunzipSync(message).toString('ascii'),
            ));
        })

        await once(this.huobiSpot, 'open');
        this.spotDebouncedStop = debounce(() => {
            console.error('huobi spot lost ping');
            this.stop();
        }, config.SPOT_PING_INTERVAL * 2);
        this.spotDebouncedStop();
    }

    private async subscribeTrades(): Promise<void> {
        for (const pair in MARKETS) {
            const huobi = MARKETS[pair].server === 'spot'
                ? this.huobiSpot : this.huobiDerivative;

            huobi.send(JSON.stringify({
                sub: MARKETS[pair].tradesChannel,
                id: `${pair} trades`,
            }));

            const onSub = (data: any) => {
                if (data.subbed !== MARKETS[pair].tradesChannel)
                    return;
                if (data.status === 'ok') {
                    huobi.emit(`${pair} trades subscribed`);
                } else {
                    console.error(`failed to subscribe ${pair} trades`);
                    this.stop();
                }
            }

            huobi.on('data', onSub);
            await once(huobi, `${pair} trades subscribed`);
            huobi.off('data', onSub);
        }
    }

    private async subscribeOrderbook(): Promise<void> {
        for (const pair in MARKETS) {
            const huobi = MARKETS[pair].server === 'spot'
                ? this.huobiSpot : this.huobiDerivative;

            huobi.send(JSON.stringify({
                sub: MARKETS[pair].orderbookChannel,
                id: `${pair} orderbook`,
            }));

            const onSub = (data: any) => {
                if (data.subbed !== MARKETS[pair].orderbookChannel)
                    return;
                if (data.status === 'ok') {
                    huobi.emit(`${pair} orderbook subscribed`);
                } else {
                    console.error(`failed to subscribe ${pair} orderbook`);
                    this.stop();
                }
            }

            huobi.on('data', onSub);
            await once(huobi, `${pair} orderbook subscribed`);
            huobi.off('data', onSub);
        }
    }

    private async connectPublicCenter(): Promise<void> {
        for (const pair in MARKETS) {
            const center = this.publicCenter[pair]
                = new WebSocket(
                    `${config.PUBLIC_CENTER_BASE_URL}/huobi/${pair}`
                );
            center.on('error', console.error);
            center.on('close', (code, reason) => {
                if (reason !== ACTIVE_CLOSE) {
                    console.error(`public center for ${pair} closed: ${code}`);
                    this.stop();
                }
            });

            await once(center, 'open');
        }
    }

    @boundMethod
    private onDerivativeRawData(data: any) {
        try {
            if (data.ping) {
                this.onDerivativePing(data);
                return;
            }
            if (!data.ch) return;
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades') this.onRawTradesData(
                pair, <RawTradesData>data.tick.data,
            );
            if (type === 'orderbook') this.onRawOrderbookData(
                pair, <RawOrderbookData>data.tick,
            );
        } catch (err) {
            console.error(err);
            this.stop();
        };
    }

    @boundMethod
    private onSpotRawData(data: any) {
        try {
            if (data.ping) {
                this.onSpotPing(data);
                return;
            }
            if (!data.ch) return;
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades') this.onRawTradesData(
                pair, <RawTradesData>data.tick.data,
            );
            if (type === 'orderbook') this.onRawOrderbookData(
                pair, <RawOrderbookData>data.tick,
            );
        } catch (err) {
            console.error(err);
            this.stop();
        };
    }

    private onRawTradesData(
        pair: string,
        raw: RawTradesData,
    ) {
        const isFutures = pair !== 'BTC/USDT';
        const trades = formatRawTradesData(raw, isFutures);
        const data: PDFATC = { trades };
        this.publicCenter[pair].send(JSON.stringify(data));
    }

    private onRawOrderbookData(
        pair: string,
        raw: RawOrderbookData,
    ) {
        const isFutures = pair !== 'BTC/USDT';
        const fullOrderbook = formatRawOrderbookData(raw, isFutures);
        const orderbook: Orderbook = {
            bids: fullOrderbook.bids.slice(0, config.ORDERBOOK_DEPTH),
            asks: fullOrderbook.asks.slice(0, config.ORDERBOOK_DEPTH),
        };
        const data: PDFATC = { orderbook };
        this.publicCenter[pair].send(JSON.stringify(data));
    }

    private onDerivativePing(raw: any) {
        this.huobiDerivative.send(JSON.stringify({
            pong: raw.ping,
        }));
        this.derivativeDebouncedStop();
    }

    private onSpotPing(raw: any) {
        this.huobiSpot.send(JSON.stringify({
            pong: raw.ping,
        }));
        this.spotDebouncedStop();
    }

    private channelMap(channel: string) {
        for (const pair in MARKETS) {
            if (channel === MARKETS[pair].tradesChannel)
                return {
                    pair,
                    type: 'trades',
                };
            if (channel === MARKETS[pair].orderbookChannel)
                return {
                    pair,
                    type: 'orderbook',
                }
        }
        throw new Error('no channel matched');
    }
}

export default PublicAgentHuobiWebsocket;
export { PublicAgentHuobiWebsocket };