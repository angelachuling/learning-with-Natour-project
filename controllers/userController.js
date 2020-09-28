/* eslint-disable prettier/prettier */
//to get file data
//const fs = require('fs');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
//const { isNull } = require('util');
const factory = require('./handelFactory');

// const users = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/users.json`)
// );

//function to filter out unwanted key&value pairs in an object
const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  Object.keys(obj).forEach(el => {
    if(allowedFields.includes(el)) newObject[el] = obj[el];
  })
  return newObject;
};

//middleware bfore calling getOne
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
}

//user update user infomation (only name and email) while it is logs in
exports.updateMe = catchAsync(async (req, res, next) => {
  //1) create error if user POSTs password data (try to change password)
  if(req.body.password || req.body.passwordConfirm) {
    return next (new AppError('This route is not for password updates. Please use /updateMyPassword.', 400) );
  };

  //2) filter out unwanted fields
  //need to exclude chance of user/hacker changing more fields (in the req.body) than it is allowed like role.
  const filterBody = filterObj(req.body, 'name', 'email');
  
  //3) update user document
  const updateUser = await User.findByIdAndUpdate(req.user._id, filterBody, {
    new: true, //- true to return the modified document rather than the original
    runValidators: true //Update validators validate the update operation against the model's schema.
  });

  /*Since no password change envoled (pre-save hooks not needed), we can use .findByIdAndUpdate() instead of .save()
  user.name = 'new user';
  await user.save(); 
  */

  res.status(200).json({
    status: 'success',
    data: updateUser
  });

});

//user delete its own account. update active to be false, no need to delete user from db.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {active: false}); //req.user is from protect middelware

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getAllUsers = factory.getAll(User);
// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const users = await User.find();

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });

exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not define! Please use /sigup instead..'
  })
};

//admin update user's all information except password
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
