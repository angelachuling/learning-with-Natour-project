/* eslint-disable prettier/prettier */
//review / rating /createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');
const AppError = require('../utils/appError');

const reviewSchema = new mongoose.Schema({
  review: {
      type: String,
      required: [true, 'Review can not be empty!']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0']
  },
  createdAt: {
      type: Date,
      default: Date.now
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, 'Review must belong to a tour.']
   },
   user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, 'Review must belong to a user.']
   }
},
{
  toJSON: {virtuals: true}, //the data is outputted as JSON
  toObject: {virtuals: true} //the data is outputted as object
}
);

//prevent duplicate review
//tour & user is unique combination
reviewSchema.index({tour: 1, user: 1}, {unique: true});

//to populate guides's detail data
reviewSchema.pre(/^find/, function(next){
  // this.populate({
  //   path: 'tour', 
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // }); 

  //'this'points to current review doc
  this.populate({
    path: 'user',
    select: 'name photo'
  }); //field 'guides' will be populated with guides's detail data instead of ref.ID
  next();
});

//add static functions to model
//calculate ratingsAverage and rantingsQuantiy of a tour each time that a new review is added to that tour or also when a review is updated or deleted
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([    //'this' points to model
    {
      $match: {tour: tourId}
    },
    {
      $group: {
        _id: '$tour', //group by tour
        nRating: { $sum: 1 }, //counter
        avRating:  { $avg: '$rating'}
      }
    }
  ]);
  console.log(stats); //array: [ { _id: 5f71e8f53c9f63108ca4344f, nRating: 1, avRating: 5 } ]

  if(stats.length>0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }

};

//calculate stats when create new review
reviewSchema.post('save', function() {
  //'this'points to current review doc
  //Review.calcAverageRatings(this.tour) //At this point, Review(model) is not yet defined. And if we put this pre-save hook code after the Review declaration then this reviewSchema here  would not contain this middleware, because we would then only be declaring it after the review model was already created.

  //this.constructor stands for the model. 'this' = instance, 'constructor' = class, doc(instance)'s constructor(class) is model.
  this.constructor.calcAverageRatings(this.tour); 

});

//re-calculate stats when update/delte review
//Post middleware gets the doc as the first argument. So the post middleware will get the updated review doc as an argument. 
reviewSchema.post(/^findOneAnd/, async function(doc, next) {
    await doc.constructor.calcAverageRatings(doc.tour); //doc.constructor stands for model
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;