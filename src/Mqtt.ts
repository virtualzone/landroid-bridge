import { MqttClient, connect as mqttConnect } from 'mqtt';
import { Config } from "./Config";
import { EventEmitter } from 'events';

export class Mqtt extends EventEmitter {
    private static INSTANCE: Mqtt;
    private client: MqttClient;
    private config: any;

    private constructor() {
        super();
        this.config = Config.getInstance().get("mqtt");
        this.client = mqttConnect(this.config.url);
        this.client.on("connect", this.onConnect.bind(this));
        this.client.on("message", this.onMessage.bind(this));
    }

    public publish(message: string): void {
        if (this.client && this.client.connected) {
            this.client.publish(this.config.topic, message);
        }
    }

    private onConnect(): void {
        this.client.subscribe(this.config.topic);
    }

    private onMessage(topic: string, payload: Buffer): void {
        console.log("Incoming MQTT message: %s", payload.toString());
        this.emit("mqttMessage", topic, payload);
    }

    public static getInstance(): Mqtt {
        if (!Mqtt.INSTANCE) {
            Mqtt.INSTANCE = new Mqtt();
        }
        return Mqtt.INSTANCE;
    }
}
