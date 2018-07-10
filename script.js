let MAP;
let source_click = false;
let dest_click = false;
let source;
let dest;

let latA = -1;
let lngA = -1;
let latB = -1;
let lngB = -1;

let stop = '';
let route = 'red';
let select_wait = 1;

let colors = {
    "red" : "red",
    "blue" : "blue",
    "green" : "green",
    "trolley" : "orange",
    "night" : "black",
    "tech" : "orange"
}

$(document).ready(function() {
    drawMap();
});

function drawMap() {
    MAP = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: {lat: 33.77563369813674, lng: -84.39628601074219}
    });

    google.maps.event.addListener(MAP, 'click', function(event) {
        placeMarker(event.latLng, MAP);
    });
}

async function drawRoute(routeName, color, points) {
    route = routeName;
    $.getJSON("routes.json", (d) => {

        let route = d.route.filter((row) => {
            return row.tag === routeName;
        })[0];

        let gt = {
            lat: (parseFloat(route.latMax) + parseFloat(route.latMin))/2,
            lng: (parseFloat(route.lonMax) + parseFloat(route.lonMin))/2
        };

        MAP = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: gt
        });

        for (let i = 0; i < points.length; i++) {
            points[i].setMap(MAP);
        }

        google.maps.event.addListener(MAP, 'click', function(event) {
            placeMarker(event.latLng, MAP);
        });
 

        path = route.path;
        path.forEach((row) => {
            let coords = [];
            row.forEach(point => {
                coords.push({
                    lat: parseFloat(point.lat),
                    lng: parseFloat(point.lon)
                });
            })
            let route = new google.maps.Polyline({
                path: coords,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            route.setMap(MAP);
        });

        stops = route.stop;
        stops.forEach(s => {
            var pos = {lat: parseFloat(s.lat), lng: parseFloat(s.lon)};
            let mark = new google.maps.Circle({
                center: pos,
                radius: 20,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: MAP,
            });

            mark.addListener('click', function() {
                if (stop === "" || stop !== s.tag) {
                    stop = s.tag;
                    this.setOptions({fillColor: "#00FF00"});
                    drawWait(select_wait);
                } else {
                    stop = "";
                    $("#average-wait").html('');
                    this.setOptions({fillColor: "#FF0000"});
                }
            });

            google.maps.event.addListener(mark, "mouseover", function(){
                this.setOptions({fillColor: "#00FF00"});
                $("#stop-name").text(s.title);
            }); 

            google.maps.event.addListener(mark, "mouseout", function(){
                if (stop === "" || stop !== s.tag) {
                    this.setOptions({fillColor: "#FF0000"});
                    $("#stop-name").text('');
                }
            });
        }); 
    });
}

function placeMarker(location, map) {
    if (source_click) {
        $("#start-select").css("background-color", "#f2f1f0");
        $("#start").val(location.lat() + "," + location.lng());
        latA = location.lat();
        lngA = location.lng();
        if (source) {
            source.setMap(null);
        }
        source = new google.maps.Marker({
            position: location, 
            label: "A",
            map: MAP
        });
        source_click = !source_click;
    } else if (dest_click) {
        $("#dest-select").css("background-color", "#f2f1f0");
        $("#dest").val(location.lat() + "," + location.lng());
        latB = location.lat();
        lngB = location.lng();
        if (dest) {
            dest.setMap(null);
        }
        dest = new google.maps.Marker({
            position: location, 
            label: "B",
            map: MAP
        });
        dest_click = !dest_click;
    }
 }

 /* JQUERY BINDS */

$("#route-select").change(async function()  {
    let vals = this.value.split(" ");
    $("#average-wait").html('');
    route = '';
    await drawRoute(vals[0], vals[1], []);
    drawCrowdedness(vals[0]);
});

$("#start-select").click(() => {
    if (!source_click) {
        dest_click = false;
        $("#dest-select").css("background-color", "#f2f1f0");
        $("#start-select").css("background-color", "#eaaa00");
    } else {
        $("#start-select").css("background-color", "#f2f1f0");
    }
    source_click = !source_click;
})

$("#dest-select").click(() => {
    if (!dest_click) {
        source_click = false;
        $("#start-select").css("background-color", "#f2f1f0");
        $("#dest-select").css("background-color", "#eaaa00");
    } else {
        $("#dest-select").css("background-color", "#f2f1f0");
    }
    dest_click = !dest_click;
})

$("#statistics-click").click(async function () {
    await drawRoute("red", "red", []);
    drawCrowdedness('red');
    $("#routing").addClass("hidden");
    $("#graphs").removeClass("hidden");
})

$("#plan-click").click(() => {
    drawMap();
    $("#graphs").addClass("hidden");
    $("#routing").removeClass("hidden");
})

$("#clear").click(() => {
    dest_click = false;
    source_click = false;
    $("#start-select").css("background-color", "#f2f1f0");
    $("#dest-select").css("background-color", "#f2f1f0");
    $("#start").val("");
    $("#dest").val("");
    source.setMap(null);
    dest.setMap(null);
    latA = -1;
    lngA = -1;
    latB = -1;
    lngB = -1;
    drawMap();
    $("#results").addClass("hidden");
})

$("#day-select").change(function() {
    if (stop !== '') {
        let val = this.value;
        select_wait = val;
        drawWait(val);
    }
});

