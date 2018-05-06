import * as https from 'https';
import * as moment from 'moment';
import * as fs from "fs";
import * as path from 'path';
import { Config } from './Config';
import { App } from './App';

export class Weather {
    public static loadCurrent(): Promise<WeatherDataset> {
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
            //console.log(JSON.stringify(json) + "\n\n");
            if (!json || !json.response || !json.current_observation) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            let result = WeatherDataset.fromWundergroundCurrent(json.current_observation);
            resolve(result);
        };
        return new Promise((resolve, reject) => {
            if (App.getInstance().devEnvironment) {
                let filePath: string = path.join(process.cwd(), "./test/current.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                https.get(url, (res) => {
                    if (!res || res.statusCode !== 200) {
                        reject(new Error("Got invalid status code from api.wunderground.com"));
                        return;
                    }
                    let rawData = "";
                    res.on("data", (chunk) => rawData += chunk);
                    res.on("end", () => onLoaded(rawData, resolve, reject));
                });
            }
        });
    }

    public static loadHistory(dayOffset?: number): Promise<WeatherDataset[]> {
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
            //console.log(JSON.stringify(json) + "\n\n");
            if (!json || !json.response || !json.history || !json.history.observations) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            let result = json.history.observations.map(entry => WeatherDataset.fromWundergroundHistory(entry));
            resolve(result);
        };
        return new Promise((resolve, reject) => {
            if (App.getInstance().devEnvironment) {
                let filePath: string = path.join(process.cwd(), "./test/history.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                https.get(url, (res) => {
                    if (!res || res.statusCode !== 200) {
                        reject(new Error("Got invalid status code from api.wunderground.com"));
                        return;
                    }
                    let rawData = "";
                    res.on("data", (chunk) => rawData += chunk);
                    res.on("end", () => onLoaded(rawData, resolve, reject));
                });
            }
        });
    }

    public static loadHourly10day(includeTodayHistory?: boolean): Promise<WeatherDataset[]> {
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
            //console.log(JSON.stringify(json) + "\n\n");
            if (!json || !json.response || !json.hourly_forecast) {
                reject(new Error("Invalid JSON response from api.wunderground.com"));
                return;
            }
            let result = json.hourly_forecast.map(entry => WeatherDataset.fromWundergroundForecast(entry));
            if (includeTodayHistory) {
                Weather.loadHistory().then(history => {
                    Weather.loadCurrent().then(currentConditions => {
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
                        let diffHour = Math.abs(firstForecastHour - lastHistoryHour);
                        for (let i = 1; i < diffHour; i++) {
                            let currentConditionsCloned = currentConditions.clone();
                            currentConditionsCloned.dateTime = lastHistoryMoment.clone();
                            currentConditionsCloned.dateTime.add(i, "hours");
                            finalResult.push(currentConditionsCloned);
                        }
                        finalResult = finalResult.concat(result);
                        resolve(finalResult);
                    }).catch(e => reject(e));
                }).catch(e => reject(e));
            } else {
                resolve(result);
            }
        };
        return new Promise((resolve, reject) => {
            if (App.getInstance().devEnvironment) {
                let filePath: string = path.join(process.cwd(), "./test/forecast.json");
                let rawData: string = fs.readFileSync(filePath, "utf8");
                onLoaded(rawData, resolve, reject);
            } else {
                https.get(url, (res) => {
                    if (!res || res.statusCode !== 200) {
                        reject(new Error("Got invalid status code from api.wunderground.com"));
                        return;
                    }
                    let rawData = "";
                    res.on("data", (chunk) => rawData += chunk);
                    res.on("end", () => onLoaded(rawData, resolve, reject));
                });
            }
        });
    }
}

export class WeatherDataset {
    dateTime: moment.Moment;
    temperature: number;
    precipitation: number;

    public static fromWundergroundCurrent(data): WeatherDataset {
        let dataset: WeatherDataset = new WeatherDataset();
        let now: moment.Moment = moment().hour(0).minute(0).second(0);
        dataset.dateTime = moment()
            .year(now.year())
            .month(now.month())
            .date(now.date())
            .hour(now.hour())
            .minute(now.minute())
            .second(0);
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
