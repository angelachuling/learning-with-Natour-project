/* eslint-disable prettier/prettier */
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');

dotenv.config({ path: './config.env' });
//need to config environment before using app file


//set up respective password for connecting to cloud db Atlas
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//connecting to db
mongoose
  //.connect(process.env.DATABASE_LOCAL; {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true 
  })
  .then(() => {
    //console.log(con.connections);
    console.log('DB connection successfull');
  });

//Read JSON File
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));

//Import data to DB
const importData = async () => {
    try {
        await Tour.create(tours);
        await User.create(users, {validateBeforeSave: false}); //turn off validator: passwordConfirm and comment out pre-save hook for encrypting pw in new creation
        await Review.create(reviews);
        console.log('Data successfully loaded');
    } catch (err) {
        console.log(err);
    }
    process.exit();
};

//Delete all data from DB
const deleteData = async () => {
    try{
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();

        console.log('Data successfully deleted')
    } catch (err) {
        console.log(err);
    }
    process.exit();

};

//node ./dev-data/data/import-dev-data.js --delete
//node ./dev-data/data/import-dev-data.js --import
//console.log(process.argv);
//process.argv returns an array containing the command line arguments passed when the Node.js process was launched.

if (process.argv[2] === '--import'){
  importData();
} else if (process.argv[2] === '--delete'){
  deleteData();
};


