
//@author Alan
var CRUTData = []; //the actual weather/climate data as an ARRAY (the array in the data obj) - will only be temperature_anomaly
var CRUTSchema = {}; //the schema obj received from the ncdump-json JSON- children objects latitude, longitued, time
var lblCRUTData = {}; //obj of year arrays of objects
d3.json('jsonData/data.json', function(err, data){
//d3.json('jsonData/1850-2012.data.CRUT.json', function(err, data){
    console.log('data receieved', data);
    if(err)
        console.log(err);
    CRUTData = data.temperature_anomaly;
    lblCRUTData = labelData(CRUTData, CRUTSchema); //make sure we call this AFTER we json this stuff (JS is async)
    var jsonThing = d3.select('body').append('p').html(JSON.stringify(lblCRUTData));
});
//d3.json('jsonSchema/1850-2012.CRUT.json', function(err, data){
d3.json('jsonSchema/schema.json', function(err, data){
    console.log('schema receieved', data);
    if(err)
        console.log(err);
    CRUTSchema = data;
}) //Should functionize later



/*
    Takes the raw ncdumped data and schema jsons and returns an object of each year's data contained within an array of the data objects
*/
function labelData(data, schema){
    var lblData = {};
    var currYear = schema.time[0].toString().substring(0, 4);
    lblData[currYear] = [];
    //latitude, then longitude, then time
    var indexInTempData = 0; //our pointer or whatever within the unlabelled data array
    console.log('before fors');
    for(var i in schema.time){
        for(var j in schema.longitude){
            for(var k in schema.latitude){ //0,4
                if(schema.time[i].toString().substring(0,4) != currYear){
                    currYear = schema.time[i].toString().substring(0,4);
                    lblData[currYear] = [];
                }
                if(data[indexInTempData])
                    lblData[currYear].push(new Data(schema.latitude[k], schema.longitude[j], schema.time[i], data[indexInTempData]));
                indexInTempData++;
            }
        }
    }
    console.log('done\n', lblData);
    return lblData;
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
// planet.projection
//   .scale(canvas.width / 2)
//   .translate([canvas.width / 2, canvas.height / 2]);
//planet.draw(canvas);


