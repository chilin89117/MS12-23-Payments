const {ObjectId} = require('mongodb');
const {validationResult} = require('express-validator/check');
const Product = require('../models/Product');
const User = require('../models/User');
const ITEMS_PER_PAGE = 2;

// GET /admin/add-product -----------------------------------------------------
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'MS12-23-Payments Add Product', 
    path: '/admin/add-product',
    editing: false,
    isLoggedIn: true,
    valErrs: [],
    flashMsg: req.flash(),
    oldInputs: {title: '', price: '', description: '', image_url: ''}
  });
};

// POST /admin/add-product ----------------------------------------------------
exports.postAddProduct = (req, res, next) => {
  const {title, price, description} = req.body;
  const image = req.file;   // see sample object in 'middleware/multer.js'
  if(!image) {
    return res
      .status(422)
      .render('admin/edit-product', {
        path: '/admin/add-products',
        pageTitle: 'MS12-23-Payments Products',
        editing: false,
        isLoggedIn: true,
        valErrs: [{param: 'image', msg: 'Attached file is not an image'}],  // manually created
        hasErrors: true,
        flashMsg: req.flash(),
        oldInputs: {title, price, description}
      });
  }
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res
      .status(422)
      .render('admin/edit-product', {
        path: '/admin/add-products',
        pageTitle: 'MS12-23-Payments Products',
        editing: false,
        isLoggedIn: true,
        valErrs: errors.array(),
        flashMsg: req.flash(),
        oldInputs: {title, price, description}
      });
  }
  // serve file from '\uploads\images...' instead of 'admin\uploads\images...'
  const image_url = '\\' + image.path;
  const product = new Product({title, price, description, image_url, user_id: req.user._id});
  product
    .save()
    .then(result => {
      req.flash('success', 'Product successfully added');
      res.redirect('/admin/products');
    })
    .catch(err => next(err));
};

// GET /admin/edit-product ----------------------------------------------------
exports.getEditProduct = (req, res, next) => {
  const editMode = !!req.query.edit;
  Product
    .findById(req.params.id)
    .then(prod => {
      if(prod.deleted) throw new Error('Product not found.');
      res.render('admin/edit-product', {
        pageTitle: 'MS12-23-Payments Edit Product', 
        path: '/admin/edit-product',
        editing: editMode,
        valErrs: [],
        hasErrors: false,
        flashMsg: req.flash(),
        prod
      });
    })
    .catch(err => next(err));
};

// POST /admin/edit-product ---------------------------------------------------
exports.postEditProduct = (req, res, next) => {
  const {id, title, price, description} = req.body;
  const image = req.file;
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res
      .status(422)
      .render('admin/edit-product', {
        path: '/admin/add-products',
        pageTitle: 'MS12-23-Payments Edit Product',
        editing: true,
        isLoggedIn: true,
        valErrs: errors.array(),
        hasErrors: true,
        flashMsg: req.flash(),
        prod: {_id: id, title, price, description},
        oldInputs: {title, price, description}
      });
  }
  Product
    .findById(id)
    .then(product => {
      // user can only update owned products
      if(product.user_id.toString() !== req.user._id.toString()) return Promise.resolve(null);
      // 'image' is null if no new image is chosen, i.e. no update to 'image_url' on database
      const image_url = (image) ? '\\'+ image.path : product.image_url;
      return product.update({$set: {title, price, description, image_url}});
    })
    .then(result => {
      if(!result) req.flash('error', 'You can only update your own products.');
      else req.flash('success', 'Product successfully updated.');
      res.redirect('/admin/products');
    })
    .catch(err => next(err));
};

// GET /admin/products --------------------------------------------------------
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let numDocs;
  Product
    .countDocuments({user_id: req.user._id})  // show only products created by user
    .then(num => {
      numDocs = num;
      return Product
        .find({user_id: req.user._id, deleted: false})
        .sort({createdAt: -1})
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('admin/admin-products', {
        products,
        pageTitle: 'MS12-23-Payments All Products', 
        path: '/admin/products',
        flashMsg: req.flash(),
        currentPage: page,
        hasNextPage: numDocs > (page * ITEMS_PER_PAGE) ? true : false,
        hasPrevPage: page > 1 ? true : false,
        nextPage: page + 1,
        prevPage: page - 1,
        lastPage: Math.ceil(numDocs / ITEMS_PER_PAGE)
      });
    })
    .catch(err => next(err));
};

// POST /admin/delete-product (sets 'deleted' to true and does not delete image)
exports.postDeleteProduct = (req, res, next) => {
  Product
    .findById(req.body.id)
    .then(product => {
      // user can only delete owned products
      if(product.user_id.toString() !== req.user._id.toString()) return Promise.resolve(null);
      // return product.remove();
      return product.update({$set: {deleted: true}});
    })
    .then(result => {
      if(!result) return Promise.resolve(null);
      // delete product from all users' carts
      return User.updateMany({}, {$pull: {'cart.items': {_pid: ObjectId(req.body.id)}}});
    })
    .then(result => {
      if(!result) req.flash('error', 'You can only delete your own products.');
      else req.flash('success', 'Product successfully deleted.');
      res.redirect('/admin/products');
    })
    .catch(err => next(err));
};

// DELETE /admin/delete-product/:id (using client-side JS to directly remove item from DOM)
// This is NOT used, kept here for reference
exports.asyncDeleteProduct = (req, res, next) => {
  Product
  .findById(req.params.id)    // different from POST /admin/delete-product
  .then(product => {
    // user can only delete owned products
    if(product.user_id.toString() !== req.user._id.toString()) return Promise.resolve(null);
    return product.remove();
  })
  .then(result => {
    if(!result) return Promise.resolve(null);
    // delete product from all users' carts
    return User.updateMany({}, {$pull: {'cart.items': {_pid: ObjectId(req.body.id)}}});
  })
  .then(result => {
    if(!result) req.flash('error', 'You can only delete your own products.');
    else req.flash('success', 'Product successfully deleted.');
    res.status(200).json({message: 'success'});    // item removed from DOM, no redirecting
  })
  .catch(err => res.status(500).json({message: 'error'}));    // different from POST /admin/delete-product
};
