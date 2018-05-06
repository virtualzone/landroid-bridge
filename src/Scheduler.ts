import * as moment from 'moment';
import * as path from 'path';
import { TimePeriod } from "./LandroidDataset";
import { Config } from "./Config";
import { Weather, WeatherDataset } from "./Weather";
import { OPEN_READONLY, Database } from 'sqlite3';
import { resolve } from 'dns';
import { LandroidS } from './LandroidS';

export class Scheduler {
    public init(): Promise<void> {
        return this.createDb();
    }

    public applySchedule(): Promise<Object> {
        return new Promise((resolve, reject) => {
            this.getNext7Days().then(schedule => {
                let settings = [];
                Object.keys(schedule).sort().forEach((key, i) => {
                    let item = schedule[key];
                    let date = moment(key);
                    settings.push([date, item.durationMinutes]);
                    if (i <= 7) {
                        LandroidS.getInstance().setSchedule(date.weekday(), item.serialize());
                    }
                });
                this.persistDurations(settings)
                    .then(() => resolve(schedule))
                    .catch(e => reject(e));
            }).catch(e => reject(e));
        });
    }

    public getNext7Days(): Promise<Object> {
        let config = Config.getInstance().get("scheduler");
        return new Promise((resolve, reject) => {
            if (!config || !config.enable) {
                reject(new Error("Scheduler is not enabled in config.json"));
                return;
            }
            Weather.loadHourly10day(true).then(forecast => {
                let result: Object = this.getTimePeriods(config, forecast);
                // Remove off days
                let offDayIdx = this.getOffDayIdx(config, result);
                offDayIdx.forEach(i => result[i].durationMinutes = 0);
                // Minimize mow times
                this.adjustMowTimes(config, result).then(() => resolve(result)).catch(e => reject(e));
            }).catch(e => reject(new Error("Could not load weather forecast: " + e)));
        });
    }

    public getTimePeriods(config: any, forecast: WeatherDataset[]): Object {
        let result: Object = {};
        let now: moment.Moment = moment();
        let offset = (now.hour() >= config.latestStop ? 1 : 0);
        for (let i = 0 + offset; i <= 7 - offset; i++) {
            let date: moment.Moment = moment().add(i, "days");
            let item: TimePeriod = this.getTimePeriodForDate(config, forecast, date);
            result[date.format("YYYY-MM-DD")] = item;
        }
        return result;
    }

    private adjustMowTimes(config: any, timePeriods: Object): Promise<void> {
        return new Promise((resolve, reject) => {
            //let totalMowTime = this.getTotalMowTime(timePeriods);
            let workMinutesTotalCut = this.getWorkMinutesTotalCut(config);
            let targetMowTimePerDay = workMinutesTotalCut / config.daysForTotalCut;
            let soonest = Object.keys(timePeriods).sort()[0];
            this.getPersistedDurationsSinceYesterday(config.daysForTotalCut - 1).then(pastTotalRollingMowTime => {
                Object.keys(timePeriods).forEach(key => {
                    let item = timePeriods[key];
                    if (key === soonest) {
                        let targetToday = workMinutesTotalCut - pastTotalRollingMowTime;
                        if (targetToday < 0) {
                            targetToday = 0;
                        }
                        if (targetToday > item.durationMinutes) {
                            targetToday = item.durationMinutes;
                        }
                        let diff = item.durationMinutes - targetToday;
                        item.startHour += Math.floor(diff / 60);
                        item.durationMinutes = targetToday;
                    } else if (item.durationMinutes > targetMowTimePerDay) {
                        let diff = item.durationMinutes - targetMowTimePerDay;
                        item.startHour += Math.floor(diff / 60);
                        item.durationMinutes = targetMowTimePerDay;
                    }
                });
                resolve();
            }).catch(e => reject(e));
        });
    }

    /*
    private getTotalMowTime(timePeriods: Object): number {
        let result = 0;
        Object.keys(timePeriods).forEach(key => {
            result += timePeriods[key].durationMinutes;
        });
        return result;
    }
    */

    private getWorkMinutesTotalCut(config: any): number {
        let result = 0;
        let rawHoursWithoutCharging = config.squareMeters / config.perHour;
        let chargingFactor = config.chargeTime / config.mowTime + 1;
        return rawHoursWithoutCharging * chargingFactor * 60;
    }

    private getOffDayIdx(config: any, timePeriods: Object): Array<string> {
        let result: Array<string> = [];
        for (let i = 1; i <= config.offDays; i++) {
            let smallestIdx = null;
            Object.keys(timePeriods).forEach(key => {
                let item = timePeriods[key];
                if (result.indexOf(key) === -1) {
                    if (smallestIdx === null || item.durationMinutes < timePeriods[smallestIdx].durationMinutes) {
                        smallestIdx = key;
                    }
                }
            });
            result.push(smallestIdx);
        }
        return result;
    }

