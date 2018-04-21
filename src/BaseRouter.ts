import { Router, Response, Request, NextFunction, RequestHandler } from 'express';

export abstract class BaseRouter {
    router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    protected ok(res: Response): void {
        res.status(200).send({
            message: "Operation successful",
            status: res.status
        });
    }

    protected notFound(res: Response): void {
        res.status(404).send({
            message: "Object not found",
            status: res.status
        });
    }

    protected forbidden(res: Response): void {
        res.status(403).send({
            message: "Forbidden",
            status: res.status
        });
    }

    protected badRequest(res: Response, message?: string, errorCode?: number): void {
        res.status(400).send({
            message: (message ? message : "Bad Request"),
            status: res.status,
            errorCode: (errorCode ? errorCode : 0)
        });
    }

    protected internalServerError(res: Response): void {
        res.status(500).send({
            message: "Internal Server Error",
            status: res.status
        });
    }

    protected abstract init(): void;
}
