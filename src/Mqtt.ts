import { MqttClient, connect as mqttConnect, IClientPublishOptions, IClientOptions } from 'mqtt';
import { Config } from "./Config";
import { EventEmitter } from 'events';
import { getLogger, Logger, configure } from "log4js";
import * as fs from "fs";
import * as path from 'path';

export class Mqtt extends EventEmitter {
    private static INSTANCE: Mqtt;
    private client: MqttClient;
    private config: any;
    private log: Logger;

    private constructor() {
        super();
        this.log = getLogger(this.constructor.name);
        this.config = Config.getInstance().get("mqtt");
        if (this.config && this.config.enable) {
            if (this.config.topic && this.config.topic !== "" && !(String(this.config.topic).endsWith("/"))) {
                this.config.topic += "/";
            }
            let options: IClientOptions = this.buildConnectOptions();
            this.client = mqttConnect(this.config.url, options);
            this.log.info("Connecting to MQTT Broker...");
            this.client.on("error", this.onError.bind(this));
            this.client.on("connect", this.onConnect.bind(this));
            this.client.on("message", this.onMessage.bind(this));
        } else {
            this.log.info("MQTT is disabled, skipping initialization");
        }
    }

    private buildConnectOptions(): IClientOptions {
        let options: IClientOptions = {};
        if (this.config.clientId) {
            options.clientId = this.config.clientId;
        }
        if (this.config.caFile) {
            let filePath: string = path.join(process.cwd(), this.config.caFile);
            options.ca = fs.readFileSync(filePath, "utf8");
        }
        if (this.config.keyFile) {
            let filePath: string = path.join(process.cwd(), this.config.keyFile);
            options.key = fs.readFileSync(filePath, "utf8");
        }
        if (this.config.certFile) {
            let filePath: string = path.join(process.cwd(), this.config.certFile);
            options.cert = fs.readFileSync(filePath, "utf8");
        }
        if (this.config.allowSelfSigned) {
            options.rejectUnauthorized = false;
        }
        return options;
    }

    public publish(topic: string, message: string, retain?: boolean): void {
        if (this.client && this.client.connected) {
            if (!retain) {
                retain = false;
            }
            let options: IClientPublishOptions = {
                qos: 0,
                retain: retain
            };
            topic = this.config.topic + topic;
            this.log.info("Publishing MQTT message to topic %s: %s", topic, message);
            this.client.publish(topic, message, options);
        }
    }

    private onError(e: Error): void {
        this.log.error("MQTT error: %s", e);
    }

    private onConnect(): void {
        this.log.info("Successfully connected to MQTT Broker!");
        this.client.subscribe(this.config.topic + "set/#");
    }

    private onMessage(topic: string, payload: Buffer): void {
        this.log.info("Incoming MQTT message to topic %s: %s", topic, payload.toString());
        if (topic.startsWith(this.config.topic)) {
            topic = topic.substr(String(this.config.topic).length);
        }
        this.emit("mqttMessage", topic, payload);
    }

    public static getInstance(): Mqtt {
        if (!Mqtt.INSTANCE) {
            Mqtt.INSTANCE = new Mqtt();
        }
        return Mqtt.INSTANCE;
    }
}
