
//@author Alan
var CRUTData = []; //the actual weather/climate data as an ARRAY (the array in the data obj) - will only be temperature_anomaly
var CRUTSchema = {}; //the schema obj received from the ncdump-json JSON- children objects latitude, longitued, time
var lblCRUTData = {}; //obj of year arrays of objects

var avgGeoJSONData = {}; //single year's geojson

var geoJSONData = {};

var currentYear = 2000;

/*
    Should be only run once or twice to get the raw data for processing.
*/
function getRawData() {
    d3.json('data/jsonData/data.json', function(err, data) {
        if(err) console.error(err);
        CRUTData = data.temperature_anomaly; console.log('data retrieved')
        d3.json('data/jsonSchema/schema.json', function(err, data) {
            if(err) console.error(err);
            CRUTSchema = data; console.log('schema retrieved')
            saveDataAsGeoJSON();
            drawGlobe();
        });
    });
}

var getGeoJSON = function(year) { //gets the geojson and draws the globe.
    d3.json('data/geojsons/' + year + '_temp_anomaly_geojson.json', function(err, data) {
        if(err) console.error(err);
        avgGeoJSONData = data;
        drawGlobe();
    });
};


/*
    Preconditions: data and schema are CRUTData and CRUTSchema, basically.
    This thing will only be run a few times to pass on the correct file, and then never again.
    Takes raw ncdumped data and schema (-c) jsons and returns an object of each year's data containing an array of data objects.
*/
var b = 0;
var processRaw = function(data, schema) {
    var fullLbData = {}, //this is computed first. It is the entire file, labelled
        avgLbData = {}; //This is first initialized correctly, then computed
    var currYear = schema.time[0].toString().substring(0, 4),
        currMonth = schema.time[0].toString().substring(5, 7);
    fullLbData[currYear] = {};
    fullLbData[currYear][currMonth] = []; //An array of data objects.
    avgLbData[currYear] = {};
    var index = 0; //pointer w/in the unlabelled data array.
    
    for(var t in schema.time) { //Triple for loops hurt my eyes. I wonder what Haskell programmers think of them.
        for(var long in schema.longitude) { //These loops are labelling the full data and initializing the averaged data.
            for(var lat in schema.latitude) {
                if(schema.time[t].toString().substring(0, 4) != currYear) { //If we've come upon a new year of data
                    currYear = schema.time[t].toString().substring(0, 4);
                    fullLbData[currYear] = {};
                    avgLbData[currYear] = {};
                }
                if(schema.time[t].toString().substring(5, 7) != currMonth) { //If we've come upon a new month of data
                    currMonth = schema.time[t].toString().substring(5, 7);
                    fullLbData[currYear][currMonth] = [];
                }
                if(data[index]) //Only save non-null values
                    fullLbData[currYear][currMonth].push(new Data(schema.longitude[long], schema.latitude[lat], schema.time[t], data[index]));
                
                index++; //Advance index regardless.
            }
        }
    }
    for(var yr in avgLbData) { //I swear to god, bogosort is a better algorithm than this 
        for(var long in schema.longitude) {
            avgLbData[yr][schema.longitude[long]] = {};
            for(var lat in schema.latitude) {
                avgLbData[yr][schema.longitude[long]][schema.latitude[lat]] = { sum : 0.0, avg : 0.0, ct : 0.0 };
            }
        }
        for(var m in fullLbData[yr]) { //These loops are for calculating sum and number of data points.
            for(var d in fullLbData[yr][m]) {
                var laat = fullLbData[yr][m][d]["latitude"], //These are for accessing the avg's data.
                    loong = fullLbData[yr][m][d]["longitude"];
                avgLbData[yr][loong][laat]['sum'] += fullLbData[yr][m][d]["data"];
                avgLbData[yr][loong][laat]['ct']++;
            }
        }
        
        for(var yrrr in avgLbData) { //FINALLY, calculates the average.
            for(var loooong in avgLbData[yrrr]) {
                for(var laaat in avgLbData[yrrr][loooong]) {
                    avgLbData[yrrr][loooong][laaat]['avg'] = avgLbData[yrrr][loooong][laaat]['sum'] / avgLbData[yrrr][loooong][laaat]['ct']; 
                }
            }
        }
    }
    return avgLbData;
}

/*
In my data:
    Lat: deg north 
    Long: deg east
In GeoJSON:
    Lat: deg north
    Long: deg east
    
    LONG, THEN LAT
    
    data should be an array of data objs. 
    returns a GeoJSON object of that one year.
    Won't be called again, used for data processing.
*/
function toGeoJSON(data){ 
    var t = 2.5;
    var geoj = {"type": "FeatureCollection",
                    "features" : []
                };
    for(var odb in data){
        geoj['features'].push({
            "type" : "Feature", 
            "geometry": {
                "type" : "Polygon", "coordinates" : [
                    [
                        [parseInt(data[odb].longitude)+t, parseInt(data[odb].latitude)+t],
                        [parseInt(data[odb].longitude)+t, parseInt(data[odb].latitude)-t],
                        [parseInt(data[odb].longitude)-t, parseInt(data[odb].latitude)-t],
                        [parseInt(data[odb].longitude)-t, parseInt(data[odb].latitude)+t],
                        [parseInt(data[odb].longitude)+t, parseInt(data[odb].latitude)+t]
                    ]
                ]
            },
            "properties" : {
                "temperature_anomaly" : data[odb].avgTemp
            }
        });
    }
    return geoj;
}

