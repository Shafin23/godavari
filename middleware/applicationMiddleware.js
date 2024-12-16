const express = require("express")
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join("middleware/uploads");
console.log(uploadDir)

const applicationMiddleware = (app) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use(helmet());
    app.use(compression());
    app.use(morgan("dev"));
    app.use(cookieParser());
    app.use("/uploads", express.static(uploadDir));
}
module.exports = { applicationMiddleware }