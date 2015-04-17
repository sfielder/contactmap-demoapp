var https = require('https');

var GOOGLEMAPS = 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyB0ymRb6jQAsgtoUnMO10-x6CjUe0PZK88&latlng=';

function rgeocode(latlong, callback) {
  console.log("*************** GOOGLEMAPS + encodeURIComponent(latlong): " + GOOGLEMAPS + encodeURIComponent(latlong));

  https.get(GOOGLEMAPS + encodeURIComponent(latlong), function(res) {
      if (res.statusCode < 300) {
        var body = '';
          res.on('data', function(chunk) {
            body += chunk;
          });
          res.on('end', function() {
          body = JSON.parse(body);
          if (body.results && body.results.length > 0) {

            var country = {};

            for(var i in body.results[0].address_components){

                  if(body.results[0].address_components[i].types[0] == "country"){
                   country.short = body.results[0].address_components[i].short_name
                   console.log(body.results[0].address_components[i].short_name);
                   country.long = body.results[0].address_components[i].long_name
                   console.log(body.results[0].address_components[i].long_name);
                  }
                }
              callback(country);
          } else {
            callback(null);
          }
        });
      }
    });
}



module.exports = rgeocode;
