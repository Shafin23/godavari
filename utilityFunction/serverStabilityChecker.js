const serverStabilityChecker = (app) => {
    // check if the server is running or not
    app.get("/", async (req, res) => {
        res.json({
            success: true,
            message: "server is running"
        })
    })
}
module.exports = { serverStabilityChecker }