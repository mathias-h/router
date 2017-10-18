const fs = require("mz/fs")
const express = require("express")
const pathtoRegexp = require("path-to-regexp")
const ms = require("ms")
const handlebars = require("handlebars")
const { getView } = require("./shared/view")

const IS_PROD = process.env.NODE_ENV === "production"

function readStream(stream) {
	return new Promise((resolve, reject) => {
		let result = ""
		stream.on("data", b => result += b.toString())
			.on("end", () => resolve(result))
			.on("error", reject)
	})
}

class Router {
	constructor(app, options) {
		this.options = options
		this.app = app
		this.templates = {}
		Router.viewPath = process.cwd() + "/views/"
		this.cache = (() => {
			const store = {}
			return {
				get(key) {
					return store[key]
				},
				set(key, value) {
					store[key] = value
				}
			}
		})()

		if (IS_PROD) {
			const shellContent = fs.readFileSync(Router.viewPath + "shell.html").toString()
			this.shell = handlebars.compile(shellContent)
		}
	}

	async route(name, path, options = {}) {
		const getData = options.data || (() => ({}))
		const maxAge = options.maxAge ? ms(options.maxAge) : null
		let cachedTemplate
		if (IS_PROD) {
			cachedTemplate = await this.getTemplate(name)
		}

		Router.routes.push({ name, path, maxAge })

		this.app.get(path, async(req, res, next) => {
			try {
				let template
				let shell
				if (IS_PROD) {
					template = cachedTemplate
					shell = this.shell
				}
				else {
					template = await this.getTemplate(name)
					shell = await this.getTemplate("shell")
				}
				const params = Object.assign({}, req.params, req.query)
				const result = await getView(name, params, getData, template, shell, this.cache, maxAge)

				res.setHeader("Content-Type", "text/html")
				if (maxAge) {
					res.setHeader("Cache-Control", "public, max-age=" + (result.time - Date.now()))
				}

				res.end(result.content)
			}
			catch (error) {
				next(error)
			}
		})
		this.app.post(`/router/route/${name}/data`, async(req, res, next) => {
			try {
				const params = JSON.parse(await readStream(req))
				res.json(await getData(params))
			}
			catch (error) {
				next(error)
			}
		})

		this.app.get(`/router/route/${name}/view`, async(req, res) => {
			try {
				res.sendFile(Router.viewPath + name + ".html")
			}
			catch (error) {
				next(error)
			}
		})
	}

	async getTemplate(name) {
		const templateContent = (await fs.readFile(Router.viewPath + name + ".html")).toString()
		const template = handlebars.compile(templateContent)
		return template
	}

	static async init(app) {
		app.get("/router/routes", (_, res) => {
			res.json(this.routes.map(route => {
				const keys = []
				return {
					name: route.name,
					maxAge: route.maxAge,
					regex: pathtoRegexp(route.path, keys).toString(),
					keys: keys,
				}
			}))
		})
		app.get("/router/route/shell/view", (_, res) => res.sendFile(this.viewPath + "shell.html"))
		app.get("/router.js", (_, res) => res.sendFile(__dirname + "/sw/router.js"))
		app.get("/router/sw/path-to-regexp.js", (_, res) => res.sendFile(__dirname + "/sw/path-to-regexp.js"))
		app.get("/router/sw/idbkeyval.js", (_, res) => res.sendFile(__dirname + "/sw/idbkeyval.js"))
		app.get("/router/sw/view.js", (_, res) => res.sendFile(__dirname + "/shared/view.js"))
		app.get("/router/sw/handlebars.js", (_, res) => res.sendFile(__dirname + "/node_modules/handlebars/dist/handlebars.min.js"))
	}
}
Router.routes = []
module.exports.Router = Router