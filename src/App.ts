import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { Server } from "http";
import { Config } from "./Config";
import { Router, NextFunction } from 'express-serve-static-core';
import { EventEmitter } from 'events';
import LandroidSRouter from './LandroidSRouter';
import { LandroidS } from './LandroidS';
import { Mqtt } from './Mqtt';
import WeatherRouter from './WeatherRouter';
import SchedulerRouter from './SchedulerRouter';
import { Scheduler } from './Scheduler';
import { ScheduledTasks } from './ScheduledTasks';
import { getLogger, Logger, configure as configureLog4js } from "log4js";

export class App extends EventEmitter {
    private static readonly INSTANCE: App = new App();
    public readonly express: express.Application;
    public server: Server;
    public mqtt: Mqtt;
    public devEnvironment: boolean = false;
    private log: Logger;

    constructor() {
        super();
        if (App.INSTANCE) {
            throw new Error("Call App.getInstance() instead!");
        }
        this.log = getLogger(this.constructor.name);
        this.devEnvironment = (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "dev");
        this.log.info("Dev mode = %s", this.devEnvironment);
        if (this.devEnvironment) {
            Config.getInstance().loadDevConfig();
        }
        configureLog4js({
            appenders: {
                out: { type: 'stdout' }
            },
            categories: {
                default: {
                    appenders: ["out"],
                    level: (Config.getInstance().get("logLevel") ? Config.getInstance().get("logLevel") : "info")
                }
            }
        });
        process.on("SIGINT", this.exitOnSignal.bind(this));
        process.on("SIGTERM", this.exitOnSignal.bind(this));
        process.on("uncaughtException", this.handleUnknownException.bind(this));
        process.on("unhandledRejection", this.handleUnknownRejection.bind(this));
        this.express = express();
    }

    public start(): void {
        this.setupMqtt();
        this.express.set("trust proxy", true);
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
        this.setupRoutes();
        new Scheduler().init().then(() => {
            LandroidS.getInstance().init().then(() => {
                ScheduledTasks.init();
                this.emit("appStarted");
                this.log.info("Server ready");
            }).catch(e => this.log.error(e));
        }).catch(e => this.log.error(e));
    }

    private setupMqtt(): void {
        this.mqtt = Mqtt.getInstance();
    }

    private setupRoutes(): void {
        let router: Router = express.Router();
        this.express.use('/', router);
        this.express.use("/landroid-s", LandroidSRouter);
        this.express.use("/scheduler", SchedulerRouter);
        this.express.use("/weather", WeatherRouter);
        this.addStaticFilesRoutes();
    }

    private addStaticFilesRoutes(): void {
        let router = express.Router();
        let staticFilesPaths = [
            path.join(__dirname, "../www")
        ];
        staticFilesPaths.forEach(staticFilesPath => {
            this.log.info("Adding static files path %s", staticFilesPath);
            this.express.use(express.static(staticFilesPath));
        });
    }

    private exitOnSignal(): void {
        this.log.info("Received exit signal...");
        if (this.server) {
            this.log.info("Closing http listener...");
            this.server.close();
        }
        process.exit(0);
    }

    private handleUnknownException(e: Error): void {
        this.log.error("Unhandled exception: %s", e);
    }

    private handleUnknownRejection(reason: Error, p: Promise<any>): void {
        this.log.error("Unhandled rejection: %s", reason);
    }

    public static getInstance(): App {
        return App.INSTANCE;
    }
}
