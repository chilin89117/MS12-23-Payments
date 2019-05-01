exports.get404 = (req, res, next) => {
  res
    .status(404)
    .render('errors/404', {
      pageTitle: 'MS12-23-Payments 404 Error',
      path: '',
      isLoggedIn: req.session.isLoggedIn
    });
};
