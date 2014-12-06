
//@author Alan
var CRUTData = []; //the actual weather/climate data as an ARRAY (the array in the data obj) - will only be temperature_anomaly
var CRUTSchema = {}; //the schema obj received from the ncdump-json JSON- children objects latitude, longitued, time
var lblCRUTData = {}; //obj of year arrays of objects

var avgLblData = {};
//getUnSortData();
function getUnSortData(){
    d3.json('jsonData/data.json', function(err, data){
    //d3.json('jsonData/1850-2012.data.CRUT.json', function(err, data){
        //console.log('data receieved', data);
        if(err)
            console.log(err);
        CRUTData = data.temperature_anomaly;
        lblCRUTData = labelData(CRUTData, CRUTSchema); //make sure we call this AFTER we json this stuff (JS is async)
        //d3.select('body').append('div').text(JSON.stringify(lblCRUTData));
    });
    //d3.json('jsonSchema/1850-2012.CRUT.json', function(err, data){
    d3.json('jsonSchema/schema.json', function(err, data){
        //console.log('schema receieved', data);
        if(err)
            console.log(err);
        CRUTSchema = data;
    }) 
} //This function shouldn't be needed bc I used it already to get teh data. Holy crap that sucked.

/*
    The data is in the year: long : lat : avg form.
*/
function processLabelledData(data, year){
    var prData = data[year],
        toRet = [];
    console.log('prData', prData)
    for(var long in prData){
        for(var lat in prData[long]){
            toRet.push({longitude: long, latitude: lat})
        }
    }
    return toRet;
}

d3.json('avgLabelledData.json', function(err, data){
        if(err)
            console.log(err);
        avgLblData = data;
        console.log(data);
        console.log(toGeoJSON(processLabelledData(avgLblData, 1999)));
    });
    
/*
    Takes the raw ncdumped data and schema jsons and returns an object of each year's data contained within an array of the data objects
    This was used to produce avgLabelledData.json
    should be longitude, then latitude I think.  
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

    
    console.log(avgData);
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
                
                avgData[yr][loong][laat]['sum'] += lblData[yr][m][d]["data"];
                avgData[yr][loong][laat]['ct']++;
            }
        }
    }
    for(var yrr in avgData){
        for(var laaat in avgData[yrr]){
            for(var looong in avgData[yrr][laaat]){
                //console.log(avgData[yrr][laaat][looong])
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
In my data:
    Lat: deg north 
    Long: deg east
In GeoJSON:
    Lat: deg north
    Long: deg east
    
    LONG, THEN LAT
*/
function toGeoJSON(data){ // data should be an array of data objs. 
    var geoj = {"type": "FeatureCollection",
                    "features" : []
                };
    for(var odb in data){
        geoj['features'].push({
            
        });
    }
}

function Data(lat, long, tim, _data){
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
  
//@author Alan
/*
    First attempt at writing a plugin for plotting our data.
*/
var drawLand = function(planet) {
  planet.onDraw(function() {
    planet.withSavedContext(function(context) {
      var world = planet.plugins.topojson.world;
      var land = topojson.feature(world, world.objects.land);

      context.beginPath();
      planet.path.context(context)(land);
      context.fillStyle = 'white';
      context.fill();
    });
  });
};
  

var canvas = document.getElementById('globe');
console.log(canvas);
var planet = planetaryjs.planet();
planet.loadPlugin(planetaryjs.plugins.earth({
    topojson: {file : 'jsonData/world-110m.json'},
    oceans:   {fill:   '#000080' },
    land:     {fill:   '#339966' },
    borders:  {stroke: '#008000' }
}));
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
//planet.draw(canvas);


