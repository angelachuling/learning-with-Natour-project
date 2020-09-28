/* eslint-disable prettier/prettier */
const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

//when route with id, it will be checked by this middleware; when without id, this will be skipped.
// router.param('id', tourContoller.checkID)

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
//prefill limit, sort, fields via aliasTopTours function

router.route('/tour-stats').get(tourController.getToursStats);
router.route('/monthly-plan/:year').get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'),tourController.getMonthlyPlan);

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);

router
  .route('/')
  .get(tourController.getAllTours) //1)check Token failed in authController.protect=> globalErrorHandler in app.js => check what error and give corresponding messages respectively in errorController.js. 2)after passing Token check, enter getAllTour operation, 1 error happens => catchAsync catches error and pass next() => globalErrorHandler in app.js => check what error and give respective messages in errorController.js.
  .post(authController.protect, tourController.createNewTour, tourController.createNewTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.restrictTo('admin', 'lead-guide'),tourController.updateTour)
  //
  .delete(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'), 
    tourController.deleteTour);


module.exports = router;
