importScripts("/template.js")

addEventListener("install", evt => {
	evt.waitUntil((async() => {
		const cache = await caches.open("1")
		cache.addAll([
			"/views/home.html",
			"/views/shell.html",
			"/home-styles.css"
		])
	})())
})

addEventListener("fetch", evt => {
	evt.respondWith((async() => {
		const match = evt.request.url.match(/home\/(\w+)/)
		if (match !== null) {
			const content = await getTemplate("home", { test: match[1] })
			return new Response(content, { headers: { "content-type": "text/html", "x-sw": 1 } })
		}
		else {
			return await caches.match(evt.request) || fetch(evt.request)
		}
	})())
})