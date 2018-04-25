import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";
import { Scheduler } from "./Scheduler";

class SchedulerRouter extends BaseRouter {
    protected init(): void {
        this.router.get("/next7day", this.getNext7Days.bind(this));
    }

    private getNext7Days(req: Request, res: Response, next: NextFunction): void {
        Scheduler.getNext7Days().then(result => {
            let serialized = result.map(dataset => dataset.serialize());
            res.status(200).send(serialized);
        }).catch(e => this.internalServerError(res));
    }
}

export default new SchedulerRouter().router;
