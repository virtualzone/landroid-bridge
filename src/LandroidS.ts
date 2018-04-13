import * as LandroidCloud from "iobroker.landroid-s/lib/landroid-cloud-2";
import { Config } from "./Config";
import { LandroidDataset } from "./LandroidDataset";
import { Mqtt } from "./Mqtt";

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

    public static getInstance(): LandroidS {
        return LandroidS.INSTANCE;
    }
}
