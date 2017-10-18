importScripts("/router.js")

addEventListener("install", evt => {
	evt.waitUntil((async() => {
		await router.install()
	})())
})

addEventListener("fetch", evt => {
	evt.respondWith((async() => {
		try {
			const view = await router.fetch(evt.request)
			if (view) return view
		}
		catch (error) {
			console.error(error)
			return new Response(error.message + "\n" + error.stack, {
				status: 500
			})
		}

		return await fetch(evt.request)
	})())
})