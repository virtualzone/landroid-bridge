import * as moment from 'moment';

export class LandroidDataset {
    language: string;
    dateTime: moment.Moment;
    macAddress: string;
    firmware: string;
    wifiQuality: number;
    active: boolean;
    rainDelay: boolean;
    timeExtension: number;
    serialNumber: string;
    totalTime: number;
    totalDistance: number;
    totalBladeTime: number;
    batteryChargeCycle: number;
    batteryCharging: boolean;
    batteryVoltage: number;
    batteryTemperature: number;
    batteryLevel: number;
    errorCode: number;
    errorDescription: string;
    statusCode: number;
    statusDescription: string;

    constructor(readings: any) {
        if (readings) {
            if (readings["cfg"]) {
                this.language = readings["cfg"]["lg"];
                this.dateTime = moment(readings["cfg"]["dt"] + " " + readings["cfg"]["tm"], "DD/MM/YYYY HH:mm:ss");
                this.rainDelay = readings["cfg"]["rd"];
                this.serialNumber = readings["cfg"]["sn"];
                if (readings["cfg"]["sc"]) {
                    this.active = (readings["cfg"]["sc"]["m"] ? true : false);
                    this.timeExtension = Number(readings["cfg"]["sc"]["p"]).valueOf();
                }
            }
            if (readings["dat"]) {
                if (readings["dat"]["st"]) {
                    this.totalTime = Number(readings["dat"]["st"]["wt"]).valueOf();
                    this.totalDistance = Number(readings["dat"]["st"]["d"]).valueOf();
                    this.totalBladeTime = Number(readings["dat"]["st"]["b"]).valueOf();
                }
                if (readings["dat"]["bt"]) {
                    this.batteryChargeCycle = Number(readings["dat"]["bt"]["nr"]).valueOf();
                    this.batteryCharging = (readings["dat"]["bt"]["c"] ? true : false);
                    this.batteryVoltage = Number(readings["dat"]["bt"]["v"]).valueOf();
                    this.batteryTemperature = Number(readings["dat"]["bt"]["t"]).valueOf();
                    this.batteryLevel = Number(readings["dat"]["bt"]["p"]).valueOf();
                }
                this.macAddress = readings["dat"]["mac"];
                this.firmware = readings["dat"]["fw"];
                this.wifiQuality = Number(readings["dat"]["rsi"]).valueOf();
                this.statusCode = Number(readings["dat"]["ls"]).valueOf();
                this.statusDescription = LandroidDataset.STATUS_CODES[this.statusCode];
                this.errorCode = Number(readings["dat"]["le"]).valueOf();
                this.errorDescription = LandroidDataset.ERROR_CODES[this.errorCode];
            }
        }
    }

    public serialize(): any {
        return {
            language: this.language,
            dateTime: this.dateTime.format("YYYY-MM-DD HH:mm:ss"),
            macAddress: this.macAddress,
            firmware: this.firmware,
            wifiQuality: this.wifiQuality,
            active: this.active,
            rainDelay: this.rainDelay,
            timeExtension: this.timeExtension,
            serialNumber: this.serialNumber,
            totalTime: this.totalTime,
            totalDistance: this.totalDistance,
            totalBladeTime: this.totalBladeTime,
            batteryChargeCycle: this.batteryChargeCycle,
            batteryCharging: this.batteryCharging,
            batteryVoltage: this.batteryVoltage,
            batteryTemperature: this.batteryTemperature,
            batteryLevel: this.batteryLevel,
            errorCode: this.errorCode,
            errorDescription: this.errorDescription,
            statusCode: this.statusCode,
            statusDescription: this.statusDescription
        };
    }

    public static STATUS_CODES = {
        0: "Idle",
        1: "Home",
        2: "Start sequence",
        3: "Leaving home",
        4: "Follow wire",
        5: "Searching home",
        6: "Searching wire",
        7: "Mowing",
        8: "Lifted",
        9: "Trapped",
        10: "Blade blocked",
        11: "Debug",
        12: "Remote control"
    };

    public static ERROR_CODES = {
        0: "No error",
        1: "Trapped",
        2: "Lifted",
        3: "Wire missing",
        4: "Outside wire",
        5: "Raining",
        6: "Close door to mow",
        7: "Close door to go home",
        8: "Blade motor blocked",
        9: "Wheel motor blocked",
        10: "Trapped timeout",
        11: "Upside down",
        12: "Battery low",
        13: "Reverse wire",
        14: "Charge error",
        15: "Timeout finding home"
    };
}
