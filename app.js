/* eslint-disable prettier/prettier */
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
//start server, which is defined in another js module.  so it is started by Node server.js. make change in package.json, "start": "nodemon server.js" => npm start
module.exports = app;

//1) universal middlewares

//set security HTTP headers
//Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
app.use(helmet());

//to log request details and show it in console. details about morgan found in Github index.js
//we're always in the same process and the environment variables are on the process. And so the process that is running, so where our application is running is always the same and so this is available 'process.env.NODE_ENV' to us in every single file in the project.
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit request per IP address
//details like remaining request and limit etc. can be seen in POSTMAN response section by Header tab.
const limiter = rateLimit({
  max: 100, // total request
  windowMs: 60 * 60 * 1000, //during one hour
  message: 'Too many requests from this IP. Please try again in an hour!'
})
app.use('/api', limiter);

//Body parser, reading data from body into req.body
//to recognize the incoming Request Object as a JSON Object and parse it to be js object
app.use(express.json({limit: '10kb'})); //express.json() is a method builtin in express

//Data sanitiyation against NoSQL query injection
/*for example: in request body for login: {"email": {"$gt": ""}, "password": "1234567"}, hacker just tries a popular password and he can login without the email.
what this middleware does is to look at the request body, the request query string, and also at Request.Params, and then it will basically filter out all of the dollar signs and dots, because that's how MongoDB operators are written. By removing that, well, these operators are then no longer going to work.*/
app.use(mongoSanitize());

//Data sanitization aginst XSS
/**This will then clean any user input from malicious HTML code, basically. Hacker would try to insert some malicious HTML code with some JavaScript code attached to it.
If that would then later be injected into our HTML site.
Whenever you can, just add some validation to your Mongoose schemas, and that should mostly protect you from cross-site scripting, at least on the server side. */
app.use(xss());

//prevent parameter pollution, like {{URL}}api/v1/tours?sort=duration&sort=price, in this case, sort=duration will be ignored while sort=price will be applied
/**
 we make exception for some fields/property by adding whitelist
 */
app.use(
  hpp({
    whitelist: [
      'duration', 
      'ratingsQuantity', 
      'ratingsAverage', 
      'maxGroupSize', 
      'difficulty',
      'price'
    ]
  })
  );

//to use static files, in this case, `${__dirname}/public` is the root => localhost:300/. so when http://localhost:3000/overview.html is called, static file overview.html will be shown.
app.use(express.static(`${__dirname}/public`));

//to get request time
app.use((req, res, next) => {
  //requesTime is new property  created for request object.
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  next();
  //console.log(req.requestTime);
});

//2) route handlers => tourController.js and userController.js

//3) routes

//1st
// app.get('/api/v1/tours', getAllTours)
// app.get('/api/v1/tours/:id', getTour)
// app.post('/api/v1/tours', createNewTour)
// app.patch('/api/v1/tours/:id', updateTour)
// app.delete('/api/v1/tours/:id', deleteTour)

//2nd using .route() to stack methods which use the same route
/*app
    .route('/api/v1/tours')
    .get(getAllTours)
    .post(createNewTour);

app
    .route('/api/v1/tours/:id')
    .get(getTour)
    .patch(updateTour)
    .delete(deleteTour)
*/

//3rd directing/processing incoming traffic by using rounter which is route middleware
//routers imported from tourRouters.js and userRouters.js
app.use('/api/v1/tours', tourRouter); //once request comes from '/api/v1/tours', tourRouter directs the traffic based on different route
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//to handle unhandled routes, like localhost:3000/api/tours
//this has to be placed after all defined routes. if any defined route is visted, response will be sent and process will be ended. if none of the defined routes is hit while the undefined route is called, it will be handled by below codes.
//all http methods
app.all('*', (req, res, next) => {
  /* 
  1) man made error handler
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
  */

  /*
  2) without using class
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
  */

  // 3) using class to define error, from appError.js
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//Global error handleing middleware, from errorController.js
app.use(globalErrorHandler);
