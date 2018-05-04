(function() {
    "use strict";

    function setupTabs() {
        $("#nav-item-schedule > a").click(function() {
            $(".nav-link").removeClass("active");
            $("#nav-item-schedule > a").addClass("active");
            $("#container-schedule").show();
            $("#container-readings").hide();
            return false;
        });
        $("#nav-item-readings > a").click(function() {
            $(".nav-link").removeClass("active");
            $("#nav-item-readings > a").addClass("active");
            $("#container-schedule").hide();
            $("#container-readings").show();
            return false;
        });
    }

    function createScheduleRows() {
        for (var i=1; i<=7; i++) {
            var date = moment().add(i, "days");
            var dateFormatted = date.format("YYYY-MM-DD");
            var row = $(document.createElement("tr"));
            var col = $(document.createElement("th"));
            col.attr("scope", "row");
            col.text(dateFormatted);
            col.attr("style", "white-space:nowrap");
            row.append(col);
            row.attr("id", "scheduler-row-" + dateFormatted);
            for (var j=0; j<=23; j++) {
                col = $(document.createElement("td"));
                col.attr("id", "scheduler-cell-" + dateFormatted + "-" + j);
                row.append(col);
            }
            $("#container-schedule table > tbody").append(row);
        }
    }

    function loadIntelliSchedule() {
        $.get("./scheduler/next7day", function(data) {
            for (var i=1; i<=7; i++) {
                var date = moment().add(i, "days");
                var dateFormatted = date.format("YYYY-MM-DD");
                var startHour = data[i-1].startHour;
                var lastHour = startHour + Math.floor(data[i-1].durationMinutes / 60) - 1;
                for (var j=startHour; j<=lastHour; j++) {
                    var targetCell = $("#scheduler-cell-" + dateFormatted + "-" + j);
                    targetCell.css("background-color", "orange");
                }
            }
        });
    }

    function loadWeather() {
        $.get("./weather/hourly10day", function(data) {
            data.forEach(element => {
                var targetCell = $("#scheduler-cell-" + moment(element.dateTime).format("YYYY-MM-DD-H"));
                var precipitation = $(document.createElement("div"));
                precipitation.text(element.precipitation + "%");
                var temp = $(document.createElement("div"));
                temp.text(element.temperature + "°");
                targetCell.append(precipitation);
                targetCell.append(temp);
            });
        });
    }

    setupTabs();
    createScheduleRows();
    loadWeather();
    loadIntelliSchedule();
}());