function Data(long, lat, tim, _data){
    this.latitude = lat;
    this.longitude = long;
    this.time = tim;
    this.data = _data;
}


var canvas = document.getElementById('globe');
var planet = planetaryjs.planet();
planet.loadPlugin(planetaryjs.plugins.topojson({
        file: 'data/jsonData/world-110m.json'
    }));

//@author Kevin
var autorotate = function(degreesPerSec) {
    return function(planet) {
      var last = null;
      var paused = false;
      planet.plugins.autorotate = {
        pause:  function() { paused = true;  },
        resume: function() { paused = false; }
      };
      planet.onDraw(function() {
        if (paused || !last) {
          last = new Date();
        } 
        else {
          var now = new Date();
          var other = now - last;
          var rotation = planet.projection.rotate();
          rotation[0] += degreesPerSec * other / 1000;
          if (rotation[0] >= 180) 
            rotation[0] -= 360;
            planet.projection.rotate(rotation);
            last = now;
        }
      });
    };
  };

// Plugin to resize the canvas to fill the window and to
// automatically center the planet when the window size changes
function autocenter(options) {
    options = options || {};
    var needsCentering = false;
    var globe = null;
    
    var resize = function() {
      var width  = window.innerWidth + (options.extraWidth || 0);
      var height = window.innerHeight + (options.extraHeight || 0);
      globe.canvas.width = width;
      globe.canvas.height = height;
      globe.projection.translate([width / 2, height / 2]);
    };
    
    return function(planet) {
      globe = planet;
      planet.onInit(function() {
        needsCentering = true;
        d3.select(window).on('resize', function() {
          needsCentering = true;
        });
      });
    
      planet.onDraw(function() {
        if (needsCentering) { resize(); needsCentering = false; }
      });
    };
};

// Plugin to automatically scale the planet's projection based
  // on the window size when the planet is initialized
function autoscale(options) {
    options = options || {};
    return function(planet) {
      planet.onInit(function() {
        var width  = window.innerWidth + (options.extraWidth || 0);
        var height = window.innerHeight + (options.extraHeight || 0);
        planet.projection.scale(Math.min(width, height) / 2);
      });
    };
};

var CRUTtopoJSON = {};
var i=0;
var somePlugin = function(planet) {
  planet.plugins.autorotate.pause();
  planet.onDraw(function() {
    planet.withSavedContext(function(context) {
      var world = planet.plugins.topojson.world;
      var colors = d3.scale.linear()
          .domain([-.8, -.6, -.4, -.2, 0, .2, .4, .6, .8])
          .range(["#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac"].reverse());
      var features = avgGeoJSONData.features;
      for(var c in avgGeoJSONData.features) {
          var feature=features[c];
          context.beginPath();
          planet.path.context(context)(feature);
          context.fillStyle = colors(avgGeoJSONData.features[c].properties.temperature_anomaly ) || "grey";
          context.strokeStyle = '#C0C0C0';
          context.fill();  
      }
      planet.plugins.autorotate.resume();
      
    });
  });
};


function drawGlobe(){
    planet.loadPlugin(autorotate(10));
    planet.loadPlugin(somePlugin);
    planet.loadPlugin(planetaryjs.plugins.borders({
        stroke: '#000', lineWidth: 1.7, type: 'both'
    }));
    planet.loadPlugin(autocenter({extraHeight: -52}));
    planet.loadPlugin(autoscale({extraHeight: -52}));
    planet.loadPlugin(planetaryjs.plugins.drag({
        onDragStart: function() {
            this.plugins.autorotate.pause();
        },
        onDragEnd: function() {
            this.plugins.autorotate.resume();
        }
    }));
    planet.draw(canvas);
}

var slider = d3.select('body').select("#slider");
var scale = d3.scale.linear().range([1800, 2013]);
var axis = d3.svg.axis(slider).scale(scale).tickSize(10);

d3.select("body").append("svg")
    .attr("class", "axis")
    .attr("width", "90%")
    .attr("height", 17)
  .append("g")
    .attr("transform", "translate(0,0)")
    .call(axis);
//var sliderAxis = d3.
var drag = d3.behavior.drag();
drag.on('dragend', function(){
    showLoading();
    d3.select('#year').text(slider[0][0].value);
    setTimeout(function() {hideLoading()}, 10000);
})

var showLoading = function() {
    d3.select("body").select('canvas')
                    .style("opacity", 0);
    d3.select("body").select('#lb')
        .style("opacity", 1);
    d3.select("body").select('#l')
        .style("opacity", 1);
    setTimeout(function() {planet.plugins.autorotate.resume();}, 10000);
}

var hideLoading = function() {
    d3.select("body").select('canvas')
                    .style("opacity", 1);
    d3.select("body").select('#lb')
        .style("opacity", 0);
    d3.select("body").select('#l')
        .style("opacity", 0);
    planet.plugins.autorotate.pause();
    
    getGeoJSON(currentYear);
}

slider.call(drag);

getGeoJSON(2000);
