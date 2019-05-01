// Middleware to set 'req.user' to logged-in user
const User = require('../models/User');

module.exports = (req, res, next) => {
  if(req.session.user) User
    .findOne(req.session.user._id)
    .then(user => {
      if(user) req.user = user;
      next();
    })
    .catch(err => next(err));
  else next();
};