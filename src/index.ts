import Autonomous from 'autonomous';
import WebSocket from 'ws';
import { once } from 'events';
import { boundMethod } from 'autobind-decorator';
import { readJsonSync } from 'fs-extra';
import { join } from 'path';
import { gunzipSync } from 'zlib';
// @ts-ignore
import JsonBigint from 'json-bigint';
import {
    formatDerivativeRawOrderbookData,
    formatDerivativeRawTradesData,
} from './formatter';
import {
    DERIVATIVE_MARKETS,
} from './mapping';
import {
    PublicDataFromAgentToCenter as PDFATC,
    DerivativeRawOrderbookData,
    DerivativeRawTradesData,
} from './interfaces';

const config = readJsonSync(join(__dirname, '../cfg/config.json'));

const ACTIVE_CLOSE = 4000;

class PublicAgentHuobiWebsocket extends Autonomous {
    private huobiDerivative!: WebSocket;
    private publicCenterDerivative: {
        [pair: string]: WebSocket;
    } = {};

    protected async _start(): Promise<void> {
        await this.connectHuobiDerivative();

        await this.subscribeDerivativeTrades();
        await this.subscribeDerivativeOrderbook();
        await this.connectPublicCenterDerivative();

        this.huobiDerivative.on('data', this.onDerivativeRawData);
    }

    protected async _stop(): Promise<void> {
        if (this.huobiDerivative) {
            if (this.huobiDerivative.readyState < 2)
                this.huobiDerivative.close(ACTIVE_CLOSE);
            if (this.huobiDerivative.readyState < 3)
                await once(this.huobiDerivative, 'close');
        }
        for (const center of Object.values(this.publicCenterDerivative)) {
            if (center.readyState < 2) center.close(ACTIVE_CLOSE);
            if (center.readyState < 3) await once(center, 'close');
        }
    }

    private async connectHuobiDerivative(): Promise<void> {
        this.huobiDerivative = new WebSocket(config.DERIVATIVE_URL);

        this.huobiDerivative.on('error', console.error);
        this.huobiDerivative.on('close', code => {
            if (code !== ACTIVE_CLOSE) {
                console.error(new Error('huobi derivative closed'));
                this.stop();
            }
        });
        this.huobiDerivative.on('message', (message: Buffer) => {
            this.huobiDerivative.emit('data', JsonBigint.parse(
                gunzipSync(message)
            ));
        })

        await once(this.huobiDerivative, 'open');
    }

    private async subscribeDerivativeTrades(): Promise<void> {
        for (const pair in DERIVATIVE_MARKETS) {
            this.huobiDerivative.send(JSON.stringify({
                sub: DERIVATIVE_MARKETS[pair].tradesChannel,
                id: `${pair} trades`,
            }));

            const onSub = (data: any) => {
                if (data.subbed !== DERIVATIVE_MARKETS[pair].tradesChannel)
                    return;
                if (data.status === 'ok') {
                    this.huobiDerivative.emit(`${pair} trades subscribed`);
                } else {
                    console.error(new Error(
                        `failed to subscribe ${pair} trades`));
                    this.stop();
                }
            }

            this.huobiDerivative.on('data', onSub);
            await once(this.huobiDerivative, `${pair} trades subscribed`);
            this.huobiDerivative.off('data', onSub);
        }
    }

    private async subscribeDerivativeOrderbook(): Promise<void> {
        for (const pair in DERIVATIVE_MARKETS) {
            this.huobiDerivative.send(JSON.stringify({
                sub: DERIVATIVE_MARKETS[pair].orderbookChannel,
                id: `${pair} orderbook`,
            }));

            const onSub = (data: any) => {
                if (data.subbed !== DERIVATIVE_MARKETS[pair].orderbookChannel)
                    return;
                if (data.status === 'ok') {
                    this.huobiDerivative.emit(`${pair} orderbook subscribed`);
                } else {
                    console.error(new Error(
                        `failed to subscribe ${pair} orderbook`));
                    this.stop();
                }
            }

            this.huobiDerivative.on('data', onSub);
            await once(this.huobiDerivative, `${pair} orderbook subscribed`);
            this.huobiDerivative.off('data', onSub);
        }
    }

    private async connectPublicCenterDerivative(): Promise<void> {
        for (const pair in DERIVATIVE_MARKETS) {
            const center = this.publicCenterDerivative[pair]
                = new WebSocket(
                    `${config.PUBLIC_CENTER_BASE_URL}/huobi/${pair}`
                );
            center.on('error', console.error);
            center.on('close', code => {
                if (code !== ACTIVE_CLOSE) {
                    console.error(`public center for ${pair} closed`);
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
            const { pair, type } = this.channelMap(data.ch);
            if (type === 'trades') this.onDerivativeRawTradesData(
                pair, <DerivativeRawTradesData>data.tick.data,
            );
            if (type === 'orderbook') this.onDerivativeRawOrderbookData(
                pair, <DerivativeRawOrderbookData>data.tick,
            );
        } catch (err) {
            console.error(err);
            this.stop();
        };
    }

    private onDerivativeRawTradesData(
        pair: string,
        raw: DerivativeRawTradesData,
    ) {
        const trades = formatDerivativeRawTradesData(raw);
        const data: PDFATC = { trades };
        this.publicCenterDerivative[pair].send(JSON.stringify(data));
    }

    private onDerivativeRawOrderbookData(
        pair: string,
        raw: DerivativeRawOrderbookData,
    ) {
        const orderbook = formatDerivativeRawOrderbookData(raw);
        const data: PDFATC = { orderbook };
        this.publicCenterDerivative[pair].send(JSON.stringify(data));
    }

    private onDerivativePing(raw: any) {
        this.huobiDerivative.send(JSON.stringify({
            pong: raw.ping,
        }));
    }

    private channelMap(channel: string) {
        for (const pair in DERIVATIVE_MARKETS) {
            if (channel === DERIVATIVE_MARKETS[pair].tradesChannel)
                return {
                    pair,
                    type: 'trades',
                };
            if (channel === DERIVATIVE_MARKETS[pair].orderbookChannel)
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