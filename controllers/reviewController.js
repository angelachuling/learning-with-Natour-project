/* eslint-disable prettier/prettier */
const Review = require('../models/reviewModel');
const factory = require('./handelFactory');
//const catchAsync = require('../utils/catchAsync');

//get all reviews for all tours or one tour
exports.getAllReviews = factory.getAll(Review);
// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};
//   //req.params.tourId is from nested route
//   if(req.params.tourId) filter = {tour: req.params.tourId} //inside a review doc, there is key tou: XXX(id) 

//   const reviews = await Review.find(filter); //search by {tour:id}
//   console.log("reviews result", reviews);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }
//   });
// });

exports.setTourUserIds = (req, res, next) => {
    //allow nested routes
  //{{URL}}api/v1/tours/:tourID/reviews
  //in postman req body, {"review": "Fantastic!!", "rating": 3} 
  if(!req.body.tour) req.body.tour = req.params.tourId;
  if(!req.body.user) req.body.user = req.user.id; //req.user is from protect middelware
  console.log("req.body.tour, req.body.user", req.body.tour, req.body.user)

  next();
}

exports.createNewReview = factory.createOne(Review);
// exports.createNewReview = catchAsync(async (req, res, next) => {
//allow nested routes
//{{URL}}api/v1/tours/:tourID/reviews
//in postman req body, {"review": "Fantastic!!", "rating": 3} 
// if(!req.body.tour) req.body.tour = req.params.tourId;
// if(!req.body.user) req.body.user = req.user.id; //req.user is from protect middelware

//   const newReview = await Review.create(req.body); // until here, req.body becomes {"review": "Fantastic!!", "rating": 3, "tour": req.params.tourId, "user": req.user.id} 

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview
//     }
//   })
// });

exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);