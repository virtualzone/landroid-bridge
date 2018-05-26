import * as https from 'https';
import * as moment from 'moment';
import * as fs from "fs";
import * as path from 'path';
import * as Cache from 'cache';
import { Config } from './Config';
import { App } from './App';
import { WeatherProvider, WeatherDataset } from './WeatherProvider';

export class WeatherWunderground extends WeatherProvider {
    public loadCurrent(forceCacheRenewal?: boolean): Promise<WeatherDataset> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.wunderground.com/api/" +
            config.apiKey +
            "/conditions/q/" +
            config.latitude +
            "," +
            config.longitude +
            ".json";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.response || !json.current_observation) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            let result = WundergroundWeatherDataset.fromWundergroundCurrent(json.current_observation);
            resolve(result);
        };
        return new Promise((resolve, reject) => {
            if (WeatherProvider.USE_FILES) {
                let filePath: string = path.join(process.cwd(), "./test/current.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                let rawData = WeatherProvider.CACHE.get("current");
                if (rawData && !forceCacheRenewal) {
                    onLoaded(rawData, resolve, reject);
                } else {
                    console.log("Loading from %s", url);
                    https.get(url, (res) => {
                        if (!res || res.statusCode !== 200) {
                            reject(new Error("Got invalid status code from api.wunderground.com"));
                            return;
                        }
                        rawData = "";
                        res.on("error", e => console.error("HTTP error: %s", e));
                        res.on("data", (chunk) => rawData += chunk);
                        res.on("end", () => {
                            WeatherProvider.CACHE.put("current", rawData);
                            onLoaded(rawData, resolve, reject);
                        });
                    });
                }
            }
        });
    }

    public loadHistory(dayOffset?: number, forceCacheRenewal?: boolean): Promise<WeatherDataset[]> {
        let config = Config.getInstance().get("scheduler").weather;
        let now: moment.Moment = moment().hour(0).minute(0).second(0);
        if (dayOffset) {
            now = now.subtract(dayOffset, "days");
        }
        let url = "https://api.wunderground.com/api/" +
            config.apiKey +
            "/history_" + now.format("YYYYMMDD") + "/q/" +
            config.latitude +
            "," +
            config.longitude +
            ".json";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.response || !json.history || !json.history.observations) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            let result = json.history.observations.map(entry => WundergroundWeatherDataset.fromWundergroundHistory(entry));
            resolve(result);
        };
        return new Promise((resolve, reject) => {
            if (WeatherProvider.USE_FILES) {
                let filePath: string = path.join(process.cwd(), "./test/history.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                let rawData = WeatherProvider.CACHE.get("history");
                if (rawData && !forceCacheRenewal) {
                    onLoaded(rawData, resolve, reject);
                } else {
                    console.log("Loading from %s", url);
                    https.get(url, (res) => {
                        if (!res || res.statusCode !== 200) {
                            reject(new Error("Got invalid status code from api.wunderground.com"));
                            return;
                        }
                        rawData = "";
                        res.on("error", e => console.error("HTTP error: %s", e));
                        res.on("data", (chunk) => rawData += chunk);
                        res.on("end", () => {
                            WeatherProvider.CACHE.put("history", rawData);
                            onLoaded(rawData, resolve, reject);
                        });
                    });
                }
            }
        });
    }

    public loadHourly10day(includeTodayHistory?: boolean, forceCacheRenewal?: boolean): Promise<WeatherDataset[]> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.wunderground.com/api/" +
            config.apiKey +
            "/hourly10day/q/" +
            config.latitude +
            "," +
            config.longitude +
            ".json";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.response || !json.hourly_forecast) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            if (json.hourly_forecast.length < 9 * 24) {
                reject(new Error("Too few entries in hourly forecast"));
                return;
            }
            let result = json.hourly_forecast.map(entry => WundergroundWeatherDataset.fromWundergroundForecast(entry));
            if (includeTodayHistory) {
                this.loadHistory(undefined, forceCacheRenewal).then(history => {
                    this.loadCurrent(forceCacheRenewal).then(currentConditions => {
                        let finalResult = history;
                        let lastHistoryHour: number = 0;
                        let lastHistoryMoment: moment.Moment = moment();
                        let firstForecastHour: number = 0;
                        if (history.length > 0) {
                            lastHistoryHour = history[history.length-1].dateTime.hour();
                            lastHistoryMoment = history[history.length-1].dateTime;
                        }
                        if (result.length > 0) {
                            firstForecastHour = result[0].dateTime.hour();
                        }
                        let diffHour = firstForecastHour - lastHistoryHour;
                        if (diffHour < 0) {
                            diffHour += 24;
                        }
                        for (let i = 1; i < diffHour; i++) {
                            let currentConditionsCloned = currentConditions.clone();
                            currentConditionsCloned.dateTime = lastHistoryMoment.clone();
                            currentConditionsCloned.dateTime.add(i, "hours");
                            finalResult.push(currentConditionsCloned);
                        }
                        // If last historic entry is same hour as current conditions, use current conditions
                        if (finalResult.length > 0) {
                            if (finalResult[finalResult.length - 1].dateTime.isSame(currentConditions.dateTime, "hour")) {
                                finalResult[finalResult.length - 1] = currentConditions;
                            }
                        }
                        // If first forecast entry is same hour as current conditions, use current conditions
                        if (result.length > 0) {
                            if (result[0].dateTime.isSame(currentConditions.dateTime, "hour")) {
                                result[0] = currentConditions;
                            }
                        }
                        // Build final array
                        finalResult = finalResult.concat(result);
                        // Remove duplicate hour calues
                        this.removeDuplicateHourValues(finalResult);
                        resolve(finalResult);
                    }).catch(e => reject(e));
                }).catch(e => reject(e));
            } else {
                resolve(result);
            }
        };
        return new Promise((resolve, reject) => {
            if (WeatherProvider.USE_FILES) {
                let filePath: string = path.join(process.cwd(), "./test/forecast.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                let rawData = WeatherProvider.CACHE.get("forecast");
                if (rawData && !forceCacheRenewal) {
                    onLoaded(rawData, resolve, reject);
                } else {
                    console.log("Loading from %s", url);
                    https.get(url, (res) => {
                        if (!res || res.statusCode !== 200) {
                            reject(new Error("Got invalid status code from api.wunderground.com"));
                            return;
                        }
                        rawData = "";
                        res.on("error", e => console.error("HTTP error: %s", e));
                        res.on("data", (chunk) => rawData += chunk);
                        res.on("end", () => {
                            WeatherProvider.CACHE.put("forecast", rawData);
                            onLoaded(rawData, resolve, reject);
                        });
                    });
                }
            }
        });
    }
}

export class WundergroundWeatherDataset extends WeatherDataset {
    public static fromWundergroundCurrent(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        dataset.dateTime = moment.unix(data.observation_epoch);
        dataset.temperature = parseInt(data.temp_c, 10);
        dataset.precipitation = (data.precip_1hr_metric.trim() !== "0" ? 100 : 0);
        return dataset;
    }

    public static fromWundergroundHistory(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        dataset.dateTime = moment()
            .year(data.date.year)
            .month(parseInt(data.date.mon, 10) - 1)
            .date(data.date.mday)
            .hour(data.date.hour)
            .minute(data.date.min)
            .second(0);
        dataset.temperature = parseInt(data.tempm, 10);
        dataset.precipitation = (data.rain !== "0" ? 100 : 0);
        return dataset;
    }

    public static fromWundergroundForecast(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        dataset.dateTime = moment()
            .year(data.FCTTIME.year)
            .month(parseInt(data.FCTTIME.mon, 10) - 1)
            .date(data.FCTTIME.mday)
            .hour(data.FCTTIME.hour)
            .minute(data.FCTTIME.min)
            .second(0);
        dataset.temperature = parseInt(data.temp.metric, 10);
        dataset.precipitation = parseInt(data.pop, 10);
        return dataset;
    }
}
