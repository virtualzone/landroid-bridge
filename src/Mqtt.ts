import { MqttClient, connect as mqttConnect, IClientPublishOptions } from 'mqtt';
import { Config } from "./Config";
import { EventEmitter } from 'events';

export class Mqtt extends EventEmitter {
    private static INSTANCE: Mqtt;
    private client: MqttClient;
    private config: any;

    private constructor() {
        super();
        this.config = Config.getInstance().get("mqtt");
        if (this.config.topic && this.config.topic !== "" && !(String(this.config.topic).endsWith("/"))) {
            this.config.topic += "/";
        }
        this.client = mqttConnect(this.config.url);
        console.log("Connecting to MQTT Broker...");
        this.client.on("error", this.onError.bind(this));
        this.client.on("connect", this.onConnect.bind(this));
        this.client.on("message", this.onMessage.bind(this));
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
            console.log("Publishing MQTT message to topic %s: %s", topic, message);
            this.client.publish(topic, message, options);
        }
    }

    private onError(e: Error): void {
        console.error("MQTT error: %s", e);
    }

    private onConnect(): void {
        console.log("Successfully connected to MQTT Broker!");
        this.client.subscribe(this.config.topic + "set/#");
    }

    private onMessage(topic: string, payload: Buffer): void {
        console.log("Incoming MQTT message to topic %s: %s", topic, payload.toString());
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
