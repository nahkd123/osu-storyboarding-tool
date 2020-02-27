const express = require("express");
const port = 8080;

var app = express();
app.use("/html", express.static("html_public"))
app.listen(port, () => {
    console.log("Express App is now listening to port " + port);
});