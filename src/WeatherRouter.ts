import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";
import { Weather } from "./Weather";

class WeatherRouter extends BaseRouter {
    protected init(): void {
        this.router.get("/hourly10day", this.getHourly10DayForcast.bind(this));
    }

    private getHourly10DayForcast(req: Request, res: Response, next: NextFunction): void {
        Weather.loadHourly10day(true).then(result => {
            let serialized = result.map(dataset => dataset.serialize());
            res.status(200).send(serialized);
        }).catch(e => this.internalServerError(res));
    }
}

export default new WeatherRouter().router;
