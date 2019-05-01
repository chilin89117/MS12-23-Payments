const path = require('path');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const createPDF = require('../util/createPDF');
const ITEMS_PER_PAGE = 4;

// GET /products
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let numDocs;
  Product
    .countDocuments()
    .then(num => {
      numDocs = num;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/product-list', {
        products,
        pageTitle: 'MS12-23-Payments All Products', 
        path: '/products',
        isLoggedIn: req.session.isLoggedIn,
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

// GET /products/:id
exports.getProduct = (req, res, next) => {
  Product
    .findById(req.params.id)
    .then(prod => {
      res.render('shop/product-detail', {
        prod,
        pageTitle: prod.title,
        path: '/products'
      });
    })
    .catch(err => next(err));
};

// GET /
exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let numDocs;
  Product
    .countDocuments()
    .then(num => {
      numDocs = num;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/index', {
        products, 
        pageTitle: 'MS12-23-Payments Shop', 
        path: '/',
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

// GET /cart (see sample output below)
exports.getCart = (req, res, next) => {
  User
    .findById(req.user._id)
    // get only '_id', 'title', 'price' fields for product (need '_id' to know which to delete)
    .then(user => user
      .populate({path: 'cart.items._pid', select: 'title price'})
      .execPopulate()
    )
    .then(user => {
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'MS12-23-Payments Cart',
        cartItems: user.cart.items,
        flashMsg: req.flash()
      });
    })
    .catch(err => next(err));
};

// POST /add-to-cart
exports.postAddToCart = (req, res, next) => {
  Product
    .findById(req.body.id)
    // use 'req.user' set in 'app.js' because it is a Mongoose object
    // 'req.session.user' does not have access to Mongoose schema
    .then(product => req.user.addToCart(product))
    .then(result => {
      req.flash('success', 'Product added to cart.');
      res.redirect('/cart');
    })
    .catch(err => next(err));
};

// POST /del-cart-item
exports.postDeleteCartItem = (req, res, next) => {
  const {id, qty} = req.body;
  User
    .findById(req.user._id)
    .then(user => user.deleteCartItem(id, qty))
    .then(result => {
      req.flash('success', 'Product removed from cart.');
      res.redirect('/cart');
    })
    .catch(err => next(err));
};

// GET /orders
exports.getOrders = (req, res, next) => {
  Order
    .find({'user._id': req.user._id})
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'MS12-23-Payments Orders',
        orders,
        flashMsg: req.flash()
      });
    })
    .catch(err => next(err));
};

// POST /create-order
exports.postOrder = (req, res, next) => {
  User
    .findById(req.user._id)
    .then(user => user
      .populate({path: 'cart.items._pid', select: '-createdAt -updatedAt'})
      .execPopulate()
    )
    .then(user => {
      // use '_doc' to select the data and avoid other mongoose junk
      const products = user.cart.items.map(i => ({qty: i.qty, ...i._pid._doc}));
      const order = new Order({
        user: {_id: req.user._id, name: req.user.name, email: req.user.email},
        items: products
      });
      return order.save();
    })
    // use 'req.user' set in 'app.js' because it is a Mongoose object
    // 'req.session.user' does not have access to Mongoose schema
    .then(result => req.user.clearCart())
    .then(result => {
      req.flash('success', 'Order placed. Thank you.');
      res.redirect('/orders');
    })
    .catch(err => next(err));
};

// GET /invoice/:id
exports.getInvoice = (req, res, next) => {
  const id = req.params.id;
  Order
    .findById(id)
    .then(order => {
      if(!order) {
        req.flash('error', 'Order not found.');
        return res.redirect('/orders');
      }
      if(order.user._id.toString() !== req.user._id.toString()) {
        req.flash('error', 'Not authorized to view invoice.');
        return res.redirect('/orders');
      }
      const invoiceName = `invoice-${order._id}.pdf`;
      const invoicePath = path.join('downloads', 'invoices', invoiceName);
      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', `inline; filename="${invoiceName}"`);
      // create new invoice pdf, or pipe previously generated invoice through 'res'
      if(!fs.existsSync(invoicePath)) return createPDF(order, invoicePath, res);
      else {
        const invoice = fs.createReadStream(invoicePath);
        invoice.pipe(res);
      }
    })
    .catch(err => {
      if(err.name === 'CastError') {
        req.flash('error', 'Order id is invalid.'); // catch invalid id entered in url
        return res.redirect('/orders');
      }
      next(err);
    });
};

// Section 23: Adding Payments
exports.getCheckout = (req, res, next) => {
  User
    .findById(req.user._id)
    // get only '_id', 'title', 'price' fields for product (need '_id' to know which to delete)
    .then(user => user
      .populate({path: 'cart.items._pid', select: 'title price'})
      .execPopulate()
    )
    .then(user => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'MS12-23-Payments Checkout',
        cartItems: user.cart.items,
        total: user.cart.items.reduce((total, i) => total += i.qty * i._pid.price, 0),
        flashMsg: req.flash()
      });
    })
    .catch(err => next(err));
}

// Section 23: Adding Payments
exports.postCheckout = (req, res, next) => {
  // token is created using Checkout or Elements!
  // get the payment token ID submitted by the form:
  const token = req.body.stripeToken;
  User
    .findById(req.user._id)
    .then(user => user
      .populate({path: 'cart.items._pid', select: '-createdAt -updatedAt'})
      .execPopulate()
    )
    .then(user => {
      // use '_doc' to select the data and avoid other mongoose junk
      const products = user.cart.items.map(i => ({qty: i.qty, ...i._pid._doc}));
      const order = new Order({
        user: {_id: req.user._id, name: req.user.name, email: req.user.email},
        items: products
      });
      return order.save();
    })
    .then(order => {
      // calculate total in cents
      const total = (order.items.reduce((total, i) => total += i.qty * i.price, 0) * 100).toFixed(0);
      const charge = stripe.charges.create({
        amount: total,
        currency: 'usd',
        description: order._id.toString(),
        source: token,
        metadata: {order_id: order._id.toString(), user_id: order.user._id.toString()}
      });
      return req.user.clearCart();
    })
    .then(result => {
      req.flash('success', 'Order placed. Thank you. Nothing will be shipped!!!');
      res.redirect('/orders');
    })
    .catch(err => next(err));
}

// Sample output from 'populate'
// {
//   cart: {
//     items: [
//       {
//         _id: 5c0ab1a6147ef9171459e7ca,
//         _pid: { _id: 5c0aaf084ceeea0aec43f4ce, title: 'aaaaaaaaa', price: 11 },
//         qty: 2
//       }
//     ]
//   },
//   admin: true,
//   _id: 5c0aabf1ba11e22cc0bf05e9,
//   name: 'Abbie',
//   email: 'abbie@example.com',
//   password: '123456',
//   image_url: null,
//   createdAt: 2018-12-07T17:20:49.551Z,
//   updatedAt: 2018-12-07T17:45:46.404Z,
//   __v: 1
// }