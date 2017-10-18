({"1":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "			<a class=\"item\" href=\"/item/"
    + alias2(alias1((depth0 != null ? depth0.id : depth0), depth0))
    + "\">\n				<img src=\""
    + alias2(alias1((depth0 != null ? depth0.image : depth0), depth0))
    + "\" />\n				<div>\n					<p>"
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "</p>\n					<b>$"
    + alias2(alias1((depth0 != null ? depth0.price : depth0), depth0))
    + "</b>\n				</div>\n			</a>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<head>\n	<style>\n		#items {\n			display: grid;\n			grid-template-columns: repeat(auto-fill, 100px);\n			grid-gap: 16px;\n		}\n\n		#home .item {\n			width: 100px;\n		}\n\n		#home .item img {\n			width: 100px;\n		}\n\n		#home .item div {\n			display: flex;\n			align-items: center;\n		}\n\n		#home .item p {\n			margin-right: 12px;\n		}\n	</style>\n</head>\n\n<div id=\"home\">\n	<h2>The Shop</h2>\n	<div id=\"items\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	</div>\n</div>";
},"useData":true})