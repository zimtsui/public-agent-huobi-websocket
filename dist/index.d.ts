import Autonomous from 'autonomous';
declare class PublicAgentHuobiWebsocket extends Autonomous {
    private huobiDerivative;
    private publicCenterDerivative;
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
    private connectHuobiDerivative;
    private subscribeDerivativeTrades;
    private subscribeDerivativeOrderbook;
    private connectPublicCenterDerivative;
    private onDerivativeRawData;
    private onDerivativeRawTradesData;
    private onDerivativeRawOrderbookData;
    private onDerivativePing;
    private channelMap;
}
export default PublicAgentHuobiWebsocket;
export { PublicAgentHuobiWebsocket };
