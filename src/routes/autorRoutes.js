const express = require('express');
const router = express.Router();
const autorController = require('../controllers/autorController');

router.get('/', autorController.getAllAutores);
router.get('/:id', autorController.getAutorById);
router.post('/', autorController.createAutor);
router.put('/:id', autorController.updateAutor);
router.patch('/:id', autorController.patchAutor);
router.delete('/:id', autorController.deleteAutor);

module.exports = router;