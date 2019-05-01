# MS12-23-Payments
## Section 23 - Adding Payments

### 0. Continued from [Section 17](https://github.com/chilin89117/MS12-17-Auth)
---
### 1. Run
- `npm start` listening on port 3000
- Uses `dotenv` package for environment variables in `.env` file
- Uses `ejs` templating engine
---
### 2. `npm` packages
- `bcryptjs: ^2.4.3`
- `connect-flash: ^0.1.1`
- `connect-mongodb-session: ^2.1.1`
- `csurf: ^1.10.0`
- `dotenv: ^7.0.0`
- `ejs: ^2.6.1`
- `express: ^4.16.4`
- `express-session: ^1.16.1`
- `express-validator: ^5.3.1`
- `helmet: ^3.16.0`
- `mongoose: ^5.5.5`
- `multer: ^1.4.1`
- `nodemailer: ^6.1.1`
- `pdfkit: ^0.9.1`
- `stripe: ^6.31.1`
---
### 3. Database
- Database: `udemy` on MongoDB Atlas
- Collections: `ms1214prods`, `ms1214users`, `ms1214orders`, `ms12sessions`
  - Stores cart info as embedded document in `ms1214users`
---
### 4. Section 18 (Validation) Changes:
- Uses `express-validator` package
- Uses validation arrays in `middleware` directory
- Uses `oldInputs` object in views to keep previously entered data
- Uses `valErrs` array in views for conditional css classes
- Sanitizes inputs with `trim()` and `normalizeEmail()` in validators
---
### 5. Section 19 (Error Handling) Changes:
- Creates catch-all error-handling middleware `app.use((err, req, res, next) => {})` with `500` error page
- Changes all `.catch(err => console.log(err));` blocks to `.catch(err => next(err));`
---
### 6. Section 20 (File Upload & Download) Changes:
- Adds image file upload with `multer` package with `enctype="multipart/form-data"` for form
  - Saves uploaded images to `/uploads/images` directory
- Generates invoice PDF files from orders with `pdfkit` package
  - Saves invoice PDFs to `/downloads/invoices` directory
- Requests for previously generated invoices are piped from filesystem
- Image files of deleted products are ***not*** removed from filesystem because they are still used by previously generated invoices
---
### 7. Section 21 (Pagination) Changes:
- Adds pagination to `'/'`, `'/products'`, and `'/admin/products'` routes
---
### 8. Section 22 (Async Requests) Changes:
- Add client-side JS to delete product by id and directly removing product from DOM (***not implemented***)
---
### 9. Section 23 (Stripe Payments) Changes:
- Adds payment functionality through Stripe
  - Creates a new checkout page with `Pay with Card` button from Stripe
  - Replaces `create-order` route with `create-checkout` route
    - `create-checkout` route is placed in `app.js` to avoid csrf token error
  - Creates order, submit payment data to Stripe, clear cart, display orders page
