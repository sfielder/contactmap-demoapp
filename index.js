var Sequelize = require('sequelize');
var async = require('async');
var HashMap = require('hashmap');
var geocode = require('./geocode');

// ************** DATABASE MODELS ***********************

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

Account = db.define('Account', {
	id: Sequelize.INTEGER,
	sfid: Sequelize.STRING,
	billingcity: Sequelize.STRING,
	billingcountry: Sequelize.STRING
}, {
	timestamps: false,
	freezeTableName: true,
	schema: 'salesforce',
	tableName: 'account'
	}
);


Geocode = db.define('geocode', {
    id: Sequelize.INTEGER,
    address: Sequelize.STRING,
    lat: Sequelize.FLOAT,
    lon: Sequelize.FLOAT
});

// Create geocode cache table if not exists
db.sync();

// ************** GEOCODING LOGIC ***********************

var contact_locations = [];

function geocode_contact(contact, callback) {
	if (contact.values.mailingstreet ||
		contact.values.mailingcity ||
		contact.values.mailingstate) {

		var addr = contact.values.mailingstreet + "," +
					contact.values.mailingcity + "," +
					contact.values.mailingstate;

		geocode(addr, function(geocode) {
			if (geocode) {
				callback(null, {name: escape(contact.values.name), lat: geocode.lat, lon:geocode.lon});
			} else {
				callback();
			}
		});
	} else {
		callback();
	}
}

var account_locations = [];
function geocode_account(account, callback) {
	if (account.values.billingcountry ) {

		var addr = account.values.billingcountry;

		geocode(addr, function(geocode) {
			if (geocode) {
				callback(null, {name: escape(account.billingcountry), lat: geocode.lat, lon:geocode.lon});
			} else {
				callback();
			}
		});
	} else {
		callback();
	}
}


function load_accounts(callback) {
	Account.findAll({where: { billingcountry: ['DE','NL','GB']} , limit: 100}).then(function(rows) {
		async.map(rows, geocode_account, callback);
	});
}

function load_contacts(callback) {
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
	load_contacts(function(error, contact_locations) {
		console.log("Locations: ", contact_locations);
		res.render('index', {contact_locations: contact_locations.filter(function(val) { return val })});
	});
});

app.get('/accounts', function(req, res) {

  load_accounts(function(error, account_locations) {

		Account.findAll({where: { billingcountry: ['DE','NL','GB']} , limit: 100})

				.then(function(rows){

				console.log("rows " + JSON.stringify(rows));

				map = new HashMap();
				geomap = new HashMap();
				assoc_array = [];

				for(var i = 0; i < rows.length; i++){

					if("undefined" != typeof assoc_array[rows[i].billingcountry]) {
						map.set(rows[i].billingcountry, assoc_array[rows[i].billingcountry].push(rows[i]));
					}
					else {
						assoc_array[rows[i].billingcountry] = new Array();
						map.set(rows[i].billingcountry, assoc_array[rows[i].billingcountry].push(rows[i]));

					}


				}

				console.log("map " + JSON.stringify(map));
				var mapkeys = map.keys();

				for(var i = 0; i < mapkeys.length; i++){

					console.log("COUNTRY: " + mapkeys[i]);

					//geomap.set(mapkeys[i],geocode_country(mapkeys[i], callback));

					//console.log("GEOMAP: " + JSON.stringify(geomap));


				}

				console.log("account_locations: ", account_locations);
				res.render('accounts', {map: map, account_locations: account_locations.filter(function(val) { return val })});

			});

	});





});


app.get('/create', function(req, res){
  var create_url = 'https://connect.heroku.com/dashboard-next/create-connection';
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
