const deleteProduct = btn => {
  const id = btn.parentNode.querySelector('[name=id]').value;
  const csrfToken = btn.parentNode.querySelector('[name=_csrf]').value;
  const productElement = btn.closest('article');
  fetch(`/admin/delete-product/${id}`, {
    method: 'DELETE',
    headers: {'csrf-token': csrfToken}
  })
  .then(result => result.json())  // 'result.json()' returns a Promise
  .then(data => {
    if(data.message === 'success') productElement.parentNode.removeChild(productElement);
    // if(data === 'success') productElement.remove();  // does not work on any IE
  })
  .catch(err => console.log(err));
};
