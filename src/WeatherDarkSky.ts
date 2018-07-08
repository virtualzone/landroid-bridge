import * as https from 'https';
import * as moment from 'moment';
import * as fs from "fs";
import * as path from 'path';
import { Config } from './Config';
import { WeatherProvider, WeatherDataset } from "./WeatherProvider";

export class WeatherDarkSky extends WeatherProvider {
    public loadCurrent(forceCacheRenewal?: boolean): Promise<WeatherDataset> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.darksky.net/forecast/" +
            config.apiKey + "/" +
            config.latitude + "," +
            config.longitude + "?" +
            "units=si";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.currently) {
                reject(new Error("Invalid JSON response from api.darksky.net"));
                return;
            }
            let result = DarkSkyWeatherDataset.fromDarkSky(json.currently);
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
                            reject(new Error("Got invalid status code from api.darksky.net"));
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
        let startDateTime = moment().hour(0).minute(0);
        let url = "https://api.darksky.net/forecast/" +
            config.apiKey + "/" +
            config.latitude + "," +
            config.longitude + "," +
            startDateTime.unix() + "?" +
            "units=si";
            let onLoaded = function(rawData: string, resolve, reject) {
                let json = JSON.parse(rawData);
                if (!json || !json.hourly || !json.hourly.data) {
                    reject(new Error("Invalid JSON response from api.darksky.net"));
                    return;
                }
                let now = moment();
                let result = json.hourly.data.map(entry => DarkSkyWeatherDataset.fromDarkSky(entry));
                let finalResult = [];
                result.forEach(entry => {
                    if (entry.dateTime.isBefore(now, "hours")) {
                        finalResult.push(entry);
                    }
                });
                resolve(finalResult);
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
                                reject(new Error("Got invalid status code from api.darksky.net"));
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
        let url = "https://api.darksky.net/forecast/" +
            config.apiKey + "/" +
            config.latitude + "," +
            config.longitude + "?" +
            "units=si";
        let onLoaded = function(rawData: string, resolve, reject) {
            let json = JSON.parse(rawData);
            if (!json || !json.hourly || !json.hourly.data || !json.daily || !json.daily.data) {
                reject(new Error("Invalid JSON response from api.darksky.net"));
                return;
            }
            if (json.hourly.data.length < 48) {
                reject(new Error("Too few entries in hourly forecast"));
                return;
            }
            if (json.daily.data.length < 7) {
                reject(new Error("Too few entries in daily forecast"));
                return;
            }
            let hourly = json.hourly.data.map(entry => DarkSkyWeatherDataset.fromDarkSky(entry));
            let daily = json.daily.data.map(entry => DarkSkyWeatherDataset.fromDarkSky(entry));
            if (includeTodayHistory) {
                this.loadHistory(undefined, forceCacheRenewal).then(history => {
                    this.loadCurrent(forceCacheRenewal).then(currentConditions => {
                        let finalResult = [];
                        // Prepend historic conditions
                        finalResult = finalResult.concat(history);
                        // Add current conditions
                        finalResult.push(currentConditions.clone());
                        // Remove first entry from hourly forecast if hour is equal
                        if (hourly[0].dateTime.isSame(currentConditions.dateTime, "hour")) {
                            hourly = hourly.slice(1);
                        }
                        finalResult = finalResult.concat(hourly.map(entry => entry.clone()));
                        // Append daily forecasts
                        let nextDateTime = hourly[hourly.length - 1].dateTime.clone();
                        let endDateTime = moment().add(7, "days").hour(23);
                        do {
                            nextDateTime = nextDateTime.clone().add(1, "hours");
                            daily.forEach(entry => {
                                if (entry.dateTime.isSame(nextDateTime, "days")) {
                                    let newEntry = entry.clone();
                                    newEntry.dateTime = nextDateTime.clone();
                                    finalResult.push(newEntry);
                                }
                            });
                        } while (!nextDateTime.isSame(endDateTime, "hours"));
                        resolve(finalResult);
                    }).catch(e => reject(e));
                }).catch(e => reject(e));
            } else {
                let finalResult = [];
                // TODO
                resolve(finalResult);
            }
        };
        return new Promise((resolve, reject) => {
            if (WeatherProvider.USE_FILES) {
                let filePath: string = path.join(process.cwd(), "./test/forecast.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded.call(this, rawData, resolve, reject);
            } else {
                let rawData = WeatherProvider.CACHE.get("forecast");
                if (rawData && !forceCacheRenewal) {
                    onLoaded.call(this, rawData, resolve, reject);
                } else {
                    console.log("Loading from %s", url);
                    https.get(url, (res) => {
                        if (!res || res.statusCode !== 200) {
                            reject(new Error("Got invalid status code from api.darksky.net"));
                            return;
                        }
                        rawData = "";
                        res.on("error", e => console.error("HTTP error: %s", e));
                        res.on("data", (chunk) => rawData += chunk);
                        res.on("end", () => {
                            WeatherProvider.CACHE.put("forecast", rawData);
                            onLoaded.call(this, rawData, resolve, reject);
                        });
                    });
                }
            }
        });
    }
}

export class DarkSkyWeatherDataset extends WeatherDataset {
    public static fromDarkSky(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        dataset.dateTime = moment.unix(data.time);
        if (data.temperature) {
            dataset.temperature = parseInt(data.temperature, 10);
        } else {
            dataset.temperature = parseInt(data.temperatureHigh, 10);
        }
        let precipitation = parseFloat(data.precipProbability);
        dataset.precipitation = Math.ceil(precipitation * 100);
        return dataset;
    }
}
