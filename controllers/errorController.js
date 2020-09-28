/* eslint-disable prettier/prettier */
const AppError = require('../utils/appError');

const handleCastErrorDB = err =>{
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicatedFieldsDB = err => {
  //console.log(err);
  //consol.log(err.errmsg.match(/(["'])(\\?.)*?\1/));
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  //Object.values() returns an array
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
}

const handleJWTError = () => new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again', 401);

const sendErrorDev = (err, res) =>{
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  //operational error, send message to client
  if (err.isOperational) {
    //1) log error
    console.error("ERROR", err);
    //Send generic message
   // console.log(err.message);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });  
    //programming or other unknown error, dont leak error details to client
    } else {
      //1) log error
      console.error('ERROR', err);
      //Send generic message
        res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });  
        }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; //use defined code (defined in getTour & updateTour & deletTour) or if not defined, use default code 500 which means internal server error
  err.status = err.status || 'error'; 
  console.log(err);

  if(process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if(process.env.NODE_ENV === 'production') {
    //let error = Object.create(err); //creates a new object with the "err" object as its prototype.
    //let error = {...err}; //destructures the properties from "err" into a new object.
    /**The message property isn't defined on err since err is an instance of our AppError class, it's defined in the Error class that our AppError class extends.
    By spreading the err object, we're only spreading the properties defined in the AppError class but not the Error class we extend. The simplest solution is to just not spread the err object:
    let error = err;*/
    let error = err;    

    //to give meaningful message to client in case of CastError (search by wrong id)
    if(error.name === 'CastError') error = handleCastErrorDB(error);

    //to give meaningful message to client in case of error 11000 (create with duplicate name)
    //need to use the code because that tells what type of MongoError occurred.
    if(error.code === 11000) error = handleDuplicatedFieldsDB(error);

    //to give meaningful message to client in case of ValidationError (giving wrong value for defined fields)
    if(error.name === 'ValidationError') error = handleValidationErrorDB(error);

    //when Token is wrong
    if(error.name === 'JsonWebTokenError') error = handleJWTError();

    //when Token expired
    if(error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    
    //console.log(error);
    sendErrorProd(error, res);

  }

  
};