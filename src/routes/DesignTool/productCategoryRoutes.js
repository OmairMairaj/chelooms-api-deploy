const express = require('express');
const router = express.Router();
const productCategoryController = require('../../controllers/DesignTool/productCategoryController');


// CREATE
router.post('/', productCategoryController.createCategory);

// READ ALL (Use ?all=true in query to fetch inactive ones too)
router.get('/', productCategoryController.getAllCategories);

// REORDER
router.post('/reorder', productCategoryController.reorderCategories);

// READ SINGLE
router.get('/:id', productCategoryController.getCategoryById);

// UPDATE
router.put('/:id', productCategoryController.updateCategory);

// DELETE
router.delete('/:id', productCategoryController.deleteCategory);

module.exports = router;