import * as mocha from 'mocha';
import * as chai from 'chai';
import * as moment from 'moment';
import { Scheduler } from '../src/Scheduler';
import { WeatherDataset } from '../src/Weather';
import { Moment } from 'moment';

const expect = chai.expect;

describe("Scheduler", () => {
    describe("getLongestSequenceBelowPrecipitationThreshold()", () => {
        it("should return the full range for no precipitation", () => {
            let start: moment.Moment = moment("2018-03-31 09:00:00");
            let forecast: WeatherDataset[] = [
                WeatherDataset.fromValues(start.clone().add(0, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(1, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(2, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(3, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(4, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(5, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(6, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(7, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(8, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(9, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(10, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(11, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(12, "hours"), 21, 0)
            ];
            let result = Scheduler.getLongestSequenceBelowPrecipitationThreshold(forecast, 40);
            expect(result).to.be.not.undefined;
            expect(result).to.be.not.null;
            expect(result.start.isSame("2018-03-31 09:00:00")).to.be.true;
            expect(result.hours).to.equal(13);
        });

        it("should return the correct range for non-continuous precipitation", () => {
            let start: moment.Moment = moment("2018-03-31 09:00:00");
            let forecast: WeatherDataset[] = [
                WeatherDataset.fromValues(start.clone().add(0, "hours"), 21, 100),
                WeatherDataset.fromValues(start.clone().add(1, "hours"), 21, 90),
                WeatherDataset.fromValues(start.clone().add(2, "hours"), 21, 80),
                WeatherDataset.fromValues(start.clone().add(3, "hours"), 21, 20),
                WeatherDataset.fromValues(start.clone().add(4, "hours"), 21, 10),
                WeatherDataset.fromValues(start.clone().add(5, "hours"), 21, 10),
                WeatherDataset.fromValues(start.clone().add(6, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(7, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(8, "hours"), 21, 40),
                WeatherDataset.fromValues(start.clone().add(9, "hours"), 21, 100),
                WeatherDataset.fromValues(start.clone().add(10, "hours"), 21, 40),
                WeatherDataset.fromValues(start.clone().add(11, "hours"), 21, 50),
                WeatherDataset.fromValues(start.clone().add(12, "hours"), 21, 50)
            ];
            let result = Scheduler.getLongestSequenceBelowPrecipitationThreshold(forecast, 40);
            expect(result).to.be.not.undefined;
            expect(result).to.be.not.null;
            expect(result.start.isSame("2018-03-31 12:00:00")).to.be.true;
            expect(result.hours).to.equal(5);
        });

        it("should return the correct range for two ranges", () => {
            let start: moment.Moment = moment("2018-03-31 09:00:00");
            let forecast: WeatherDataset[] = [
                WeatherDataset.fromValues(start.clone().add(0, "hours"), 21, 50),
                WeatherDataset.fromValues(start.clone().add(1, "hours"), 21, 50),
                WeatherDataset.fromValues(start.clone().add(2, "hours"), 21, 10),
                WeatherDataset.fromValues(start.clone().add(3, "hours"), 21, 20),
                WeatherDataset.fromValues(start.clone().add(4, "hours"), 21, 90),
                WeatherDataset.fromValues(start.clone().add(5, "hours"), 21, 80),
                WeatherDataset.fromValues(start.clone().add(6, "hours"), 21, 100),
                WeatherDataset.fromValues(start.clone().add(7, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(8, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(9, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(10, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(11, "hours"), 21, 0),
                WeatherDataset.fromValues(start.clone().add(12, "hours"), 21, 100)
            ];
            let result = Scheduler.getLongestSequenceBelowPrecipitationThreshold(forecast, 40);
            expect(result).to.be.not.undefined;
            expect(result).to.be.not.null;
            expect(result.start.isSame("2018-03-31 16:00:00")).to.be.true;
            expect(result.hours).to.equal(5);
        });
    });
});
