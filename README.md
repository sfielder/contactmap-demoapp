# Contact Mapper

This is a very basic demonstation app for [Heroku Connect](https://www.heroku.com/connect). It is based
on the [Heroku Node starter app](https://github.com/heroku/node-js-getting-started).

The application relies on Heroku Connect to sync Contact records into Postgres. We load contact
records from the db, then use the Google Geolocation API to geocode the address so we can locate
each contact properly on the map.

For better performance address locations are stored back in our database so we only have to look
them up once.

![alt tag](public/screenshot1.png)

## Install

Use the Heroku Button below to clone the app:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/scottpersinger/contactmap-demoapp)

## Provision Heroku Connect

Click on the Heroku Connect addon on your new app to access the Heroku Connect dashboard.

Add a mapping for the `Contact` object in Salesforce, and select these fields:

```
Email
MailingCity
MailingState
MailingStreet
Name
```

And save the mapping. That's it! Once the data is synchronized just reload the Contact Map app to see 200
Contact records placed on a Google Map of the United States.

## Understanding the app

This app accesses data in a Postgres database. To access the database we use
the [Node PG](https://www.npmjs.com/package/pg) postgres driver and the
wonderful [Sequelize](http://sequelize.readthedocs.org/) ORM for Node.

In [index.js](index.js) we define two model classes. One is the `Contact`
class which pulls records from the `salesforce` schema which is synchronized
by Heroku Connect. The second is the `Geocode` class which is simply used to
store geolocation coordinates retrieved from the Google Geolocation API.

Finally the [geocde.js](geocode.js) module takes care of sending a `Contact`
address to the Google Geocode API to retrieve the latitude/longitude for
displaying cards on the map.

The list of Contacts with annotated Lat/Lng coordinates is passed to [index.html](index.html).
The html page contains JS to create the map and annotate it with all the contacts.


