const { Router } = require("../../index.js")
const express = require("express")
const morgan = require("morgan")

;
(async() => {
	const app = express()
	const router = new Router(app)

	const items = [
		{ id: 1, name: "t-shirt", price: 10.99, image: "/images/t-shirt.jpg" },
		{ id: 2, name: "hoodie", price: 15.99, image: "/images/hoodie.jpg" },
		{ id: 3, name: "pants", price: 12.99, image: "/images/pants.jpeg" }
	]

	app.use(morgan("tiny"))
	app.use("/", express.static("static", {
		maxAge: "1y"
	}))

	await router.route("home", "/", {
		data()  {
			return items
		},
		maxAge: "1d"
	})

	// router.route("search", "/search/:query", {
	// 	data({ query }) {
	// 		return items.filter(item => item.name.startsWith(query))
	// 	}
	// })

	await router.route("item", "/item/:id", {
		data({ id }) {
			const item = items.find(item => item.id === +id)
			return {
				item,
				title: item.name
			}
		}
	})

	// router.route("contact", "/contact")

	await Router.init(app)

	app.listen(1024, () => console.log("listening"))
})().catch(err => { throw err })