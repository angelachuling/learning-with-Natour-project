/* eslint-disable prettier/prettier */
const crypto = require('crypto');
const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
//const { urlencoded } = require('express'); lesson 194

const signToken = id => {
    //.sign(payload: string | object | Buffer, secretOrPrivateKey: Secret, options?: SignOptions)
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 1000), //so that the browser or the client in general will delete the cookie after it has expired.
        //secure: false, //default value is false
        httpOnly: true // so that the cookie cannot be accessed or modified in any way by the browser. so this is important in order to prevent cross-site scripting attacks. all the browser is gonna do when we set httpOnly to true is to basically receive the cookie, store it and then send it automatically along with every request.
    }

    if(process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    //response to cookie
    res.cookie('jwt', token, cookieOptions);

    //remove password from output
    user.password = undefined;

    //response to body
    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
}

exports.signup = catchAsync(async (req, res, next) => {
//   const newUser = await User.create(req.body);
//.create fires .save(). //during saving process, password will be encrypted.
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
        //passwordChangedAt: req.body.passwordChangedAt
    });

    createSendToken(newUser, 201, res);
});

exports.login = catchAsync( async (req, res, next) => {
    const {email, password} = req.body;

    //1)check if email & password exist
    if(!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    //2)check if user exists && password is correct
    //password field is unselected in schema so need to add it back in this query.
    const user = await User.findOne({email: email}).select('+password'); 
    //const correct = await user.correctPassword(password, user.password); in case of user doesnt exist, we locate it to below if statement.

    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Incorrect email or password', 401));
    }
    //3)if everything is ok, send token to client
    createSendToken(user, 200, res);
});

//protecting tour routes by checking 
exports.protect = catchAsync(async (req, res, next) => {
    //1)getting token and check if it is there. a common practice is to send a token using an http header with the request.
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    };

    if(!token){
        return next(new AppError('Your are not logged in! Please log in to get access', 401));
    };
    //2)verfication token
    //jwt.verify(token, secretOrPublicKey, [options, callback]) => decoded payload
    /*(Synchronous) If a callback is not supplied, function acts synchronously.
    (Asynchronous) If a callback is supplied, function acts asynchronously.
    Since in this project, we have been using async&await(asynchronous) so here we should use the same pattern. in that case, we turn the synchronous to asyn&await pattern by using util module which has a method called promisify(). 
    when success, returns payload object. when fail, returns error
     */
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    //console.log(decoded);

    //3)check if user still exists
    const freshUser = await User.findById(decoded.id);
    if(!freshUser) {
        return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    //4) check if user changed password after the token was issued
    if(freshUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password! Please log in again', 401))
    };

    //grant access to protected route
    //put the entire user data on the request. might be useful. It is used in checking role.
    req.user = freshUser;

    //console.log("protect req.user", req.user);

    next();
});

//check role
//arguments restrictTo() can be more than one, so use ...roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //console.log("role", req.user.role);
        //Determines whether an array(roles) includes a certain element, returning true or false as appropriate.
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action.', 403));
        }
        next();
    }
}

//handle forgotpassword request
exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1) get user based on POSTed email
    const user = await User.findOne({email: req.body.email})
    if(!user){
        return next(new AppError('There is no user with email address.', 404));
    }
    //2) generate the random reset token and save it to db
    const resetToken = user.createPasswordResetToken();
    /*why we have to use the '.save' method. when we make those modifications in node they don't get updated to the database automatically, so where do those modifications get stored.
    when save data, validator will be activated. Since not fields are specified here(only email provide), we need to stop the validator.*/
    await user.save({validateBeforeSave: false}); 
    //3) send it to user's email
    //console.log(req.protocol);
    const resetURL = `${req.protocol}://${req.get('host')}/api/vi/users/resetPassword/${resetToken}`;
    //console.log(resetURL);

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIF you did not forget your password, please ignore this email!`;

    //instead of only sending error, we also reset both the token and the expires property. Therefore add try & catch.
    try{
      await sendEmail({
          email: user.email,
          subject: 'Your password reset token (valid for 10 min)',
          message
      });
    
      res.status(200).json({
          status: 'success',
          message: 'Token sent to email!'
      });
    
    } catch(err){
        //when error happens, we actually no longer need these 2 field which are created during the process of generating random reset token. so we really do not want to persist it to the database. Delete it.
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false}); 

        return next(new AppError('There was an error sending to the email. Try again later!', 500))
        //like an error that's happened on the server, and so it has to be a five code, and 500 is the standard one.
    }
});

exports.resetPassword = (req, res, next) => {

}

//reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    //console.log(hashedToken);

    const user = await User.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpires: {$gt: Date.now()}
    });

    //console.log(user);


    //2) If token has not expired, and there is user, set the new password
    if(!user) {
        return next(new AppError('Token is invalid or has expired.', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save(); //during saving process, 1.invok validator on passworConfirm, 2.password will be encrypted and 3.passwordChangeAt time stamp will be added

    //3)Update changedPasswordAt property for this user

    //4) log the user in and send JWT. At client side POSTMAN, by pm.environment.set("jwt", pm.response.json().token); is prepared to receive this response.
    createSendToken(user, 200, res);

    /*
    process from forgot password to reset passwor
    1. send request via route forgotPassword
    - fill request body: {"email": "sssss@email.com"}
    - after request sent, go to Mailtrap to get token

    2. set up Reset Passwrod request
    - pass token to the end of the resetPassword route
    - fill request body: {"password": "12345678",
    "passwordConfirm": "12345678"}
    - fill Test field: pm.environment.set('jwt', pm.response.json().token); //Store token from response from login/signup/resetPassword in Postman so it makes easy to visit protected route without manual input token.

    */
});

//update password for login user
exports.updatePassword = catchAsync(async (req, res, next) => {
    //1) get user from collection 
    //user already logged in so user is known. this is checked and found by protect middleware. so we have req.user object.
    const user = await User.findById(req.user._id).select('+password');

    //2) check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.currentPassword, user.password))){
        return next(new AppError('Your current password is wrong', 401));
    }

    //3) if so, update password
    user.password = req.body.password; //new password
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    //user.findByIdAndUpdate will not work because it can not invok the valicator function for passwordConfirm due to 'this' in validator pointing to document while 'this' in .findByIdAndUpdate pointing to query object. also, pre-save hooks will not be invoked.

    //4) log user in
    createSendToken(user, 200, res);

    /*
    POSTMAN setting for protected routes like /updateMyPassword or /tours
    1. set authentication: Type: Bearer Token,  Token: {{jwt}}

    POSTMAN setting for receiving and storing token from response.
    1. set pm.environment.set("jwt", pm.response.json().token); in Test 
     */
});




