const express = require("express")
const app = express()
const fs = require("fs")
const { getTemplate } = require("./template")

app.use(express.static("example"))

app.get("/home/:test", (req, res) => {
	const data =   { test: req.params.test }
	res.writeHead(200, { "content-type": "text/html" })
	getTemplate("home", data).then(content => res.end(content))
})

app.use("/lib", express.static("node_modules"))


app.listen(1024, () =>  {
	console.log("listening")
})