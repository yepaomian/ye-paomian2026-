(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-links');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  // Confirm before destructive forms
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        e.preventDefault();
      }
    });
  });

  // --- Invoice line items ---
  var itemsContainer = document.getElementById('items');
  var addBtn = document.getElementById('add-item');
  var template = document.getElementById('item-row-template');

  function reindex() {
    if (!itemsContainer) return;
    itemsContainer.querySelectorAll('.item-row').forEach(function (row, i) {
      row.querySelectorAll('input').forEach(function (input) {
        var field = input.name.match(/\[(\w+)\]$/);
        if (field) {
          input.name = 'items[' + i + '][' + field[1] + ']';
        }
      });
    });
  }

  if (itemsContainer && addBtn && template) {
    addBtn.addEventListener('click', function () {
      var node = template.content.firstElementChild.cloneNode(true);
      itemsContainer.appendChild(node);
      reindex();
    });

    itemsContainer.addEventListener('click', function (e) {
      if (e.target.classList.contains('remove-item')) {
        var row = e.target.closest('.item-row');
        if (row) row.remove();
        reindex();
      }
    });
  }

  // --- Template picker visual selection ---
  document.querySelectorAll('.template-option input[type="radio"]').forEach(function (input) {
    input.addEventListener('change', function () {
      document.querySelectorAll('.template-option').forEach(function (opt) {
        opt.classList.remove('selected');
      });
      input.closest('.template-option').classList.add('selected');
    });
  });
})();
