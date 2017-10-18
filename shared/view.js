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

	async function getView(route, params, getData, shell, cache) {
		let cached
		let cacheId

		if (route.maxAge !== null) {
			cacheId = hash(route.name + JSON.stringify(params))
			cached = await cache.get("view-" + cacheId)
		}

		if (route.maxAge === null || cached === undefined || cached.time < Date.now()) {
			const data = { name: route.name, data: await getData(params) }
			const content = route.template(data)
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
			const shellData = Object.assign({
				head: new handlebars.SafeString(head),
				body: new handlebars.SafeString(body)
			}, data)

			const time = Date.now() + route.maxAge
			cached = {
				content: shell(shellData),
				time
			}
			if (route.maxAge !== null) {
				await cache.set("view-" + cacheId, cached)
			}
		}

		return cached
	}

	if (IS_NODE) {
		module.exports.getView = getView
	}
	else {
		self.getView = getView
	}
})()