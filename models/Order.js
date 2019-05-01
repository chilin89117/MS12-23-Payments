const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    items: [{
      _id: {type: Schema.Types.ObjectId, required: true},
      title: {type: String, required: true},
      price: {type: Number, required: true},
      description: {type: String, required: true},
      image_url: {type: String, required: true},
      user_id: {type: Schema.Types.ObjectId, required: true},
      qty: {type: Number, required: true}
    }],
    user: {
      _id: {type: Schema.Types.ObjectId, required: true},
      name: {type: String, required: true},
      email: {type: String, required: true},
    }
  },
  {timestamps: true}
);

module.exports = mongoose.model('Order', orderSchema, 'ms1214orders');
