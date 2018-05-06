import { CronJob } from "cron";
import { Config } from "./Config";
import { Scheduler } from "./Scheduler";

export class ScheduledTasks {
    private static SCHEDULED: boolean = false;

    public static init(): void {
        if (ScheduledTasks.SCHEDULED) {
            throw new Error("Scheduled tasks have already been initialized - can only be called once.");
        }
        console.log("Initializing scheduled tasks...");
        ScheduledTasks.SCHEDULED = true;
        try {
            // Run cron every hour at *:15:00
            new CronJob("0 15 * * * *", ScheduledTasks.applySchedule).start();
        } catch (e) {
            console.error(e);
        }
    }

    private static async applySchedule(): Promise<void> {
        console.log("Running ScheduledTasks.applySchedule...");
        let config = Config.getInstance().get("scheduler");
        if (!config || !config.enable || !config.cron) {
            console.log("Skipping, scheduler is not enabled");
        } else {
            await new Scheduler().applySchedule();
        }
        console.log("Finished ScheduledTasks.applySchedule.");
    }
}