    private getTimePeriodForDate(config: any, forecast: WeatherDataset[], date: moment.Moment): TimePeriod {
        let result: TimePeriod = new TimePeriod();
        let startOffsetHours: number = Math.ceil(config.rainDelay / 60);
        let start: moment.Moment = date.clone().hour(config.earliestStart - startOffsetHours).minute(0).second(0);
        let end: moment.Moment = date.clone().hour(config.latestStop).minute(0).second(0);
        let forecastOnDate: WeatherDataset[] = this.getForecastBetween(forecast, start, end);
        let longestSequenceBelowPrecipitationThreshold: TimePeriodInternal =
            this.getLongestSequenceBelowPrecipitationThreshold(forecastOnDate, config.threshold);
        result.startHour = longestSequenceBelowPrecipitationThreshold.start.hour() + startOffsetHours;
        result.startMinute = 0;
        result.durationMinutes = (longestSequenceBelowPrecipitationThreshold.hours - startOffsetHours) * 60;
        if (result.durationMinutes < 0) {
            result.durationMinutes = 0;
        }
        result.cutEdge = true;
        return result;
    }

    public getLongestSequenceBelowPrecipitationThreshold(forecastOnDate: WeatherDataset[], threshold: number): TimePeriodInternal {
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

    private getForecastBetween(forecast: WeatherDataset[], start: moment.Moment, end: moment.Moment): WeatherDataset[] {
        let result: WeatherDataset[] = [];
        forecast.forEach((item) => {
            if (item.dateTime.isBetween(start, end, "minute", "[)")) {
                result.push(item);
            }
        });
        return result;
    }

    private createDb(): Promise<void> {
        return new Promise((resolve, reject) => {
            let config = Config.getInstance().get("scheduler");
            let filePath: string = path.join(process.cwd(), config.db);
            let ddl = "CREATE TABLE IF NOT EXISTS schedule (" +
                "date TEXT PRIMARY KEY, " +
                "minutes INT " +
                ")";
            let db: Database = new Database(filePath, (e) => {
                if (e) {
                    reject(e);
                    return;
                }
                db.run(ddl, (e) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    db.close(() => resolve());
                });
            });
        });
    }

    private persistDurations(durations: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            let config = Config.getInstance().get("scheduler");
            let filePath: string = path.join(process.cwd(), config.db);
            let db: Database = new Database(filePath, () => {
                db.serialize(() => {
                    durations.forEach(item => {
                        let date = item[0];
                        let durationMinutes = item[1];
                        db.run("INSERT OR REPLACE INTO schedule (date, minutes) VALUES(?, ?)",
                            date.format("YYYY-MM-DD"), durationMinutes, (e) => {
                            if (e) {
                                reject(e);
                                return;
                            }
                        });
                    });
                    db.close(() => resolve());
                });
            });
        });
    }

    private persistDuration(date: moment.Moment, durationMinutes: number): Promise<void> {
        return new Promise((resolve, reject) => {
            let config = Config.getInstance().get("scheduler");
            let filePath: string = path.join(process.cwd(), config.db);
            let db: Database = new Database(filePath, () => {
                db.run("INSERT OR REPLACE INTO schedule (date, minutes) VALUES(?, ?)", date.format("YYYY-MM-DD"), durationMinutes, (e) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    db.close(() => resolve());
                });
            });
        });
    }

    private getPersistedDurationsSinceYesterday(numDays: number): Promise<number> {
        return new Promise((resolve, reject) => {
            let config = Config.getInstance().get("scheduler");
            let filePath: string = path.join(process.cwd(), config.db);
            let db: Database = new Database(filePath, OPEN_READONLY, () => {
                let dates = [];
                for (let i = 1; i <= numDays; i++) {
                    let date = moment().subtract(i, "days");
                    dates.push(date.format("YYYY-MM-DD"));
                }
                db.all("SELECT * FROM schedule WHERE date IN (?)", dates, (e, rows) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    let total = 0;
                    if (rows) {
                        rows.forEach(row => {
                            total += row.minutes;
                        });
                    }
                    db.close(() => resolve(total));
                });
            });
        });
    }

    private getPersistedDuration(date: moment.Moment): Promise<number> {
        return new Promise((resolve, reject) => {
            let config = Config.getInstance().get("scheduler");
            let filePath: string = path.join(process.cwd(), config.db);
            let db: Database = new Database(filePath, OPEN_READONLY, () => {
                db.get("SELECT * FROM schedule WHERE date = ?", date.format("YYYY-MM-DD"), (e, row) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    db.close(() => resolve(row ? row.minutes: undefined));
                });
            });
        });
    }
}

export class TimePeriodInternal {
    start: moment.Moment;
    hours: number;
}
