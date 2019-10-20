"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_1 = require("autonomous");
const pandora_kita_1 = require("pandora-kita");
const index_1 = require("./index");
autonomous_1.pandora2Pm2([
    pandora_kita_1.PandoraKita,
    index_1.PublicAgentHuobiWebsocket,
]);
//# sourceMappingURL=main.js.map