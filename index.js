const fs = require("mz/fs")
const express = require("express")
const pathtoRegexp = require("path-to-regexp")
const ms = require("ms")
const handlebars = require("handlebars")
const { getView, getData, getContent } = require("./shared/view")
const { execFile } = require("mz/child_process")
const pathLib = require("path")

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
	}

	async route(name, path, options = {}) {
		const dataF = options.data || (() => ({}))
		const maxAge = options.maxAge ? ms(options.maxAge) : null
		let { template, regex, keys } = await Router.addRoute(name, path, maxAge)

		this.app.get(regex, async(req, res, next) => {
			const params = {}
			for (let i = 0; i < keys.length; i++) {
				params[keys[i].name] = req.params[i]
			}

			if (!IS_PROD) {
				template = await Router.compileTemplate(name)
				Router.shell = await Router.compileTemplate("shell")
			}

			try {
				const { time, data } = await getData(name, params, dataF, maxAge, Router.cache)
				const result = getView(data, template, Router.shell)

				res.setHeader("Content-Type", "text/html")
				if (maxAge) {
					res.setHeader("Cache-Control", "public, max-age=" + (time - Date.now()))
				}

				res.end(result)
			}
			catch (error) {
				next(error)
			}
		})
		this.app.post(`/router/route/${name}/data`, async(req, res, next) => {
			try {
				const params = JSON.parse(await readStream(req))
				const { time, data: { data } } = await getData(name, params, dataF, maxAge, Router.cache)
				if (maxAge) {
					res.setHeader("Cache-Control", "public, max-age=" + (time - Date.now()))
				}
				res.json(data)
			}
			catch (error) {
				next(error)
			}
		})

		this.app.post(`/router/route/${name}/content`, async(req, res, next) => {
			try {
				if (!IS_PROD) {
					template = await Router.compileTemplate(name)
					Router.shell = await Router.compileTemplate("shell")
				}

				const params = JSON.parse(await readStream(req))
				const { time, data } = await getData(name, params, dataF, maxAge, Router.cache)
				const result = getContent(data, template)
				if (maxAge) {
					res.setHeader("Cache-Control", "public, max-age=" + (time - Date.now()))
				}
				res.json(result)
			}
			catch (error) {
				next(error)
			}
		})

		this.app.get(`/router/route/${name}/template`, async(req, res, next) => {
			try {
				res.sendFile(`${Router.compiledViewPath}/${name}.js`)
			}
			catch (error) {
				next(error)
			}
		})
	}

	static async compileTemplate(name) {
		try {
			await fs.mkdir(this.compiledViewPath)
		}
		catch (error) {}

		const inputPath = `${this.viewPath}/${name}.html`
		const outputPath = `${this.compiledViewPath}/${name}.js`
		const content = (await fs.readFile(inputPath)).toString()
		const compiled = "(" + handlebars.precompile(content) + ")"
		await fs.writeFile(outputPath, compiled)
		return handlebars.template(eval(compiled))
	}

	static async addRoute(name, path, maxAge) {
		const keys = []
		const regex = pathtoRegexp(path, keys)
		const template = await this.compileTemplate(name)
		this.routes.push({ name, regex: regex.toString(), keys, maxAge })

		return {
			template,
			regex,
			keys
		}
	}

	static async init(app) {
		this.shell = await this.compileTemplate("shell")

		app.get("/router/routes", (_, res) => res.json(this.routes))
		app.get("/router/route/shell/template", (_, res) => res.sendFile(`${this.compiledViewPath}/shell.js`))
		app.get("/router.js", (_, res) => res.sendFile(__dirname + "/sw/router.js"))
		app.use("/router/sw", express.static(__dirname + "/sw"))
		app.use("/router/sw", express.static(__dirname + "/shared"))
		app.get("/router/sw/handlebars.js", (_, res) => res.sendFile(__dirname + "/node_modules/handlebars/dist/handlebars.min.js"))
	}
}
Router.routes = []
Router.viewPath = pathLib.normalize(process.cwd() + "/views")
Router.compiledViewPath = pathLib.normalize(Router.viewPath + "/../views-compiled")
Router.cache = (() => {
	const store = {}
	return {
		get(key) {
			return store[key]
		},
		set(key, value) {
			store[key] = value
		},
		delete(key) {
			delete store[key]
		}
	}
})()
module.exports.Router = Router