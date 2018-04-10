import { BaseRouter } from "./BaseRouter";
import { Request, Response, NextFunction } from "express";

class LandroidSRouter extends BaseRouter {
    protected init(): void {
        this.router.get("/status", this.status.bind(this));
    }

    private status(req: Request, res: Response, next: NextFunction): void {
        this.ok(res);
    }
}

export default new LandroidSRouter().router;

