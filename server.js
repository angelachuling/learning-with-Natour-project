/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

//errors that occur in our synchronous code but are not handled anywhere are called uncaught exceptions. listening for an uncaught exception should be started at the beginning of everything.
process.on('uncaughtException', err => {
  console.log('Unhandled Rejection Shutting down...');
  console.log(err.name, err.message);
    process.exit(1); //0: success, 1: uncaught exception.
});


dotenv.config({ path: './config.env' });
//need to config environment before using app file
const app = require('./app');

//set up respective password for connecting to cloud db Atlas
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//connecting to db
mongoose
  //.connect(process.env.DATABASE_LOCAL; {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true 
  })
  .then(() => {
    //console.log(con.connections);
    console.log('DB connection successfull');
  });


//model name should be big letter. The .model() function makes a copy of schema. 
//The first argument is the singular name of the collection your model is for. Mongoose automatically looks for the plural, lowercased version of your model name. example: const MyModel = mongoose.model('Ticket', mySchema); Then Mongoose will create the model for your tickets collection, not your ticket collection. Once we have our model, we can then instantiate it, and save it

// //An instance of a model is called a document. 
// const testTour = new Tour({
//   name: 'The Park Camper',
//   // rating: 4.7,
//    price: 497
// })

// //call .save() to save testTour this document to db. .save() resturns a promise.
// testTour.save().then((doc) => {
//     console.log(doc)
//   }).catch((err) => {
//     console.log('Error 😢:', err)
//   })

/*
--different databases or login turned on or off will be based on environment variables.
--by default, Express sets the environment to development.
--the environment variables are really outside the scope of Express.??
--environment variables are global variables that are used to define the environment in which
    a node app is running. so it can be found in server.js.
*/

/*to check what current environment is. 'env' is a variable made by Express.
console.log(app.get('env')); 
*/

/*to check node js environment variables. These variables come from the process core module. They are set at the moment that the process started. we didn't have to require the process module right. It is simply available everywhere automatically. in Express, many packages depend on a special variable called 'env'. So it's a variable that's kind of a convention which should define whether we're in development or in production mode.

// console.log(process.env);

However Express does not really define this variable, and so we have to do that manually.
And there are multiple ways in which we can do it.
1. use the terminal
-- when we use 'nodemon server.js' to start the process. But if you want to set an environment variable for this process, we need to pre-plan that variable to this command.
So, we should run 'NODE_ENV=development nodemon server.js' 'set NODE_ENV=de nodemon server.js'
*/

/*configuration settings for our applications. So whenever our app needs some configuration for stuff that might change based on the environment that the app is running in, we use environment variables. 
=>create a file named 'config.env'
=>define variables inside this file
=> connect this file to server.js by using module 'dotenv'
=> implement the configurations by executing dotenv.config({path: './config.env'});
*/

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//handled unhandled promise rejection (disconnectoin with DB)
//each time that there is an unhandled rejection somewhere in our application, the process object will emit an object called unhandled rejection and so we can subscribe to that event just like this. when app has problem with the database connection,  application is not gonna work at all. We should give the server time to finish all the request that are still pending or being handled at the time,and only after that, the server is then basically killed.
process.on('unhandleRejection', err => {
  console.log('Unhandled Rejection Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1); //0: success, 1: uncaught exception.
  });
});



