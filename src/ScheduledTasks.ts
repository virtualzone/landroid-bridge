import { CronJob } from "cron";
import { Config } from "./Config";
import { Scheduler } from "./Scheduler";
import { WeatherFactory } from "./WeatherFactory";

export class ScheduledTasks {
    private static SCHEDULED: boolean = false;

    public static init(): void {
        if (ScheduledTasks.SCHEDULED) {
            throw new Error("Scheduled tasks have already been initialized - can only be called once.");
        }
        console.log("Initializing scheduled tasks...");
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
            console.error(e);
        }
    }

    private static async applySchedule(): Promise<void> {
        console.log("Running ScheduledTasks.applySchedule...");
        await new Scheduler().applySchedule();
        console.log("Finished ScheduledTasks.applySchedule.");
    }

    private static async fetchWeatherData(): Promise<void> {
        let error: boolean = true;
        for (let i = 1; i <= 5 && error; i++) {
            try {
                console.log("Refreshing weather to cache (try #%d)...", i);
                await WeatherFactory.getProvider().loadHourly10day(true, true);
                console.log("Successfully refreshed weather cache");
                error = false;
            } catch (e) {
                error = true;
            }
        }
    }
}
