const express = require("express");
const bcrypt = require("bcrypt");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;
const { v4: uuidv4 } = require("uuid");
const { tryToParseJson, verifyEmail } = require("./functions");

// Add Swagger UI
const swaggerUi = require("swagger-ui-express");
const yamlJs = require("yamljs");
const swaggerDocument = yamlJs.load("./swagger.yml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const expressWs = require("express-ws")(app);

app.use(express.static("public"));
app.use(express.json());

app.ws("/", function (ws) {
  ws.on("message", function (msg) {
    expressWs.getWss().clients.forEach((client) => client.send(msg));
  });
});

const users = [
  {
    id: 1,
    email: "admin",
    password: "$2b$10$0EfA6fMFRDVQWzU0WR1dmelPA7.qSp7ZYJAgneGsy2ikQltX2Duey",
  }, // 12
  {
    id: 2,
    email: "test",
    password: "test",
  }, // 12
];

const tasks = [
  {
    id: 1,
    title: "Task 1",
    description: "Description 1",
    userId: 1,
  },
];

let sessions = [
  // {id: '123', userId: 1}
  { id: "123", userId: 1 },
];

app.post("/users", async (req, res) => {
  // Validate email and password
  if (!req.body.email || !req.body.password)
    return res.status(400).send("Email and password are required");
  if (req.body.password.length < 2)
    return res.status(400).send("Password must be at least 8 characters long");
  if (!req.body.email.match(/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/))
    return res.status(400).send("Email must be in a valid format");

  // Check if email already exists
  if (users.find((user) => user.email === req.body.email))
    return res.status(409).send("Email already exists");

  // Try to contact the mail server and send a test email without actually sending it
  try {
    const result = await verifyEmail(req.body.email);
    if (!result.success) {
      return res.status(400).send("Invalid email: " + result.info);
    }
    console.log("Email verified");
  } catch (error) {
    const errorObject = tryToParseJson(error);
    if (errorObject && errorObject.info) {
      return res.status(400).send("Invalid email: " + errorObject.info);
    }
    return res.status(400).send("Invalid email: " + error);
  }

  // Hash password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(req.body.password, 10);
  } catch (error) {
    console.error(error);
  }

  // Find max id
  const maxId = users.reduce((max, user) => (user.id > max ? user.id : max), 0);

  // Save user to database
  users.push({
    id: maxId + 1,
    email: req.body.email,
    password: hashedPassword,
  });

  res.status(201).end();
});

// POST /sessions
app.post("/sessions", async (req, res) => {
  // Validate email and password
  if (!req.body.email || !req.body.password)
    return res.status(400).send("Email and password are required");

  // Find user in database
  const user = users.find((user) => user.email === req.body.email);
  if (!user) return res.status(404).send("User not found");

  // Compare password
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      // Create session
      const session = { id: uuidv4(), userId: user.id };

      // Add session to sessions array
      sessions.push(session);

      // Send session to client
      res.status(201).send(session);
    } else {
      res.status(401).send("Invalid password");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

function authorizeRequest(req, res, next) {
  // Check that there is an authorization header
  if (!req.headers.authorization)
    return res.status(401).send("Missing authorization header");

  // Check that the authorization header is in the correct format
  const authorizationHeader = req.headers.authorization.split(" ");
  if (authorizationHeader.length !== 2 || authorizationHeader[0] !== "Bearer")
    return res.status(401).send("Invalid authorization header");

  // Get sessionId from authorization header
  const sessionId = authorizationHeader[1];

  // Find session in sessions array
  const session = sessions.find((session) => session.id === sessionId);
  if (!session) return res.status(401).send("Invalid session");

  // Check that the user exists
  const user = users.find((user) => user.id === session.userId);
  if (!user) return res.status(401).send("Invalid session");

  // Add user to request object
  req.user = user;

  // Add session to request object
  req.session = session;

  // Call next middleware
  next();
}
app.get("/tasks", authorizeRequest, (req, res) => {
  // Get tasks for user
  const tasksForUser = tasks.filter((task) => task.userId === req.user.id);

  // Send tasks to client
  res.send(tasksForUser);
});

app.delete("/tasks/:id", authorizeRequest, (req, res) => {
  // Find task in database
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(req.params.id)
  );
  if (taskIndex === -1) return res.status(404).send("Task not found");

  // Check that the task belongs to the user
  if (tasks[taskIndex].userId !== req.user.id)
    return res.status(403).send("Forbidden");

  // Remove task from tasks array
  tasks.splice(taskIndex, 1);

  // Send delete event to clients
  expressWs
    .getWss()
    .clients.forEach((client) =>
      client.send(JSON.stringify({ event: "delete", id: tasks.id }))
    );

  res.status(204).end();
});

app.delete("/sessions", authorizeRequest, (req, res) => {
  // Remove session from sessions array
  sessions = sessions.filter((session) => session.id !== req.session.id);

  res.status(204).end();
});

app.post("/tasks", authorizeRequest, (req, res) => {
  // Validate title and content
  if (!req.body.title || !req.body.content)
    return res.status(400).send("Title and content are required");

  // Find max id
  const maxId = tasks.reduce((max, task) => (task.id > max ? task.id : max), 0);

  // Save task to database
  const task = {
    id: maxId + 1,
    title: req.body.title,
    content: req.body.content,
    userId: req.user.id,
  };

  //Add task to tasks array
  tasks.push(task);

  // Send create event to client
  expressWs
    .getWss()
    .clients.forEach((client) =>
      client.send(JSON.stringify({ event: "create", task }))
    );

  // Send task to client
  res.status(201).send(task);
});

app.put("/tasks/:id", authorizeRequest, (req, res) => {
  // Validate title and content
  if (!req.body.title || !req.body.content) {
    return res.status(400).send("Title and content are required");
  }

  // Find task in database
  const taskId = parseInt(req.params.id);
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).send("Task not found");
  }

  const task = tasks[taskIndex];

  // Check that the task belongs to the user
  if (task.userId !== req.user.id) {
    return res.status(403).send("Forbidden");
  }

  // Update task in tasks array
  task.title = req.body.title;
  task.content = req.body.content;

  // Send update event to clients
  expressWs
    .getWss()
    .clients.forEach((client) =>
      client.send(JSON.stringify({ event: "update", task }))
    );

  // Send task to client
  res.send(task);
});

app.listen(port, () => {
  console.log(
    `App running at http://localhost:${port}. Documentation at http://localhost:${port}/docs`
  );
});

module.exports = app;
