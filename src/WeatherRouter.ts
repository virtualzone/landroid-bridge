import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";
import { WeatherFactory } from "./WeatherFactory";
import { getLogger, Logger } from "log4js";

class WeatherRouter extends BaseRouter {
    private log: Logger;

    constructor() {
        super();
        this.log = getLogger(this.constructor.name);
    }

    protected init(): void {
        this.router.get("/hourly10day", this.getHourly10DayForcast.bind(this));
    }

    private getHourly10DayForcast(req: Request, res: Response, next: NextFunction): void {
        WeatherFactory.getProvider().loadHourly10day(true).then(result => {
            let serialized = result.map(dataset => dataset.serialize());
            res.status(200).send(serialized);
        }).catch(e => {
            this.log.error(e);
            this.internalServerError(res);
        });
    }
}

export default new WeatherRouter().router;
