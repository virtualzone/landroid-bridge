import * as http from 'http';
import * as debug from 'debug';
import { App } from './App';
import { Config } from './Config';
import { getLogger, Logger, configure as configureLog4js } from "log4js";

configureLog4js({
    appenders: {
        out: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ["out"], level: "debug" }
    }
});
const log: Logger = getLogger("server.ts");

log.info("Starting Landroid Bridge...");

debug('ts-express:server');

const port = normalizePort(process.env.PORT || Config.getInstance().get("http").port || 3000);

log.info("Setting port to %d...", port);
App.getInstance().express.set('port', port);
App.getInstance().start();

const server = http.createServer(App.getInstance().express);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
App.getInstance().server = server;

function normalizePort(val: number|string): number|string|boolean {
    let port: number = (typeof val === 'string') ? parseInt(val, 10) : val;
    if (isNaN(port)) {
        return val;
    } else if (port >= 0) {
        return port;
    } else {
        return false;
    }
}

function onError(error: NodeJS.ErrnoException): void {
    if (error.syscall !== 'listen') {
        throw error;
    }
    let bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port;
    switch(error.code) {
        case 'EACCES':
            log.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            log.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening(): void {
    let addr = server.address();
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
}
