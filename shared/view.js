(() => {
	const IS_NODE = typeof global !== "undefined"
	let handlebars

	function hash(str) {
		var hash = 0,
			i, char;
		if (str.length === 0) return hash;
		for (i = 0; i < str.length; i++) {
			char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}

	if (IS_NODE) {
		handlebars = require("handlebars")
	}
	else {
		importScripts("/router/sw/handlebars.js")
		handlebars = Handlebars
	}

	async function getData(name, params, dataF, maxAge, cache) {
		const cacheId = hash(name + JSON.stringify(params))
		if (maxAge !== null) {
			const cached = await cache.get("view-" + cacheId)

			if (cached) {
				if (cached.time > Date.now()) {
					return cached
				}
				else {
					await cache.delete("view-" + cacheId)
				}
			}
		}
		const data = { name, data: await dataF(params) }
		const cached = { time: Date.now() + maxAge, data }
		if (maxAge !== null) {
			await cache.set("view-" + cacheId, cached)
		}
		return cached
	}

	function getView(data, template, shell) {
		const { head, body } = getContent(data, template)

		const shellData = Object.assign({
			head: new handlebars.SafeString(head),
			body: new handlebars.SafeString(body)
		}, data)

		return shell(shellData)
	}

	function getContent(data, template) {
		const content = template(data)
		const headIndex = content.indexOf("</head>")
		let body
		let head
		if (headIndex !== -1) {
			head = content.substring("<head>".length, headIndex)
			body = content.substring(headIndex + "</head>".length)
		}
		else {
			body = content
			head = ""
		}

		return {
			head,
			body
		}
	}

	if (IS_NODE) {
		module.exports.getData = getData
		module.exports.getView = getView
		module.exports.getContent = getContent
	}
	else {
		self.getData = getData
		self.getView = getView
		self.getContent = getContent
	}
})()