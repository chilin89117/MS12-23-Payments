require('dotenv').config()
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const upload = require('./middleware/multer');
const setUser = require('./middleware/setUser');
const setLocals = require('./middleware/setLocals');
const shopController = require('./controllers/shopController');
const isAuth = require('./middleware/isAuth');

// express --------------------------------------------------------------------
const app = express();
app.use(helmet());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
// filenames are stored as 'uploads/images/<filename>'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// session and flash middlewares ----------------------------------------------
const store = new MongoDBStore({
  uri: process.env.MONGOURI,
  collection: 'ms12sessions'
});
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store
}));
app.use(flash());

// other middlewares: local variables, Stripe, Multer, csrf -------------------
app.use(setUser);       // set 'req.user' to logged-in user before Stripe
// route for Stripe is here because requiring csrf will cause error
app.post('/create-checkout', isAuth, shopController.postCheckout);
// Multer MUST come before 'csrf'; puts 'image' field in 'req.file'
app.use(upload.single('image'));
const csrfProtection = csrf();
app.use(csrfProtection);
app.use(setLocals);     // set variables 'isLoggedIn' and 'csrfToken' for views

// routes ---------------------------------------------------------------------
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const shopRoutes = require('./routes/shopRoutes');
app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use(shopRoutes);

// templating engine ----------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', 'views');

// 404 error ------------------------------------------------------------------
const errController = require('./controllers/errorsController');
app.use(errController.get404);

// error handing middleware ---------------------------------------------------
app.use((err, req, res, next) => {
  res
    .status(500)
    .render('errors/500', {
      pageTitle: 'MS12-23-Payments 500 Error',
      path: '',
      error: err,
      isLoggedIn: req.session.isLoggedIn
    });
});

// server after db connection -------------------------------------------------
const port = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGOURI, {useNewUrlParser: true, poolSize: 5})
  .then(result => {
    app.listen(port, () => console.log(`MS12-23-Payments on port ${port}...`));
  })
  .catch(err => next(err));
