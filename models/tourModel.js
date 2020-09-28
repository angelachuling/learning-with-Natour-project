/* eslint-disable prettier/prettier */

const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
//const User = require('./userModel')

//schema where data config rule is specified
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true, //unique is not validator
    trim: true,
    maxlength: [40, 'A tour name must have less or equal than 40 characters'],
    minlength: [10, 'A tour name must have more or equal than 40 characters']
    // validate: {
    //   validator: function(value) {
    //     return validator.isAlpha(value.split(' ').join(''));
    //   },
    //   message: 'Tour name must only contain characters.'
    // }
  },
  slug: String,
  duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a group size']
  },
  difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: { //allowed value(s)
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult'
      }
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => Math.round(val * 10) /10 //4.666666, instead of 5, get 46.66666, 47, 4.7
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a name']
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function(val) {
      //'this' only points to current doc on new document creation
      return val < this.price;},
      message: 'Discount price ({VALUE}) must be lower than regular price'
    }
  },
  summery: {
      type: String,
      trim: true
  },
  description: {
      type: String,
      trim: true
  },
  imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
  },
  images: [String],
  createdAt: {
      type: Date,
      default: Date.now(),
      select: false //excluded from API to customer
  },
  startDates: [Date], 
  secretTour: {
    type: Boolean, //true=> secret tour, false=> not secret tour
    default: false
  },
  startLocation: {
    //GeoJSON, type and coordinates are mandatory
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String
  },
  locations: [ 
    {
      type: {
        type: String,
        defualt: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  guides: [ //child referencing
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User' // no need to import userModel into this file
    }
  ]
},
{
  toJSON: {virtuals: true}, //the data is outputted as JSON
  toObject: {virtuals: true} //the data is outputted as object
});

/*
whether to index a certain field or not, we must kind of balance the frequency of queries using that exact field with the cost of maintaining this index, and also with the read-write pattern of the resource.
it's not enough to remove the index from our code, we really need to delete it from the database itself right.
 */
//tourSchema.index({price: 1}); //1 accending order , -1 decending order
tourSchema.index({price: 1, ratingsAverage: -1}); //compound index, can search on both individual index and on combination
tourSchema.index({slug: 1});
tourSchema.index({startLocation: '2dsphere'});

/* virtual property
we cannot use this virtual property in a query, because they're technically not part of the database. We could have done this conversion each time after we query the data in a controller, but that would not be recommended simply because we want to try to keep business logic and application logic much separated as possible.
So that was fat models and thin controllers mentioned before. we should try to keep most business logic in models with  and controllers with as little business logic as possible. And so virtual properties like this are actually a good example of how to achieve that kind of architecture.
knowing the duration in weeks is a business logic because it has to do with the business itself, not with stuff like requests or responses, and so we do the calculation right in the model where it belongs and not in the controller.
*/

//create a virtual field. it is not persisted in the database, but it's only gonna be there as soon as we get the data.
//this data format & type must be also specified in tourSchema
tourSchema.virtual('durationWeeks').get(function() {  //arrow function can not have this key word.
  return this.duration / 7;
});

//Virtual populate, to be applied on getTour query. const tour = await Tour.findById(req.params.id).populate('reviews');
//to insert reviews into tour qiery result. it is not persisted in db.
//keeping a reference to all the child documents on the parent document, but without actually persisting that information to the database.
tourSchema.virtual('reviews', {
  ref: 'Review', //model name of the ref
  foreignField: 'tour', //the foreign field in 'Review' model
  localField: '_id' //the id in curent 'Tour' model
})

//Document middleware: runs before .save() .creat()
//pre-save-hook
tourSchema.pre('save', function(next) {
  //console.log(this); //'this' is the document object before save.
  this.slug = slugify(this.name, {lower: true}); //to create slug property in doc object. as a field in doc object, it has to be first defined in schema.
  next();
})

//+++++++++++++++++++to embed guides's data to the new tour+++++++++++++++++++++++
/*
in schema to add: guides: Array 
in request body
  {
    "name": "Test Tour 11111111",
    "duration": 1,
    "maxGroupSize": 1,
    "difficulty": "easy",
    "price": 200,
    "summary": "Test Tour",
    "imageCover": "tour-1-cover.jpg",
    "ratingsAverage": 4.0,
    "guides": ["5f63c2b16298e608f49debb0", "5f68c86c6e1e5e125400d6b3"]
  }
 */
/*tourSchema.pre('save', async function(next){
  //guidesPromises is an array of promises. 
  const guidesPromises = this.guides.map(async id => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});
*/


//Query middleware
//tourSchema.pre('find', function(next) {
//in order to include all find queries, use regular express /^find/
tourSchema.pre(/^find/, function(next) {
 this.find({secretTour: {$ne: true}}); // 'this' is the current query object.
 this.start = Date.now();
 next();
});

//to populate guides's detail data
tourSchema.pre(/^find/, function(next){
  this.populate({
    path: 'guides', 
    select: '-__v -passwordChangedAt' //- means excluding field
  }); 
  next();
});

//post-find-middleware is executed after pre-find-middleware
tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds.`)
  //console.log(docs);
  next();
});

//Aggregation middleware
tourSchema.pre('aggregate', function(next) {
  //to add one more match to get those with secretTour: false
  this.pipeline().unshift({ $match: { secretTour: {$ne: true}}}); 
  //console.log(this.pipeline()); //'this' is pointing to current aggregation object
  
  next();
})

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;