({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "<head>\n	<style>\n		#item {\n			display: flex;\n			width: 100%;\n		}\n	</style>\n</head>\n\n<div id=\"item\">\n	<img width=\"400px\" height=\"400px\" src=\""
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.item : stack1)) != null ? stack1.image : stack1), depth0))
    + "\" alt=\"image\">\n	<div>\n		<h1>"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.item : stack1)) != null ? stack1.name : stack1), depth0))
    + "</h1>\n		<b>$"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.item : stack1)) != null ? stack1.price : stack1), depth0))
    + "</b>\n	</div>\n</div>";
},"useData":true})