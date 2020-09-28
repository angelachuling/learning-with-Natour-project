/* eslint-disable prettier/prettier */
//to get file data
//const fs = require('fs');

//to get  tour data from db
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');
const factory = require('./handelFactory');
// const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');

// to make a prefilled query critirias for a specific route
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = ' -ratingsAverage, price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
}

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (req, res, next, val) => {
//   //console.log(`Tour id is: ${val}`);

//   if (req.params.id * 1 > tours.length) {
//     //return is a must here in order to stop system continueing to next()
//     return res.status(404).json({
//       status: 'fail',
//       requestedAt: req.requestTime,
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkbody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {

//     //console.log(req.query);

//     /* ------------------1) build query-----------------------------------------*/
//     // moved to module apiFeatures

//     /*------------------2) execute query-----------------------------------------*/
//     const features = new APIFeatures(Tour.find(), req.query)
//         .filter()
//         .sorting()
//         .limitFields()
//         .paginate();
//     const tours = await features.query;
//     //const tours = await query; //query.sort().select().skip().limit()

//     /*------------------3) send response-----------------------------------------*/
//     //even if search result is null, it is not error. so not need to give 404 error.

//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });  
  
// });

exports.getTour = factory.getOne(Tour, {path: 'reviews'});
// exports.getTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findById(req.params.id).populate('reviews');
//     //Tour.findOne({_id: req.params.id})

//     if(!tour){
//       return next(new AppError('Notour found with that ID'), 404);
//     };

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour,
//       },
//     });
//   });

exports.createNewTour = factory.createOne(Tour);
// exports.createNewTour = catchAsync(async (req, res, next) => {
  
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     },
//   });

  // try {
  //   // const newTour = new Tour({});
  //   // newTour.save();
  // // const newTour = await Tour.create(req.body);

  // res.status(201).json({
  //   status: 'success',
  //   data: {
  //     tour: newTour
  //   },
  // });
  // } catch (err) {
  //   res.status(400).json({
  //     status: 'fail',
  //     message: err
  //   })
  // }
// });

exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,//the new updated document is the one that will be returned.
//       runValidators: true //The validators run by default when you are creating an instance of a model. We only had to add it because validators do not run by default when updating.
//     });

//     if(!tour){
//       return next(new AppError('Notour found with that ID'), 404);
//     };

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour
//       },
//     });
// });

exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id);

//     if(!tour){
//       return next(new AppError('Notour found with that ID'), 404);
//     };

//     res.status(204).json({
//       status: 'success',
//       data: null,
//     });  
// });


// statistics made based on pre-set conditions
exports.getToursStats = catchAsync(async (req, res) => {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5}}
      },
      {
        $group: {
          _id: {$toUpper: '$difficulty'}, //group by difficulty and turn the name to be in capital letter 
          //_id: '$difficulty', //group by difficulty
          //_id: 'ratingsAverage', //group by ratingsAverage
          numTours: { $sum: 1}, //counter, 1 for each of the document that's gonna go through this pipeline, one will be added to this num counter.
          numRatings: { $sum: '$ratingsQuantity'},
          avgRating: { $avg: '$ratingsAverage'},
          avgPrice: { $avg: '$price'},
          minPrice: { $min: '$price'},
          maxPrice: { $max: '$price'}
        }
      },
      {
        $sort: { avgPrice: 1} // 1 for accending; sort is based on groups made above, so we should sort by key from above.
      },
      { 
        $match: {_id: {$ne: 'EASY'}} // ne = not equal to, exlcuding 'EASY'
      }

    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      },
    });
});

// statistics on how many tours planned per year
exports.getMonthlyPlan = catchAsync(async (req, res) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates' //make data object based on each value in this array startDates
      },
      {
        $match: { //range based on startDates
          startDates: { 
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: {$month: '$startDates'}, 
          numTourStarts: {$sum: 1},
          tours: {$push: '$name'}
        }
      },
      {
        $addFields: { month: '$_id'}
      },
      {
        $project: {_id: 0} // 0: not shown
      },
      {
        $sort: { numTourStarts: -1}
      },
      {
        $limit: 12 //to control how many output
      }

    ])

    res.status(200).json({
      status: 'success',
      data: {
        plan
      },
    });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.169887,-118.141326/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const{distance, latlng, unit} = req.params;
  const [lat, lng] = latlng.split(',');

  //when mile, radius = distance/3963.2, when km, radius = distance/6378.1
  const radius = unit === 'mi'? distance/3963.2 : distance/6378.1;

  if(!lat || !lng){
    next(new AppError('Please provide latitude and langtitude in the format lat,lng', 400));
  }

  const tours = await Tour.find({startLocation: {$geoWithin: {$centerSphere: [[lng, lat],radius] }}});

  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: {
      data: tours
    }
  })
});