import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";
import { Scheduler } from "./Scheduler";
import { Config } from "./Config";

class SchedulerRouter extends BaseRouter {
    protected init(): void {
        this.router.get("/next7day", this.getNext7Days.bind(this));
        this.router.get("/config", this.getConfig.bind(this));
        this.router.post("/apply", this.applySchedule.bind(this));
    }

    private applySchedule(req: Request, res: Response, next: NextFunction): void {
        new Scheduler().applySchedule().then(result => {
            let serialized = new Object();
            Object.keys(result).forEach(key => serialized[key] = result[key].serialize());
            res.status(200).send(serialized);
        }).catch(e => {
            console.error(e);
            this.internalServerError(res);
        });
    }

    private getNext7Days(req: Request, res: Response, next: NextFunction): void {
        new Scheduler().getNext7Days().then(result => {
            let serialized = new Object();
            Object.keys(result).forEach(key => serialized[key] = result[key].serialize());
            res.status(200).send(serialized);
        }).catch(e => {
            console.error(e);
            this.internalServerError(res);
        });
    }

    private getConfig(req: Request, res: Response, next: NextFunction): void {
        let config = Object.assign({}, Config.getInstance().get("scheduler"));
        config.weather = Object.assign({}, config.weather);
        config.weather.apiKey = "xxxxxxx";
        res.status(200).send(config);
    }
}

export default new SchedulerRouter().router;
