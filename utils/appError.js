class AppError extends Error {
  constructor(message, statusCode) {
    //statusCode is from Mongoose
    super(message); //right here calling the parent class, and the parent class is error, and whatever we pass into it is gonna be the message property.by doing this parent call we already set the message property to our incoming message.

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    /*In case more methods will be added inside this AppError class, Error.captureStackTrace(this, this.constructor); can stop showing more details those methods in the stack trace. This is useful because you can use it to hide internal implementation details that are not relevant to your users.
    .*/
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
