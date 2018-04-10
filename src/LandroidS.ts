import * as LandroidCloud from "iobroker.landroid-s/lib/landroid-cloud-2";
import { Config } from "./Config";

export class LandroidS {
    private static INSTANCE: LandroidS = new LandroidS();
    private landroidCloud: LandroidCloud;

    constructor() {
        if (LandroidS.INSTANCE) {
            throw new Error("Call LandroidS.getInstance() instead!");
        }
    }

    public init(): void {
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
        console.log("incoming update: " + JSON.stringify(status));
    }

    public static getInstance(): LandroidS {
        return LandroidS.INSTANCE;
    }
}
