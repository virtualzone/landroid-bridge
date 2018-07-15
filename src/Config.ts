import * as fs from "fs";
import * as path from 'path';
import { getLogger, Logger } from "log4js";

export class Config {
    private static INSTANCE: Config = new Config();
    private config: Object;
    private log: Logger;

    constructor() {
        if (Config.INSTANCE) {
            throw new Error("Call Config.getInstance() instead!");
        }
        this.log = getLogger(this.constructor.name);
        let filePath: string = path.join(process.cwd(), "./config.json");
        this.loadConfig(filePath);
    }

    public get(key: string): any {
        return this.config[key];
    }

    public loadDevConfig(): void {
        let filePath: string = path.join(process.cwd(), "./config.dev.json");
        this.loadConfig(filePath);
    }

    private loadConfig(filePath: string): void {
        this.log.info("Loading config from " + filePath);
        let buffer: string = fs.readFileSync(filePath, "utf8");
        try {
            this.config = JSON.parse(buffer);
        } catch (e) {
            throw new Error("Could not parse config.json");
        }
    }

    public static getInstance(): Config {
        return Config.INSTANCE;
    }
}
