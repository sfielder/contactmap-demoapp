var Sequelize = require('sequelize');
var https = require('https');
var async = require('async');

var dburl = process.env.DATABASE_URL || 'postgres://localhost/herokuconnect';
var db = new Sequelize(dburl, {
				dialectOptions: {
					ssl: dburl.indexOf('localhost') == -1
				},
				logging: false
			 });


var Contact = db.define('Contact', {
	id: Sequelize.INTEGER,
	sfid: Sequelize.STRING,
	email: Sequelize.STRING,
	name: Sequelize.STRING,
	mailingcity: Sequelize.STRING,
	mailingstate: Sequelize.STRING,
	mailingstreet: Sequelize.STRING
}, {
	timestamps: false,
	freezeTableName: true,
	schema: 'salesforce',
	tableName: 'contact'
	}
);

Geocode = db.define('geocode', {
    id: Sequelize.INTEGER,
    address: Sequelize.STRING,
    lat: Sequelize.FLOAT,
    lon: Sequelize.FLOAT
});

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

var pois = [];

db.sync();

function geocode_contact(contact, callback) {
	if (contact.values.mailingstreet || contact.values.mailingcity || contact.values.mailingstate) {
		var addr = contact.values.mailingstreet + "," + contact.values.mailingcity + "," + contact.values.mailingstate;
		geocode(addr, function(geocode) {
			if (geocode) {
				var rec = {name: escape(contact.values.name), lat: geocode.lat, lon:geocode.lon};
				callback(null, rec);
			} else {
				callback();
			}
		});
	} else {
		callback();
	}
}

function load_pois(callback) {
	Contact.findAll({limit:200}).then(function(rows) {
		async.map(rows, geocode_contact, callback);
	});
}



// EXPRESS

var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
	load_pois(function(error, pois) {
		console.log("POIS: ", pois);
		res.render('index', {pois: pois.filter(function(val) { return val })});
	});
});

app.get('/create', function(req, res){
  // Redirect to Heroku Connect dashboard to finish setup
  var hostRe = new RegExp(/^([^.]+)\.herokuapp\.com$/);

  var match = req.headers.host.match(hostRe);

  if (match) {
    res.redirect(create_url+'?create='+match[1]);
  } else {
    res.status(400).send("You need to be running on Heroku!");
  }
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
