const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
require('dotenv').config()
const port = process.env.PORT || 3000

// Add Swagger UI
const swaggerUi = require('swagger-ui-express');
const yamlJs = require('yamljs');
const {verifyEmail, tryToParseJson} = require("./functions");
const swaggerDocument = yamlJs.load('./swagger.yml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static('public'))
app.use(express.json())
let users = [{
    "id": 1,
    "email": "email@example.com",
    "password": "pass123"
}];

app.post('/users', async (req, res) => {

    // Validate email and password
    if (!req.body.email || !req.body.password) return res.status(400).send('Email and password are required')
    if (req.body.password.length < 8) return res.status(400).send('Password must be at least 8 characters long')
    if (!req.body.email.match(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)) return res.status(400).send('Email must be in a valid format')

    // Check if email already exists
    if (users.find(user => user.email === req.body.email)) return res.status(409).send('Email already exists')

    // Try to contact the mail server and send a test email without actually sending it
    try {
        const result = await verifyEmail(req.body.email);
        if (!result.success) {
            return res.status(400).send('Invalid email: ' + result.info)
        }
        console.log('Email verified')
    } catch (error) {
        const errorObject = tryToParseJson(error)
        if (errorObject && errorObject.info) {
            return res.status(400).send('Invalid email: ' + errorObject.info)
        }
        return res.status(400).send('Invalid email: ' + error)
    }

    // Hash password
    let hashedPassword
    try {
        hashedPassword = await bcrypt.hash(req.body.password, 10);
    } catch (error) {
        console.error(error);
    }

    // Find max id
    const maxId = users.reduce((max, user) => user.id > max ? user.id : max, users[0].id)

    // Save user to database
    users.push({id: maxId + 1, email: req.body.email, password: hashedPassword})

    res.status(201).end()

})
app.listen(port, () => {
    console.log(`App running at http://localhost:${port}. Documentation at http://localhost:${port}/docs`)
})

