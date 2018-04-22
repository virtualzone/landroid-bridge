import * as LandroidCloud from "iobroker.landroid-s/lib/landroid-cloud-2";
import { Config } from "./Config";
import { LandroidDataset } from "./LandroidDataset";
import { Mqtt } from "./Mqtt";
import { App } from "./App";

export class LandroidS {
    private static INSTANCE: LandroidS = new LandroidS();
    private initialized: boolean = false;
    private landroidCloud: LandroidCloud;
    private latestUpdate: LandroidDataset;

    constructor() {
        if (LandroidS.INSTANCE) {
            throw new Error("Call LandroidS.getInstance() instead!");
        }
    }

    public getLatestUpdate(): LandroidDataset {
        return this.latestUpdate;
    }

    public startMower(): void {
        this.sendMessage(1);
    }

    public stopMower(): void {
        this.sendMessage(3);
    }

    public setTimeExtension(timeExtension: number): void {
        if (isNaN(timeExtension) || timeExtension < -100 || timeExtension > 100) {
            throw Error("Time extension must be >= -100 and <= 100");
        }
        timeExtension = Number(timeExtension);
        console.log("Setting time extension to %d", timeExtension);
        this.sendMessage(null, {sc: {p: timeExtension}});
    }

    public setRainDelay(rainDelay: number): void {
        if (isNaN(rainDelay) || rainDelay < 0 || rainDelay > 300) {
            throw Error("Rain delay must be >= 0 and <= 300");
        }
        rainDelay = Number(rainDelay);
        console.log("Setting rain delay to %d", rainDelay);
        this.sendMessage(null, {rd: rainDelay});
    }

    public init(): void {
        if (this.initialized) {
            throw new Error("Already initialized!");
        }
        this.initialized = true;
        let adapter = {
            config: Config.getInstance().get("landroid-s"),
            log: {
                info: function(msg) { adapter.msg.info.push(msg);},
                error: function(msg) { adapter.msg.error.push(msg);},
                debug: function(msg) { adapter.msg.debug.push(msg);},
                warn: function(msg) { adapter.msg.warn.push(msg);}
            },
            msg: {
                info: [],
                error: [],
                debug: [],
                warn: []
            }
        };
        this.landroidCloud = new LandroidCloud(adapter);
        this.landroidCloud.init(this.updateListener.bind(this));
        Mqtt.getInstance().on("mqttMessage", this.onMqttMessage.bind(this));
    }

    private sendMessage(cmd?: number, params?: Object): void {
        let message: Object = {};
        if (cmd) {
            message["cmd"] = cmd;
        }
        if (params) {
            message = Object.assign(message, params);
        }
        let outMsg = JSON.stringify(message);
        console.log("Sending to landroid cloud: %s", outMsg);
        this.landroidCloud.sendMessage(outMsg);
    }

    private updateListener(status: any) {
        console.log("Incoming Landroid Cloud update: %s", JSON.stringify(status));
        let dataset: LandroidDataset = new LandroidDataset(status);
        this.publishMqtt(this.latestUpdate, dataset);
        this.latestUpdate = dataset;
    }

    private publishMqtt(previousDataset: LandroidDataset, currentDataset: LandroidDataset): void {
        let prev = (previousDataset ? previousDataset.serialize() : null);
        let curr = currentDataset.serialize();
        for (let key of Object.keys(curr)) {
            let val = curr[key];
            if (!prev || prev[key] !== curr[key]) {
                Mqtt.getInstance().publish("status/" + key, String(val), true);
            }
        }
    }

    private onMqttMessage(topic: string, payload: any): void {
        try {
            if (topic === "set/start") {
                this.startMower();
            } else if (topic === "set/stop") {
                this.stopMower();
            } else if (topic === "set/rainDelay") {
                this.setRainDelay(payload);
            } else if (topic === "set/timeExtension") {
                this.setTimeExtension(payload);
            } else {
                console.error("Unknown MQTT topic: %s", topic);
            }
        } catch (e) {
            console.error("Invalid MQTT payload for topic %s: %s", topic, e);
        }
    }

    public static getInstance(): LandroidS {
        return LandroidS.INSTANCE;
    }
}
