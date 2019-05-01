const {body} = require('express-validator/check');
const User = require('../models/User');

module.exports = [
  body('title', 'Title must be 2 to 255 characters long')
    .trim()
    .isLength({min: 2, max: 255}),
  // body('image_url', 'Image URL is not valid')
  //   .trim()
  //   .isURL(),
  body('price', 'Price must be a floating number between 0.01 and 99999.99')
    .isFloat({min: 0.01, max: 99999.99}),
  body('description', 'Description must be 3 to 255 characters long')
    .trim()
    .isLength({min: 3, max: 255}),
];
