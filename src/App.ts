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

export class App extends EventEmitter {
    private static readonly INSTANCE: App = new App();
    public readonly express: express.Application;
    public server: Server;
    public mqtt: Mqtt;
    private devEnvironment: boolean = false;

    constructor() {
        super();
        if (App.INSTANCE) {
            throw new Error("Call App.getInstance() instead!");
        }
        this.devEnvironment = (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "dev");
        console.log("Dev mode = %s", this.devEnvironment);
        if (this.devEnvironment) {
            Config.getInstance().loadDevConfig();
        }
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
        LandroidS.getInstance().init();
        this.emit("appStarted");
        console.log("Server ready");
    }

    private setupMqtt(): void {
        let config = Config.getInstance().get("mqtt");
        if (config && config.enable) {
            this.mqtt = Mqtt.getInstance();
        }
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
            console.log("Adding static files path %s", staticFilesPath);
            this.express.use(express.static(staticFilesPath));
        });
    }

    private exitOnSignal(): void {
        console.log("Received exit signal...");
        if (this.server) {
            console.log("Closing http listener...");
            this.server.close();
        }
        process.exit(0);
    }

    private handleUnknownException(e: Error): void {
        console.error("Unhandled exception: %s", e);
    }

    private handleUnknownRejection(reason: Error, p: Promise<any>): void {
        console.error("Unhandled rejection: %s", reason);
    }

    public static getInstance(): App {
        return App.INSTANCE;
    }
}
