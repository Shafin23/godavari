const finalErrorHandler = (app) => {
    app.use((err, req, res, next) => {
        console.error(err.stack); // Log the error
        res.status(err.status || 500).json({
            success: false,
            message: err.message || "Internal Server Error",
        });
    });

}
module.exports = { finalErrorHandler }