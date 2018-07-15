import { getLogger, Logger } from "log4js";
import { Config } from "./Config";

export class IoBrokerAdapter {
    config: any;
    log: Logger;
    msg: Object;
    states: Object;

    constructor(config: any) {
        this.log = getLogger(this.constructor.name);
        this.log.level = (Config.getInstance().get("logLevel") ? Config.getInstance().get("logLevel") : "info");
        this.config = config;
        this.msg = {
            info: [],
            error: [],
            debug: [],
            warn: []
        };
    }

    public setState(id: string, val: any, ack: boolean): void {
        this.log.debug("Setting state %s to %s", id, val);
        this.states[id] = val;
    }

    public getState(id: string): any {
        return this.states[id];
    }
}
