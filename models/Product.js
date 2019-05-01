const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    title: {type: String, required: true},
    price: {type: Number, required: true},
    description: {type: String, required: true},
    image_url: {type: String, required: false},
    user_id: {type: Schema.Types.ObjectId, ref: 'User', required: true}
  },
  {timestamps: true}
);

module.exports = mongoose.model('Product', productSchema, 'ms1214prods');
