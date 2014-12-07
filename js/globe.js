
//@author Alan
var CRUTData = []; //the actual weather/climate data as an ARRAY (the array in the data obj) - will only be temperature_anomaly
var CRUTSchema = {}; //the schema obj received from the ncdump-json JSON- children objects latitude, longitued, time
var lblCRUTData = {}; //obj of year arrays of objects

var avgGeoJSONData = {}; //single year's geojson

var geoJSONData = {};

var currentYear = 1850;

//getRawData();

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

var getGeoJSON = function(year) {
    d3.json('data/geojsons/' + year + '_temp_anomaly_geojson.json', function(err, data) {
        if(err) console.error(err);
        avgGeoJSONData = data;
        //console.log(data);
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
    var b = 0;
    for(var yr in avgLbData) { //I swear to god, bogosort is a better algorithm than this 
        for(var long in schema.longitude) {
            avgLbData[yr][schema.longitude[long]] = {};
            for(var lat in schema.latitude) {
                avgLbData[yr][schema.longitude[long]][schema.latitude[lat]] = { sum : 0.0, avg : 0.0, ct : 0.0 };
            }
        }
        //console.log(fullLbData);
        for(var m in fullLbData[yr]) { //These loops are for calculating sum and number of data points.
            for(var d in fullLbData[yr][m]) {
                var laat = fullLbData[yr][m][d]["latitude"], //These are for accessing the avg's data.
                    loong = fullLbData[yr][m][d]["longitude"];
                if(b < 9)
                        console.log(avgLbData[yr])
                        //console.log(avgLbData[yrrr][loooong][laaat]['sum'], avgLbData[yrrr][loooong][laaat]['ct'])
                b++;
                avgLbData[yr][loong][laat]['sum'] += fullLbData[yr][m][d]["data"];
                avgLbData[yr][loong][laat]['ct']++;
            }
        }
        //console.log('before last loop')
        
        for(var yrrr in avgLbData) { //FINALLY, calculates the average.
            for(var loooong in avgLbData[yrrr]) {
                for(var laaat in avgLbData[yrrr][loooong]) {
                    if(b < 9)
                        console.log(avgLbData[yrrr], loooong, laaat)
                        //console.log(avgLbData[yrrr][loooong][laaat]['sum'], avgLbData[yrrr][loooong][laaat]['ct'])
                    b++;
                    avgLbData[yrrr][loooong][laaat]['avg'] = avgLbData[yrrr][loooong][laaat]['sum'] / avgLbData[yrrr][loooong][laaat]['ct']; 
                    //console.log('hai')
                    //delete avgLbData[yr][loooong][laaat]['sum'];
                    //delete avgLbData[yr][loooong][laaat]['ct'];
                }
            }
        }
    }
    console.log(avgLbData);
    return avgLbData;
}

/*
    Takes the raw ncdumped data and schema jsons and returns an object of each year's data contained within an array of the data objects
    This was used to produce avgLabelledData.json 
*/
function labelData(data, schema){
    var lblData = {};
    var currYear = schema.time[0].toString().substring(0, 4);
    var currMonth = schema.time[0].toString().substring(5, 7);
    lblData[currYear]={};
    lblData[currYear][currMonth] = [];
    //latitude, then longitude, then time
    var indexInTempData = 0; //our pointer or whatever within the unlabelled data array
    console.log('before fors');
 
    var avgData = {}; //object of years containing array of data objects with data. 
    avgData[currYear]={};
    //initial labelling
    for(var i in schema.time){ 
        for(var j in schema.longitude){
            for(var k in schema.latitude){ //0,4
                if(schema.time[i].toString().substring(0,4) != currYear){
                    currYear = schema.time[i].toString().substring(0,4);
                    lblData[currYear] = {};
                    avgData[currYear]={};
                }
                if(schema.time[i].toString().substring(5,7) != currMonth){
                    currMonth = schema.time[i].toString().substring(5,7);
                    lblData[currYear][currMonth] = [];
                }
                if(data[indexInTempData])
                    lblData[currYear][currMonth].push(new Data(schema.latitude[k], schema.longitude[j], schema.time[i], data[indexInTempData]));
                indexInTempData++;
            }
        }
    }
    //console.log(avgData);
    //averaging Data
    for(var yr in lblData){
        for(var loo in schema.longitude){
            var loo1 = schema.longitude[loo];
            //console.log(yr, loo1)
            
            avgData[yr][loo1] = {};
            for(var laa in schema.latitude){
                laa1 = schema.latitude[laa];
                //console.log(yr, laa1, loo1);
                //console.log(avgData[yr][loo1][laa1])
                avgData[yr][loo1][laa1] = {sum: 0, avg: 0, ct: 0};
            }
        }
        for(var m in lblData[yr]){
            for(var d in lblData[yr][m]){
                var laat = lblData[yr][m][d]["latitude"], 
                    loong = lblData[yr][m][d]["longitude"];
                console.log(avgData)
                avgData[yr][loong][laat]['sum'] += lblData[yr][m][d]["data"];
                avgData[yr][loong][laat]['ct']++;
            }
        }
    }
    for(var yrr in avgData){
        for(var laaat in avgData[yrr]){
            for(var looong in avgData[yrr][laaat]){
                if(b < 15)
                console.log(avgData[yrr][laaat][looong]['sum'] / avgData[yrr][laaat][looong]['ct'])
                avgData[yrr][laaat][looong]['avg'] = avgData[yrr][laaat][looong]['sum'] / avgData[yrr][laaat][looong]['ct'];
                delete avgData[yrr][laaat][looong]['sum'];
                delete avgData[yrr][laaat][looong]['ct'];
            }
        }
    }
    //console.log('avg', avgData);
    return avgData;
}

/*
    this will return the geoJSON for one year.
    Should only be called by saveDataAsGeoJSON()
*/
var processOneYear = function(data, year) {
    var yearData = data[year],
        geoJSONtoRet = {"type": "FeatureCollection",
                        "features" : []
                        }; 
    //console.log(yearData);
    var t = 2.5; //Each lat/long is a 5deg/5deg square with the point in the middle
    for(var long in yearData) {
        for(var lat in yearData[long]) {
            geoJSONtoRet['features'].push({ //Geojson format
                "type" : "Feature", 
                "geometry": {
                    "type" : "Polygon", "coordinates" : [
                        [
                            [parseInt(long)+t, parseInt(lat)+t],
                            [parseInt(long)+t, parseInt(lat)-t],
                            [parseInt(long)-t, parseInt(lat)-t],
                            [parseInt(long)-t, parseInt(lat)+t],
                            [parseInt(long)+t, parseInt(lat)+t]
                        ]
                    ]
                },
                "properties" : {
                    "temperature_anomaly" : yearData[long][lat]['avg']
                }
            });
        }
    }
    return geoJSONtoRet;
};

/*
    This will save a geojson file for each year.
    Input should be the labelled averaged data.
*/
var saveDataAsGeoJSON = function() {
    console.log('beginning saving');
    //TODO: save each file to topojsons folder?
    var labelledData = processRaw(CRUTData, CRUTSchema);
    //var labelledData = labelData(CRUTData, CRUTSchema)
    //for(var y in labelledData) {
    var ctDL = 0;
    for(var b = 2013; b<2014; b++){ //1998 is already downloaded
        var geoJ = new Blob([JSON.stringify(processOneYear(labelledData, b))], {type: "application/json; charset=utf-8"});
        saveAs(geoJ, b+'_temp_anomaly_geojson.json');
        ctDL++;
        if(ctDL > 1)
            break;
    }
    //avgGeoJSONData = processOneYear(labelledData, 1959);
    //drawGlobe();
};



//getUnSortData(); //Uncomment this for a lot of lagging fun. 
function getUnSortData(){
    d3.json('data/jsonData/data.json', function(err, data){
        //console.log('data receieved', data);
        if(err)
            console.log(err);
        CRUTData = data.temperature_anomaly;
        lblCRUTData = labelData(CRUTData, CRUTSchema); //make sure we call this AFTER we json this stuff (JS is async)
        getAllGeoJSON(2005);
        toTopoJSON();
        console.log(avgGeoJSONData)
        //drawGlobe();
    });
    d3.json('data/jsonSchema/schema.json', function(err, data){ //This always loads first, so don't put the labelData() here. would be a good idea to JSON the other one in here or vice versa
        if(err)
            console.log(err);
        CRUTSchema = data;
    }) 
} //This function shouldn't be needed bc I used it already to get teh data. Holy crap that sucked.

/*
    The data is in the year: long : lat : avg form.
*/
function processLabelledData(data, year){ //will be need to run more than once, averages the temps for one year.
    var prData = data[year],
        toRet = [];
    //console.log('prData', prData)
    for(var long in prData){
        for(var lat in prData[long]){
            
            toRet.push({longitude: long, latitude: lat, avgTemp : prData[long][lat].avg});
        }
    }
    //console.log('toRet', toRet)
    return toRet;
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

function toTopoJSON(){ // don't use.
        /*d3.json('avgLabelledData.json', function(err, data){
            if(err)
                console.log(err);
            avgLblData = data;
            //console.log('data', data);
            
            temps(geoJSON);
            console.log('geoJSON', geoJSONData);*/
            d3.json('data/topojsons/HadCRUT4.json', function(err, data) { //this is only for one year, so I'm loading it outside the function
                if(err)
                    console.log(err);
                CRUTtopoJSON = data;
                console.log('crut', CRUTtopoJSON)
                
            //});
        
    });
}

function getAllGeoJSON(year) {
    
    avgGeoJSONData = toGeoJSON(processLabelledData(lblCRUTData, year));
    
}

function Data(long, lat, tim, _data){
    this.latitude = lat;
    this.longitude = long;
    this.time = tim;
    this.data = _data;
}


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
  console.log(avgGeoJSONData);
  
  planet.onDraw(function() {
    planet.withSavedContext(function(context) {
      var world = planet.plugins.topojson.world;
      var colors = d3.scale.linear()
          .domain([-.8, -.6, -.4, -.2, 0, .2, .4, .6, .8])
          .range(["#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac"]);
          //.range(["#fddbc7","#f7f7f7", "#d1e5f0"]);
          //.range(["#ca0020","#f4a582","#f7f7f7","#92c5de","#0571b0"]);
          //.range(["#67001f","#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac","#053061"].reverse());
      var features = avgGeoJSONData.features;
      for(var c in avgGeoJSONData.features) {
          var feature=features[c];
          //console.log(c, features)
          if(i == 1000)  {
            //console.log(planet.plugins.topojson.world)
            //console.log(feature);
          }
          i++;  
          //console.log(context);
          context.beginPath();
          planet.path.context(context)(feature);
          context.fillStyle = colors(avgGeoJSONData.features[c].properties.temperature_anomaly ) || "grey";
          context.strokeStyle = '#C0C0C0';
          context.setLineWidth(.25);
          context.fill();  
      }
        /*var features = avgGeoJSONData.features[1000];
        context.beginPath();
        planet.path.context(context)(features);
        context.fillStyle = 'white';
        context.fill();*/
      
    });
  });
};



function drawGlobe(){
    var canvas = document.getElementById('globe');
    var planet = planetaryjs.planet();
    planet.loadPlugin(somePlugin);
    planet.loadPlugin(planetaryjs.plugins.topojson({
        file: 'data/jsonData/world-110m.json'
    }));
    /*planet.loadPlugin(planetaryjs.plugins.zoom({
          scaleExtent: [300, 500]
    }))*/
    planet.loadPlugin(planetaryjs.plugins.borders({
        stroke: '#000', lineWidth: 1.7, type: 'both'
    }));
    planet.loadPlugin(autocenter({extraHeight: -52}));
    planet.loadPlugin(autoscale({extraHeight: -52}));
    planet.loadPlugin(autorotate(10));
    //planet.loadPlugin(drawLand(planet));
    planet.loadPlugin(planetaryjs.plugins.drag({
        onDragStart: function() {
            this.plugins.autorotate.pause();
        },
        onDragEnd: function() {
            this.plugins.autorotate.resume();
        }
    }));
    
    planet.projection
      .scale(canvas.width / 2)
      .translate([canvas.width / 2, canvas.height / 2]);
    planet.draw(canvas);
}

var slider = d3.select('body').select("#slider");
slider.call(d3.slider().axis(true).min(1850).max(2013).step(1).on("slide", function(evt, value) {
    d3.select('#year').text(value);   
    currentYear = value;
    try{
        getGeoJSON(currentYear);
    }
    catch(e){
        alert("Error loading data: ", e);
    }
}))

getGeoJSON(2013);