$("#calc-route").click(() => {
    fetch('http://localhost:5000/travel', {
        body: JSON.stringify({
            latA: latA,
            lngA: lngA,
            latB: latB,
            lngB: lngB
        }),
        headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        method: "POST",
        mode: "cors"
    }).then((res) => {
        return res.json();
    }).then(async function(res) {
        $("#results").removeClass("hidden");

        source = new google.maps.Marker({
            position: res[0].positionA, 
            label: "A",
            map: MAP
        });        
        var lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 4
        };
        let pathA = new google.maps.Polyline({
            path: [res[0].positionA, res[0].positionB],
            geodesic: true,
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0',
              repeat: '20px'
            }],
        });
        let pathB = new google.maps.Polyline({
            path: [res[3].positionA, res[3].positionB],
            geodesic: true,
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0',
              repeat: '20px'
            }],
        });
        dest = new google.maps.Marker({
            position: res[3].positionB, 
            label: "B",
            map: MAP
        });

        await drawRoute(res.route, colors[res.route], [source, dest, pathA, pathB]);

        $("#walk-time").text((res.walking_time / 60).toFixed(2));
        $("#bus-time").text((res.bus_time / 60).toFixed(2));
        $("#walking-link").attr("href", res.walking_url);
        $("#walking-link").attr("style", "color: blue");
        $("#walk1").html(res[0].text + " - <b>" + (res[0].duration / 60.0).toFixed(2) + " minutes</b>");
        $("#wait1").html(res[1].text);
        $("#bus1").html(res[2].text + " - <b>" + (res[2].duration / 60.0).toFixed(2) + " minutes</b>");
        $("#walk2").html(res[3].text + " - <b>" + (res[3].duration / 60.0).toFixed(2) + " minutes</b>");
    });
});

function drawWait(day) {
    var d;
    fetch('http://localhost:5000/stop', {
        body: JSON.stringify({
            route: route,
            stop: stop
        }),
        headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        method: "POST",
        mode: "cors"
    }).then((res) => {
        return res.json();
    }).then(async function(res) {
        d = res[day];
        var a = new Array(6);
        let keys = Object.keys(d);
        a[0] = d[keys[4]].Ewaitt;
        a[1] = d[keys[5]].Ewaitt;
        a[2] = d[keys[0]].Ewaitt;
        a[3] = d[keys[1]].Ewaitt;
        a[4] = d[keys[2]].Ewaitt;
        a[5] = d[keys[3]].Ewaitt;

        times = ['7a-9a', '9a-11a', '11a-1p', '1p-4p', '4p-6p', '6p-9p']

        $("#average-wait").html('');
        let padding = 40;
        let height = 200 - padding;
        let width = 250 - padding;

        var x = d3.scaleBand()
            .domain(times)
            .rangeRound([30, width + 5]);

        var y = d3.scaleLinear()
            .domain([0, d3.max(a, function(d) { return d })])
            .range([height, 30]);
        
        var svg = d3.select('#average-wait');
        var g = svg.append('g');

        var bar = g.selectAll(".bar")
                    .data(a)
                    .enter().append("g")
                    .attr("class", "bar")
                    .attr("transform", function(d, i) { return "translate(" + (i * 30 + 18) + "," + y(d) + ")"; });

        bar.append("rect")
            .attr("x", 30)
            .attr("width", 20)
            .attr("height", function(d) { return height - y(d); });

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(10," + height + ")")
            .call(d3.axisBottom(x)).selectAll("text")
            .attr("y", 10)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(30)");

        g.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(40, 0)")
            .call(d3.axisLeft(y));

        g.append("text")
         .attr("font-size", "10px")
         .attr("transform", "translate(10, 110) rotate(-90)")
         .text("Minutes");
    });
}

function drawCrowdedness(route) {
    var d;
    
    fetch('http://localhost:5000/crowd', {
        body: JSON.stringify({
            route: route
        }),
        headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        method: "POST",
        mode: "cors"
    }).then((res) => {
        return res.json();
    }).then((res) => {
        d = res.Avg_Count;
        var a = new Array(6);
        let keys = Object.keys(d);
        a[0] = d[keys[4]];
        a[1] = d[keys[5]];
        a[2] = d[keys[0]];
        a[3] = d[keys[1]];
        a[4] = d[keys[2]];
        a[5] = d[keys[3]];

        times = ['7a-9a', '9a-11a', '11a-1p', '1p-4p', '4p-6p', '6p-9p']

        $("#crowdedness").html('');
        let padding = 30;
        let height = 200 - padding;
        let width = 250 - padding;

        var x = d3.scaleBand()
            .domain(times)
            .rangeRound([30, width + 5]);

        var y = d3.scaleLinear()
            .domain([0, d3.max(a, function(d) { return d })])
            .range([height, 30]);
        
        var svg = d3.select('#crowdedness');
        var g = svg.append('g');

        var bar = g.selectAll(".bar")
                    .data(a)
                    .enter().append("g")
                    .attr("class", "bar")
                    .attr("transform", function(d, i) { return "translate(" + (i * 30 + 23) + "," + y(d) + ")"; });

        bar.append("rect")
            .attr("x", 35)
            .attr("width", 20)
            .attr("height", function(d) { return height - y(d); });

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(15," + height + ")")
            .call(d3.axisBottom(x)).selectAll("text")
            .attr("y", 12)
            .attr("x", 8)
            .attr("dy", ".35em")
            .attr("transform", "rotate(30)");

        g.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(45, 0)")
            .call(d3.axisLeft(y));

        g.append("text")
         .attr("font-size", "10px")
         .attr("transform", "translate(10, 110) rotate(-90)")
         .text("People");
    });
    
}
