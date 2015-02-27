var https = require('https');

var GOOGLEMAPS = 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyB0ymRb6jQAsgtoUnMO10-x6CjUe0PZK88&address=';

function geocode(address, callback) {
	Geocode.find({where: {address: address}}).then(function(geocode) {
		if (geocode) {
			callback(geocode);
		} else {
			https.get(GOOGLEMAPS + encodeURIComponent(address), function(res) {
				if (res.statusCode < 300) {
					var body = '';
				    res.on('data', function(chunk) {
		    			body += chunk;
		  			});
		  			res.on('end', function() {
						body = JSON.parse(body);
						if (body.results && body.results.length > 0) {
							var lat = body.results[0].geometry.location.lat;
							var lon = body.results[0].geometry.location.lng;
							Geocode.create({address: address, lat: lat, lon: lon}).then(function(geocode) {
								callback(geocode);
							});
						} else {
							callback(null);
						}
					});
				}
			});
		}
	});
}

module.exports = geocode