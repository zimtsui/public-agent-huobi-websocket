import { pandora2Pm2 } from 'autonomous';
import { PandoraKita } from 'pandora-kita';
import { PublicAgentHuobiWebsocket } from './index';

pandora2Pm2([
    PandoraKita,
    PublicAgentHuobiWebsocket,
]);