/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { stringify } = require('querystring');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email.'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email.']
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: 8,
    select: false //it will not be displayed in query result
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide a password.'],
    validate: {
        //'this' only works on SAVE or create a new object. This means anything returns query like findByIdAndUpdate can not be used)
        validator: function(el) {
            return el === this.password;
        },
        message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false //even if it is false, user is still the query result as it is only deactivated but not deleted
  }
});

//encrypt password by using bcryptjs before save in case of creating new password.
userSchema.pre('save', async function(next) {
    //if password has not been modified, no need to encrypt it again so call next()
    /**when creating new and reset password,  this.isModified('password' => true,  */
    /**when saving changed value for fields other than password,  this.isModified('password' => false, so call next()  */

    if(!this.isModified('password')) return next();

    //Has the password with code of 12
    this.password = await bcrypt.hash(this.password, 12);

    //after validation was successful, we actually no longer need passwordConfirm field. so we really do not want to persist it to the database. Delete it.
    this.passwordConfirm = undefined;
    next();
});

// to add time stampe in case of reseting password. 
userSchema.pre('save', function(next){
    /**when creating new,  this.isModified('password' => true, while this.isNew => true, so call next()  */
    /**when reset password,  this.isModified('password' => true,  and this.isNew => false, so if is ignored*/
    /**when saving changed value for fields other than password,  this.isModified('password' => false, so call next()  */
    if(!this.isModified('password') || this.isNew) return next();

  /*saving to the database can be a bit slower than issuing the JSON Web Token, making it so that passwordChangeAt timestamp is sometimes set a bit after the JSON Web Token has been created. And so that will then make it so that the user will not be able to log in using the new token. 
  Remember that in protect middleware for protected route, we check if user changed password after the token was issued. When in reset password we create new token, sometimes it happens that this token is created a bit before the changed password timestamp has actually been created. And so, we just need to fix that by subtracting one second.*/
  //make sure passwordChangeAt is before token being created.
  this.passwordChangedAt = Date.now() - 1000;
  next();

});

//query middleware- pre-find
userSchema.pre(/^find/, function(next){
  //'this' points to current query
  this.find({active: {$ne: false}}); //other users do not have explicitly the active property set to true. so we use $ne: false instead of true only.
  next();
});

//candicatePassword is the login password without encrypt. userPassword is encrypted in db. 
//create instance method. an instance method is basically a method that is gonna be available on all documents of a certain collection. 'this' actually points to the current document.
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
};

//JWTTimestamp is when token was created. This info is at payload object.iat.
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if(this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() /1000, 10);
        console.log(changedTimestamp, JWTTimestamp);
        return JWTTimestamp < changedTimestamp; //true=>changed
    };
    return false; //no change
}

//
userSchema.methods.createPasswordResetToken = function(){
  /*this token is like a reset password that the user can then use to create a new real password. only the user will have access to this token. It really behaves kind of like a password.Just like a password, we should never store a plain reset token in the database.
  it doesn't need such a cryptographically strong encryption method. Because these reset tokens are a way less dangerous attack vector. So we use cryto module instead of bcrypt.

  after encryption process, we store the token in db and compare it with token user provides.
*/
  const resetToken = crypto.randomBytes(32).toString('hex'); //plain text token => user
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // encrypted token => db

  //console.log({resetToken}, this.passwordResetToken);

  //the reset link is only valid for 10 minutes.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //milliseconds

  //console.log(`Current time: ${Date.now()} ExpireAt: ${this.passwordResetExpires}`);

  return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;