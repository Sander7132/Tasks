const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 3000

// Add Swagger UI
const swaggerUi = require('swagger-ui-express');
const yamlJs = require('yamljs');
const swaggerDocument = yamlJs.load('./swagger.yml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static('public'))
app.use(express.json())

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}. Documentation at http://localhost:${port}/docs`)
})

