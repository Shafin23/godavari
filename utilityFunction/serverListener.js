const serverListener = (app, port) => {
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`)
    })
}

module.exports = { serverListener }