import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";
import { LandroidDataset } from "./LandroidDataset";
import { LandroidS } from "./LandroidS";

class LandroidSRouter extends BaseRouter {
    protected init(): void {
        this.router.get("/status", this.status.bind(this));
    }

    private status(req: Request, res: Response, next: NextFunction): void {
        let latestUpdate: LandroidDataset = LandroidS.getInstance().getLatestUpdate();
        if (latestUpdate) {
            res.status(200).send(latestUpdate.serialize());
        } else {
            this.internalServerError(res);
        }
    }
}

export default new LandroidSRouter().router;

