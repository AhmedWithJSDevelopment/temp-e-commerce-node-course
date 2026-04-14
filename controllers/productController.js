const Product = require('../models/Product');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const path = require('path');

const createProduct = async (req, res) => {
  req.body.user = req.user.userId;
  const product = await Product.create(req.body);
  res.status(StatusCodes.CREATED).json({ product });
};
// const getAllProducts = async (req, res) => {
//   const products = await Product.find({});

//   res.status(StatusCodes.OK).json({ products, count: products.length });
// };
const getAllProducts = async (req, res) => {
  const { search, category, company, shipping, order, price, page } = req.query;

  const queryObject = {};

  // 🔍 SEARCH (name)
  if (search) {
    queryObject.name = { $regex: search, $options: 'i' };
  }

  // 📦 CATEGORY
  if (category && category !== 'all') {
    queryObject.category = category;
  }

  // 🏢 COMPANY
  if (company && company !== 'all') {
    queryObject.company = company;
  }

  // 🚚 FREE SHIPPING
  if (shipping === 'on') {
    queryObject.freeShipping = true;
  }

  // 💰 PRICE
  if (price) {
    queryObject.price = { $lte: Number(price) };
  }

  // 🔢 PAGINATION
  const pageNumber = Number(page) || 1;
  const limit = 6;
  const skip = (pageNumber - 1) * limit;

  let result = Product.find(queryObject);

  // 🔃 SORT
  if (order === 'a-z') {
    result = result.sort('name');
  }
  if (order === 'z-a') {
    result = result.sort('-name');
  }
  if (order === 'high') {
    result = result.sort('-price');
  }
  if (order === 'low') {
    result = result.sort('price');
  }

  const products = await result.skip(skip).limit(limit);

  const totalProducts = await Product.countDocuments(queryObject);
  const pageCount = Math.ceil(totalProducts / limit);

  res.status(StatusCodes.OK).json({
    products,
    pagination: {
      totalProducts,
      pageCount,
      currentPage: pageNumber,
    },
  });
};
const getSingleProduct = async (req, res) => {
  const { id: productId } = req.params;

  const product = await Product.findOne({ _id: productId }).populate('reviews');

  if (!product) {
    throw new CustomError.NotFoundError(`No product with id : ${productId}`);
  }

  res.status(StatusCodes.OK).json({ product });
};
const updateProduct = async (req, res) => {
  const { id: productId } = req.params;

  const product = await Product.findOneAndUpdate({ _id: productId }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new CustomError.NotFoundError(`No product with id : ${productId}`);
  }

  res.status(StatusCodes.OK).json({ product });
};
const deleteProduct = async (req, res) => {
  const { id: productId } = req.params;

  const product = await Product.findOne({ _id: productId });

  if (!product) {
    throw new CustomError.NotFoundError(`No product with id : ${productId}`);
  }

  await product.remove();
  res.status(StatusCodes.OK).json({ msg: 'Success! Product removed.' });
};
const uploadImage = async (req, res) => {
  if (!req.files) {
    throw new CustomError.BadRequestError('No File Uploaded');
  }
  const productImage = req.files.image;

  if (!productImage.mimetype.startsWith('image')) {
    throw new CustomError.BadRequestError('Please Upload Image');
  }

  const maxSize = 1024 * 1024;

  if (productImage.size > maxSize) {
    throw new CustomError.BadRequestError(
      'Please upload image smaller than 1MB'
    );
  }

  const imagePath = path.join(
    __dirname,
    '../public/uploads/' + `${productImage.name}`
  );
  await productImage.mv(imagePath);
  res.status(StatusCodes.OK).json({ image: `/uploads/${productImage.name}` });
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
};
