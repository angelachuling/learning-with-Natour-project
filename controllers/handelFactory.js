/* eslint-disable prettier/prettier */
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID'), 404);
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //the new updated document is the one that will be returned.
      runValidators: true //The validators run by default when you are creating an instance of a model. We only had to add it because validators do not run by default when updating.
    });

    if(!doc){
      return next(new AppError('No document found with that ID'), 404);
    };

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      },
    });
  });

exports.createOne = Model => 
  catchAsync(async (req, res, next) => {
  
    const doc = await Model.create(req.body);
  
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }  
    });
  });

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if(populateOptions) query = query.populate(populateOptions);
    const doc = await query;
    //const doc = await Model.findById(req.params.id).populate('reviews');

    if(!doc){
      return next(new AppError('No document found with that ID'), 404);
    };

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) => 
  catchAsync(async (req, res, next) => {
    //To allow nested GET reviews on tour (hack)
    let filter = {};
    //req.params.tourId is from nested route
    if(req.params.tourId) filter = {tour: req.params.tourId} //inside a review doc, there is key tour: XXX(id) 

  const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sorting()
      .limitFields()
      .paginate();

  const docs = await features.query //query is the key in features object. it has the final result of the query operations(filtering, sorting ect..)
  //const docs = await features.query.explain(); //.explain() to add detail info about query performance, "nReturned": x and "totalDocsExamined": x should be the same.

  res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
      data: docs,
      },
  });  
  
});