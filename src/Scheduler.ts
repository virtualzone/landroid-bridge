import { TimePeriod } from "./LandroidDataset";
import { Config } from "./Config";
import { Weather, WeatherDataset } from "./Weather";

export class Scheduler {
    public static getNext7Days(): Promise<TimePeriod[]> {
        let config = Config.getInstance().get("scheduler");
        return new Promise((resolve, reject) => {
            if (!config || !config.enable) {
                reject(new Error("Scheduler is not enabled in config.json"));
                return;
            }
            Weather.loadHourly10day().then(forecast => {
                let result: TimePeriod[] = Scheduler.getTimePeriods(config, forecast);
                resolve(result);
            }).catch(e => reject(new Error("Could not load weather forecast")));
        });
    }

    public static getTimePeriods(config: any, forecast: WeatherDataset[]): TimePeriod[] {
        let result: TimePeriod[] = [];
        for (let i=1; i<=7; i++) {
            let item = new TimePeriod();
            item.startHour = config.earliestStart;
            item.startMinute = 0;
            item.durationMinutes = 0;
            item.cutEdge = false;
            result.push(item);
        }
        return result;
    }
}
