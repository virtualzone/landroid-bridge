import { CronJob } from "cron";
import { Config } from "./Config";
import { Scheduler } from "./Scheduler";
import { WeatherFactory } from "./WeatherFactory";
import { getLogger, Logger } from "log4js";

export class ScheduledTasks {
    private static SCHEDULED: boolean = false;
    private static LOG: Logger;

    public static init(): void {
        if (ScheduledTasks.SCHEDULED) {
            throw new Error("Scheduled tasks have already been initialized - can only be called once.");
        }
        ScheduledTasks.LOG = getLogger("ScheduledTasks");
        ScheduledTasks.LOG.info("Initializing scheduled tasks...");
        ScheduledTasks.SCHEDULED = true;
        try {
            let config = Config.getInstance().get("scheduler");
            if (config && config.enable) {
                // Run every hour at *:10:00
                new CronJob("30 10 * * * *", ScheduledTasks.fetchWeatherData, undefined, undefined, undefined, undefined, true).start();
                if (config.cron) {
                    // Run every hour at *:15:00
                    new CronJob("0 15 * * * *", ScheduledTasks.applySchedule).start();
                }
            }
        } catch (e) {
            ScheduledTasks.LOG.error(e);
        }
    }

    private static async applySchedule(): Promise<void> {
        ScheduledTasks.LOG.info("Running ScheduledTasks.applySchedule...");
        await new Scheduler().applySchedule();
        ScheduledTasks.LOG.info("Finished ScheduledTasks.applySchedule.");
    }

    private static async fetchWeatherData(): Promise<void> {
        let error: boolean = true;
        for (let i = 1; i <= 5 && error; i++) {
            try {
                ScheduledTasks.LOG.info("Refreshing weather to cache (try #%d)...", i);
                await WeatherFactory.getProvider().loadHourly10day(true, true);
                ScheduledTasks.LOG.info("Successfully refreshed weather cache");
                error = false;
            } catch (e) {
                error = true;
            }
        }
    }
}
