class APIFeatures {
  constructor(query, queryString) {
    this.query = query; //Tour.find()
    this.queryString = queryString; //req.query
  }

  filter() {
    const queryObj = { ...this.queryString }; 
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    //***Advance filtering -- range***
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    //let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sorting() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); //to have default sorting instead
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields); //.select('name duration price')
    } else {
      this.query = this.query.select('-__v'); //excluding __v field
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // 1 is default
    const limit = this.queryString.limit * 1 || 100; // 100 is default
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    //page not available is  not a error, so need to make a error for it.
    return this;
  }
}

module.exports = APIFeatures;

/**************************filtering**************************************/
//***simple filerting--equal***
/*performing data query at path by adding data object key=value at the end of the path
//localhost:3000/api/v1/tours?duration=5&difficulty=easy
//console.log(req.query); => {duration: 5, difficulty: 'easy}

to control API filtering, excluding certain query, only data object key names can be the filters*/
// const queryObj = { ...req.query }; //In order to have access to the original value, we need to make a hard copy. if using req.query directly, it might be revised in later stage. or if queryObj = req.query queryObj becoms a reference to req.query, change in queryObject will also happen to req.query.
// const excludedFields = ['page', 'sort', 'limit', 'fields'];
// excludedFields.forEach(el => delete queryObj[el]); //delete operator

// //***Advance filtering -- range***
// let queryStr = JSON.stringify(queryObj); //replace function works with strings hence we use stringify.. then we parse it to convert it again to object
// queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
// console.log(JSON.parse(queryStr));

/**
 * localhost:3000/api/v1/tours?duration[gte]=5&difficulty=easy
 * console.log(req.query); => { duration: { gte: '5' }, difficulty: 'easy' }
 * it is similar to mongodb query {difficult: 'easy', duration: {$gte: 5}}
 * gte, gt, lte, lt
 */

//way 1 by using mongodb query method
// when query is not range, const query = Tour.find(queryObj);
// when query can be either a range or specific
//let query = Tour.find(JSON.parse(queryStr));

/**************************sorting**************************************/
/*localhost:3000/api/v1/tours?sort=price (acending), -price (decending)
in case there are same prices, we need to have a second sorting reference, ratingsAverage
localhost:3000/api/v1/tours?sort=-price,ratingsAverage
req.query.sort => {sort: 'price'} => { sort: '-price,ratingsAverage' }
need to get to sort('-price ratingsAverage')
*/
// if(req.query.sort) {
//   const sortBy = req.query.sort.split(',').join(' ');
//   console.log(sortBy);
//   query = query.sort(sortBy);
// } else {
//   query = query.sort('-createdAt'); //default sorting
// }

/**************************field limiting**************************************/
/* localhost:3000/api/v1/tours?field=name,duration,difficulty,price => only want name, duration , difficulty, price
localhost:3000/api/v1/tours?field=-name,-duration => excluding name and duration
 */
// if(req.query.fields){
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields); //.select('name duration price')
// } else{
//   query = query.select('-__v'); //excluding __v field
// }

/**************************pagination**************************************/
/* localhost:3000/api/v1/tours?page=2&limit=10
1-10=> page1, 11-20 => page2, 21-30=> page3
going to page2, it means to skip pag1 10. so skip = (page - 1) * limit;
*/
//  const page = req.query.page * 1 || 1; // 1 is default
//  const limit = req.query.limit * 1 || 100; // 100 is default
//  const skip = (page - 1) * limit;
//   query = query.skip(skip).limit(limit)

//   if(req.query.page) {
//     const numTours = await Tour.countDocuments();
//     if(skip >= numTours) throw new Error('This page does not exist.'); // Error will be passed to catch below.
//   }

/**************************combining query**************************************/

//way 2 by using mongoose method
/*const tours = await Tour.find()
    .where('duration')
    .equals(5)
    .where('difficulty')
    .equals('easy');
*/
