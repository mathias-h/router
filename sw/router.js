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

	async function setShell(cache) {
		const shellPath = "/router/route/shell/view"
		const shell = await (await cache.match(shellPath)).text()
		SHELL_TEMPLATE = Handlebars.compile(shell)
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
				const viewPath = `/router/route/${route.name}/view`
				await cache.add(viewPath)
				const view = await (await cache.match(viewPath)).text()
				route.template = Handlebars.compile(view)
			}

			const shellPath = "/router/route/shell/view"
			await cache.add(shellPath)
			await setShell(cache)
		},
		async fetch(request) {
			if (ROUTES === undefined) {
				const cache = await caches.open("router")
				ROUTES = await idbKeyval.get("routes")
				for (const route of ROUTES) {
					const viewPath = `/router/route/${route.name}/view`
					await cache.add(viewPath)
					const view = await (await cache.match(viewPath)).text()
					route.template = Handlebars.compile(view)
				}
				await setShell(cache)
			}

			const url = new URL(request.url)
			const match = matchRoute(url.pathname)

			if (match) {
				const params = Object.assign(match.params, getQueryParams(url.query))
				const route = match.route
				const getData = async(params) =>
					await (await fetch(`/router/route/${route.name}/data`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(params)
					})).json()
				try {
					const result = await getView(route, params, getData, SHELL_TEMPLATE, idbKeyval)
					return new Response(result.content, {
						headers: {
							"Content-Type": "text/html",
							"Cache-Control": route.maxAge ? "public, max-age=" + (result.time - Date.now()) : undefined,
							"X-From": "sw" // debug
						}
					})
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
			else if (url.pathname.startsWith("/router/route")) {
				for (const route of ROUTES) {
					if (url.pathname === "/router/route/" + route.name + "/content") {
						// TODO get content
					}
				}
			}
		}
	}

	self.router = router
})()