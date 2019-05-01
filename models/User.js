const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    image_url: {type: String, required: false},
    admin: {type: Boolean, required: true, default: false},
    passwordResetToken: {type: String, required: false},
    passwordResetTokenExpiration: {type: Date, required: false},
    cart: {
      items: [{
        _pid: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        qty: {type: Number, required: true}
      }]
    }
  },
  {timestamps: true}
);

userSchema.methods.addToCart = function(product) {
  const prodIdxInCart = this.cart.items.findIndex(p => p._pid.toString() === product._id.toString());
  if(prodIdxInCart >= 0) ++this.cart.items[prodIdxInCart].qty;
  else this.cart.items.push({_pid: product._id, qty: 1});
  return this.save();
};

userSchema.methods.deleteCartItem = function(id, qty) {
  const prodIdxInCart = this.cart.items.findIndex(i => i._pid.toString() === id);
  if(this.cart.items[prodIdxInCart].qty > qty && qty) this.cart.items[prodIdxInCart].qty -= qty;
  else this.cart.items.splice(prodIdxInCart, 1);
  return this.save();
};

userSchema.methods.clearCart = function() {
  this.cart = {items: []};
  this.save();
};

module.exports = mongoose.model('User', userSchema, 'ms1214users');
