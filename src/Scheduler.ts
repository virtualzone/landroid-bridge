import * as moment from 'moment';
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
            let date: moment.Moment = moment().add(i, "days");
            let item: TimePeriod = Scheduler.getTimePeriodForDate(config, forecast, date);
            result.push(item);
        }
        return result;
    }

    private static getTimePeriodForDate(config: any, forecast: WeatherDataset[], date: moment.Moment): TimePeriod {
        let result: TimePeriod = new TimePeriod();
        let startOffsetHours: number = Math.ceil(config.rainDelay / 60);
        let start: moment.Moment = date.clone().hour(config.earliestStart - startOffsetHours).minute(0).second(0);
        let end: moment.Moment = date.clone().hour(config.latestStop).minute(0).second(0);
        let forecastOnDate: WeatherDataset[] = Scheduler.getForecastBetween(forecast, start, end);
        let longestSequenceBelowPrecipitationThreshold: TimePeriodInternal =
            Scheduler.getLongestSequenceBelowPrecipitationThreshold(forecastOnDate, config.threshold);
        result.startHour = longestSequenceBelowPrecipitationThreshold.start.hour() + startOffsetHours;
        result.startMinute = 0;
        result.durationMinutes = (longestSequenceBelowPrecipitationThreshold.hours - startOffsetHours) * 60;
        if (result.durationMinutes < 0) {
            result.durationMinutes = 0;
        }
        result.cutEdge = false;
        return result;
    }

    public static getLongestSequenceBelowPrecipitationThreshold(forecastOnDate: WeatherDataset[], threshold: number): TimePeriodInternal {
        let maxIdx = 0, maxLen = 0, currLen = 0, currIdx = 0;
        forecastOnDate.forEach((forecastItem, i) => {
            if (forecastItem.precipitation < threshold) {
                currLen++;
                if (currLen === 1) {
                    currIdx = i;
                }
                if (currLen > maxLen) {
                    maxLen = currLen;
                    maxIdx = currIdx;
                }
            } else {
                currLen = 0;
            }
        });
        let result: TimePeriodInternal = new TimePeriodInternal();
        result.start = forecastOnDate[maxIdx].dateTime;
        result.hours = maxLen;
        return result;
    }

    private static getForecastBetween(forecast: WeatherDataset[], start: moment.Moment, end: moment.Moment): WeatherDataset[] {
        let result: WeatherDataset[] = [];
        forecast.forEach((item) => {
            if (item.dateTime.isBetween(start, end, "minute", "[)")) {
                result.push(item);
            }
        });
        console.log("Got forecast between %s and %s with %d results", start, end, result.length);
        return result;
    }

}

export class TimePeriodInternal {
    start: moment.Moment;
    hours: number;
}
