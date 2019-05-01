const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const isAuth = require('../middleware/isAuth');

router.get('/', shopController.getIndex);
router.get('/products/:id', shopController.getProduct);
router.get('/products', shopController.getProducts);
router.get('/cart', isAuth, shopController.getCart);
router.post('/add-to-cart', isAuth, shopController.postAddToCart);
router.post('/del-cart-item', isAuth, shopController.postDeleteCartItem);
router.get('/orders', isAuth, shopController.getOrders);
router.post('/create-order', isAuth, shopController.postOrder);
router.get('/invoice/:id', isAuth, shopController.getInvoice);
router.get('/checkout', isAuth, shopController.getCheckout);
module.exports = router;
