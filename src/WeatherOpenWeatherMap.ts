import * as https from 'https';
import * as moment from 'moment';
import * as fs from "fs";
import * as path from 'path';
import { Config } from './Config';
import { WeatherProvider, WeatherDataset } from "./WeatherProvider";

export class WeatherOpenWeatherMap extends WeatherProvider {
    public loadCurrent(forceCacheRenewal?: boolean): Promise<WeatherDataset> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.openweathermap.org/data/2.5/weather?" +
            "lat=" + config.latitude + "&" +
            "lon=" + config.longitude + "&" +
            "appid=" + config.apiKey + "&" +
            "units=metric";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.main) {
                reject(new Error("Invalid JSON response from api.openweathermap.org"));
                return;
            }
            let result = OwmWeatherDataset.fromOwmCurrent(json);
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
                            reject(new Error("Got invalid status code from api.openweathermap.org"));
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
        return new Promise((resolve, reject) => {
            // Historic weather data is not supported in free OWM API
            resolve([]);
        });
    }
    public loadHourly10day(includeTodayHistory?: boolean, forceCacheRenewal?: boolean): Promise<WeatherDataset[]> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.openweathermap.org/data/2.5/forecast?" +
            "lat=" + config.latitude + "&" +
            "lon=" + config.longitude + "&" +
            "appid=" + config.apiKey + "&" +
            "units=metric";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.list) {
                reject(new Error("Invalid JSON response from api.openweathermap.org"));
                return;
            }
            if (json.list.length < 3 * 5) {
                reject(new Error("Too few entries in hourly forecast"));
                return;
            }
            let result = json.list.map(entry => OwmWeatherDataset.fromOwmForecast(entry));
            if (includeTodayHistory) {
                this.loadCurrent(forceCacheRenewal).then(currentConditions => {
                    let finalResult = [];
                    for (let i = 1; i < 2; i++) {
                        let currentConditionsCloned = currentConditions.clone();
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
                            reject(new Error("Got invalid status code from api.openweathermap.org"));
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

export class OwmWeatherDataset extends WeatherDataset {
    public static fromOwmCurrent(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        let conditionsCode = parseInt(data.weather.id, 10);
        dataset.dateTime = moment.unix(data.dt);
        dataset.temperature = parseInt(data.main.temp, 10);
        dataset.precipitation = (conditionsCode >= 200 && conditionsCode <= 699 ? 100 : 0);
        return dataset;
    }

    public static fromOwmForecast(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        dataset.dateTime = moment.unix(data.dt);
        dataset.temperature = parseInt(data.main.temp, 10);
        if (data.rain && data.rain["3h"]) {
            let mm: number = parseFloat(data.rain["3h"]);
            dataset.precipitation = (mm > 0.0 ? 50 : 0);
        } else {
            dataset.precipitation = 0;
        }
        return dataset;
    }
}
