const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

module.exports = (order, invoicePath, res) => {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(invoicePath));
  doc.pipe(res);
  doc.fontSize(28).text('Invoice', {align: 'center'});
  doc.fontSize(16).text(`Order ID: ${order._id}`, {align: 'center'});
  doc.lineWidth(3)
    .lineCap('round')
    .moveTo(50, 135)
    .lineTo(550, 135)
    .stroke();
  let totalPrice = 0;
  let y = 240;    // initial vertical position of first item
  order.items.forEach(i => {
    totalPrice += i.qty * i.price;
    const image_path = i.image_url.substring(1);  // strip the starting '/' from 'image_url'
    doc.image(image_path, 50, y-70, {width: 40})  // show image above 'title', 'qty' and 'price'
    doc.fontSize(12);
    doc.text(`Title: "${i.title}"`, 50, y);
    doc.text(`Qty: ${i.qty}`, 350, y);
    doc.text(`Price: $ ${i.price}`, 450, y, {align: 'right'});
    y += 100;     // increment vertical position for next item
  });
  doc.moveDown(2);
  doc.fontSize(16)
    .text(`Total: $ ${totalPrice.toFixed(2)}`, 350, y, {align: 'right'});
  doc.end();
};

// this method reads entire file into memory first (kept for reference only)
// fs.readFile(invoicePath, (err, data) => {
//   if(err) return next(err);
//   res.setHeader('content-type', 'application/pdf');
//   res.setHeader('content-disposition', `inline; filename="${invoiceName}"`);
//   res.send(data);
// });

// this method streams file content to 'res' object (kept for reference only)
// const file = fs.createReadStream(invoicePath);
// res.setHeader('content-type', 'application/pdf');
// res.setHeader('content-disposition', `inline; filename="${invoiceName}"`);
// file.pipe(res);