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
        this.latestUpdate = new LandroidDataset(status);
        Mqtt.getInstance().publish(JSON.stringify(this.latestUpdate.serialize()));
    }

    public static getInstance(): LandroidS {
        return LandroidS.INSTANCE;
    }
}
