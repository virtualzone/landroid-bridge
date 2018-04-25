import * as https from 'https';
import * as moment from 'moment';
import { Config } from './Config';

export class Weather {
    public static loadHourly10day(): Promise<WeatherDataset[]> {
        let config = Config.getInstance().get("scheduler").weather;
        let url = "https://api.wunderground.com/api/" +
            config.apiKey +
            "/hourly10day/q/" +
            config.latitude +
            "," +
            config.longitude +
            ".json";
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (!res || res.statusCode !== 200) {
                    reject(new Error("Got invalid status code from api.wunderground.com"));
                    return;
                }
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    let json = JSON.parse(rawData);
                    if (!json || !json.response || !json.hourly_forecast) {
                        reject(new Error("Invalid JSON response from api.wunderground.com"));
                        return;
                    }
                    let result = json.hourly_forecast.map(entry => WeatherDataset.fromWunderground(entry));
                    resolve(result);
                });
            });
        });
    }
}

export class WeatherDataset {
    dateTime: moment.Moment;
    temperature: number;
    precipitation: number;

    public static fromWunderground(data): WeatherDataset {
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

    public serialize(): any {
        return {
            dateTime: this.dateTime.format("YYYY-MM-DD HH:mm:ss"),
            temperature: this.temperature,
            precipitation: this.precipitation
        };
    }
}
