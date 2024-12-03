const express = require("express")
const app = express()
require("dotenv").config()
const port = process.env.PORT || 5000

const { connectDb } = require("./utilityFunction/connectDb")
const { serverStabilityChecker } = require("./utilityFunction/serverStabilityChecker")
const { serverListener } = require("./utilityFunction/serverListener")
const { finalErrorHandler } = require("./utilityFunction/finalErrorHandler")
const { applicationMiddleware } = require("./middleware/applicationMiddleware")
const { routeHandlingMiddleware } = require("./middleware/routeHandlingMiddleware")


// middleware
applicationMiddleware(app) // application middleware
routeHandlingMiddleware(app) // routehandler middleware

// connect to the database
connectDb()

// Final error handler 
finalErrorHandler(app)

// check if the server is running or not
serverStabilityChecker(app)
serverListener(app, port)



