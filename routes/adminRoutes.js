const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAuth = require('../middleware/isAuth');
const validateAddProduct = require('../middleware/validateAddProduct');

router.get('/add-product', isAuth, adminController.getAddProduct);
router.post('/add-product',  isAuth, validateAddProduct, adminController.postAddProduct);
router.get('/edit-product/:id', isAuth, adminController.getEditProduct);
router.post('/edit-product', isAuth, validateAddProduct, adminController.postEditProduct);
router.post('/delete-product', isAuth, adminController.postDeleteProduct);
router.delete('/delete-product/:id', isAuth, adminController.asyncDeleteProduct);
router.get('/products', isAuth, adminController.getProducts);

module.exports = router;
