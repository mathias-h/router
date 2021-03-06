(() => {
	importScripts("/router/sw/path-to-regexp.js")
	importScripts("/router/sw/handlebars.js")
	importScripts("/router/sw/idbkeyval.js")
	importScripts("/router/sw/view.js")

	let ROUTES
	let SHELL_TEMPLATE

	function matchRoute(url) {
		for (const route of ROUTES) {
			const match = route.regex.exec(url)
			if (match !== null && match[0] !== "") {
				const params = {}
				for (let i = 0; i < route.keys.length; i++) {
					params[route.keys[i].name] = match[i + 1]
				}
				return { route, params }
			}
		}
	}

	function getQueryParams(query) {
		if (!query) return
		const result = {}
		for (const part of query.split("&")) {
			const [key, value] = part.split("=")
			result[key] = value
		}
		return result
	}

	async function getTemplate(name, cache) {
		const templatePath = `/router/route/${name}/template`
		const template = eval(await (await cache.match(templatePath)).text())
		return Handlebars.template(template)
	}

	function parseRegexFromString(regex) {
		const end = regex.lastIndexOf("/")
		const flags = regex.substring(end + 1)
		const content = regex.substring(1, end)
		return new RegExp(content, flags)
	}

	const router = {
		async install() {
			const cache = await caches.open("router")
			ROUTES = (await (await fetch("/router/routes")).json()).map(route =>
				Object.assign(route, { regex: parseRegexFromString(route.regex) }))
			await idbKeyval.set("routes", ROUTES)

			for (const route of ROUTES) {
				await cache.add(`/router/route/${route.name}/template`)
				route.template = await getTemplate(route.name, cache)
				const dataF = async(params) =>
					await (await fetch(`/router/route/${route.name}/data`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(params)
					})).json()
				route.dataF = dataF
			}

			const shellPath = "/router/route/shell/template"
			await cache.add(shellPath)
			SHELL_TEMPLATE = await getTemplate("shell", cache)
		},
		async fetch(request) {
			if (ROUTES === undefined) {
				const cache = await caches.open("router")
				ROUTES = await idbKeyval.get("routes")
				for (const route of ROUTES) {
					route.template = await getTemplate(route.name, cache)
					const dataF = async(params) =>
						await (await fetch(`/router/route/${route.name}/data`, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify(params)
						})).json()
					route.dataF = dataF
				}
				SHELL_TEMPLATE = await getTemplate("shell", cache)
			}

			const url = new URL(request.url)
			const match = matchRoute(url.pathname)

			try {
				if (match) {
					const params = Object.assign(match.params, getQueryParams(url.query))
					const route = match.route
					const { time, data } = await getData(route.name, params, route.dataF, route.maxAge, idbKeyval)
					const result = getView(data, route.template, SHELL_TEMPLATE)
					return new Response(result, {
						headers: {
							"Content-Type": "text/html",
							"Cache-Control": route.maxAge ? "public, max-age=" + (time - Date.now()) : undefined,
							"X-From": "sw" // debug
						}
					})
				}
				else if (url.pathname.startsWith("/router/route/") && url.pathname.endsWith("/content")) {
					const name = url.pathname.match("^\/router\/route\/(.+?)\/content$")[1]
					const route = ROUTES.find(r => r.name === name)
					if (!route) { /* TODO handle no route found */ }
					else {
						const params = await request.json()
						const { time, data } = await getData(route.name, params, route.dataF, route.maxAge, idbKeyval)
						const result = getContent(data, route.template)
						return new Response(JSON.stringify(result), {
							headers: {
								"Content-Type": "text/html",
								"Cache-Control": route.maxAge ? "public, max-age=" + (time - Date.now()) : undefined,
								"X-From": "sw" // debug
							}
						})
					}
				}
			}
			catch (error) {
				if (error.message === "Failed to fetch") {
					if (navigator.onLine === false) {
						// TODO offline fallback
						return new Response("sorry but you are offline right now, try again later")
					}
				}
				else {
					throw error
				}
			}
		}
	}

	self.router = router
})()