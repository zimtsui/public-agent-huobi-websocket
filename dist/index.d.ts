import { Autonomous } from 'autonomous';
declare class PublicAgentHuobiWebsocket extends Autonomous {
    private huobiDerivative;
    private huobiSpot;
    private publicCenter;
    private derivativeDebouncedStop;
    private spotDebouncedStop;
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
    private connectHuobiDerivative;
    private connectHuobiSpot;
    private subscribeTrades;
    private subscribeOrderbook;
    private connectPublicCenter;
    private onDerivativeRawData;
    private onSpotRawData;
    private onRawTradesData;
    private onRawOrderbookData;
    private onDerivativePing;
    private onSpotPing;
    private channelMap;
}
export default PublicAgentHuobiWebsocket;
export { PublicAgentHuobiWebsocket };
