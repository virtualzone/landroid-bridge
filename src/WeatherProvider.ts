import * as https from 'https';
import * as moment from 'moment';
import * as fs from "fs";
import * as path from 'path';
import * as Cache from 'cache';
import { Config } from './Config';
import { App } from './App';

export abstract class WeatherProvider {
    public static USE_FILES: boolean = false; // Debugging/offline-mode only
    protected static CACHE = new Cache(60 * 1000 * 70); // 70 minutes

    public abstract loadCurrent(forceCacheRenewal?: boolean): Promise<WeatherDataset>;

    public abstract loadHistory(dayOffset?: number, forceCacheRenewal?: boolean): Promise<WeatherDataset[]>;

    public abstract loadHourly10day(includeTodayHistory?: boolean, forceCacheRenewal?: boolean): Promise<WeatherDataset[]>;

    protected removeDuplicateHourValues(arr: WeatherDataset[]): void {
        for (let i = 0; i < arr.length; i++) {
            let curr = arr[i];
            for (let j = arr.length - 1; j >= 0; j--) {
                if (i !== j && curr.dateTime.isSame(arr[j].dateTime, "hour")) {
                    arr.splice(j, 1);
                }
            }
        }
    }
}

export class WeatherDataset {
    dateTime: moment.Moment;
    temperature: number;
    precipitation: number;

    public static fromValues(dateTime: moment.Moment, temperature: number, precipitation: number): WeatherDataset {
        let result: WeatherDataset = new WeatherDataset();
        result.dateTime = dateTime;
        result.temperature = temperature;
        result.precipitation = precipitation;
        return result;
    }

    public clone(): WeatherDataset {
        let result: WeatherDataset = new WeatherDataset();
        result.dateTime = this.dateTime.clone();
        result.temperature = this.temperature;
        result.precipitation = this.precipitation;
        return result;
    }

    public serialize(): any {
        return {
            dateTime: this.dateTime.format("YYYY-MM-DD HH:mm:ss"),
            temperature: this.temperature,
            precipitation: this.precipitation
        };
    }
}
