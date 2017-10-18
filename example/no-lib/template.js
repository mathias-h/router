const isNode = typeof global !== "undefined"
const getFile = (() => {
	if (isNode) {
		Handlebars = require("handlebars")
		const fs = require("fs")
		const util = require("util")
		const readFile = util.promisify(fs.readFile)

		return async filename => (await readFile("example/views" + filename)).toString()
	}
	else {
		importScripts("/lib/handlebars/dist/handlebars.js")

		return async filename => {
			const cached = await caches.match(filename)
			if (cached) {
				return await cached.text()
			}
			else {
				return await (await fetch("/views" + filename)).text()
			}
		}
	}
})()

async function getTemplate(name, data) {
	const shellStr = await getFile("/shell.html")
	const content = Handlebars.compile(await getFile("/" + name + ".html"))(data)
	const template = Handlebars.compile(shellStr)

	const headEndIndex = content.indexOf("</head>")
	let head
	let body

	if (headEndIndex !== -1) {
		head = content.substring("<head>".length, headEndIndex)
		body = content.substring(headEndIndex)
	}
	else {
		head = ""
		body = content
	}

	const shellData = Object.assign({
		head: new Handlebars.SafeString(head),
		body: new Handlebars.SafeString(body)
	}, data)

	return template(shellData)
}

if (isNode) {
	module.exports = { getTemplate }
}