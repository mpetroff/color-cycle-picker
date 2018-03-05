var canvas = document.getElementById('canvas');
var swatchList = document.getElementById('swatchlist');
var colorDots = document.getElementById('colorDots');
var sliderVal = 35;

Sortable.create(swatchList, {
    //filter: '.js-remove',
    filter: evt => evt.target.className == 'js-remove' || evt.target.className == 'js-edit',
    onFilter: function(evt) {
        if (evt.target.className == 'js-remove') {
            for (var i = 0; i < colors.length; i++) {
                if (colors[i] == evt.item.dataset.color) {
                    colors.splice(i, 1);
                    render();
                }
            }
            evt.item && evt.item.parentNode.removeChild(evt.item);
            updateViz(colors);
        } else {
            // TODO: open color swatch edit dialog
        }
    },
    onUpdate: function(evt) {
        colors = Array.prototype.map.call(evt.target.childNodes, x => d3.jab(x.dataset.color));
        updateViz(colors);
    }
});

var colors = [];

function minDist(jab) {
    var min_dist = 9999;
    for (var j = 0; j < colors.length; j++)
        min_dist = Math.min(min_dist, jab.de(colors[j]));
    return min_dist;
}

function minLightnessDist(jab) {
    var min_dist = 9999;
    for (var j = 0; j < colors.length; j++)
        min_dist = Math.min(min_dist, Math.abs(jab.l - colors[j].l));
    return min_dist;
}

function coordToJab(coords) {
    var width = canvas.width,
        height = canvas.height,
        x = coords[0],
        y = coords[1];
    return d3.jab(sliderVal, x/width * 100 - 50, (height - y)/height * 100 - 50);
}


d3.select('#colorDots').on('mousemove', function() {
    var jab = coordToJab(d3.mouse(this));
    var c = jab.rgb();
    
    var min_dist = minDist(jab);
    
    var cs = colors.slice();
    if (min_dist < 20 || !c.displayable()) {
        colorDots.style.cursor = 'default';
    } else {
        colorDots.style.cursor = 'crosshair';
        cs.push(jab);
    }
    updateViz(cs);
    
    
});

function colorToHex(c) {
    var r = Math.round(c.r).toString(16),
        g = Math.round(c.g).toString(16),
        b = Math.round(c.b).toString(16);
    r = r.length == 1 ? 0 + r : r;
    g = g.length == 1 ? 0 + g : g;
    b = b.length == 1 ? 0 + b : b;
    return '#' + r + g + b;
}

var vizLightness = d3.select("#vizLightness");
var vizLightnessGray = vizLightness.append("g")
    .attr("transform", "translate(0," + 20 + ")");
var vizLightnessColor = vizLightness.append("g")
    .attr("transform", "translate(0," + 40 + ")");

function updateViz(c) {
    // Large swatches
    var swatches = d3.select('#vizLargeSwatches');
    // Resize to fit
    swatches.style("height", c.length * 50 + 'px');
    // Update contents
    var rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i*50)
        .attr("width", "100%")
        .attr("height", 50)
      .merge(rects)
        .attr("fill", d => d.rgb().toString());

    // Medium swatches
    var swatches = d3.select('#vizMediumSwatches');
    // Resize to fit
    swatches.style("height", Math.ceil(c.length / 3) * 35 + 'px');
    // Update contents
    rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("x", (d, i) => (i % 3) * 35)
        .attr("y", (d, i) => Math.floor(i / 3) * 35)
        .attr("width", 30)
        .attr("height", 30)
      .merge(rects)
        .attr("fill", d => d.rgb().toString());

    // Small swatches
    var swatches = d3.select('#vizSmallSwatches');
    // Resize to fit
    swatches.style("height", Math.ceil(c.length / 3) * 35 + 'px');
    // Update contents
    rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("x", (d, i) => (i % 3) * 35 + 10)
        .attr("y", (d, i) => Math.floor(i / 3) * 35 + 10)
        .attr("width", 10)
        .attr("height", 10)
      .merge(rects)
        .attr("fill", d => d.rgb().toString());

    // Circle swatches
    var swatches = d3.select('#vizCircles');
    // Resize to fit
    swatches.style("height", Math.ceil(c.length / 3) * 35 + 'px');
    // Update contents
    var circles = swatches.selectAll("circle")
      .data(c);
    circles.exit().remove();
    circles.enter().append("circle")
        .attr("cx", (d, i) => (i % 3) * 35 + 15)
        .attr("cy", (d, i) => Math.floor(i / 3) * 35 + 15)
        .attr("r", 5)
        .attr("fill", "none")
        .attr("stroke-width", 2)
      .merge(circles)
        .attr("stroke", d => d.rgb().toString());

    // Line swatches
    var swatches = d3.select('#vizLines');
    // Resize to fit
    swatches.style("height", c.length * 20 + 'px');
    // Update contents
    var rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i*20)
        .attr("width", "100%")
        .attr("height", 2)
      .merge(rects)
        .attr("fill", d => d.rgb().toString());

    // Vertical line swatches for lightness visualization
    var swatches = vizLightnessGray;
    // Update contents
    var rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("y", 0)
        .attr("width", 2)
        .attr("height", 20)
      .merge(rects)
        .attr("x", d => sliderScale(d.J) + sliderMargin.left - 1)
        .attr("fill", d => d3.jab(d.J, 0, 0).rgb().toString());
    var swatches = vizLightnessColor;
    // Update contents
    var rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("y", 0)
        .attr("width", 2)
        .attr("height", 20)
      .merge(rects)
        .attr("x", d => sliderScale(d.J) + sliderMargin.left - 1)
        .attr("fill", d => d.rgb().toString());

    // Update output text area
    var output = '';
    for (var i = 0; i < colors.length; i++)
        output += colorToHex(colors[i].rgb()) + ', ';
    document.getElementById('output').value = output;
    
    // Dots of gamut
    var swatches = d3.select('#colorDots');
    if (colorDots.style.cursor == 'crosshair')
        c = c.slice(0, c.length - 1);
    // Update contents
    var circles = swatches.selectAll("circle")
      .data(c);
    circles.exit().remove();
    circles.enter().append("circle")
        .attr("r", 5)
      .merge(circles)
        .attr("cx", d => (d.a + 50) / 100 * canvas.width)
        .attr("cy", d => canvas.height - (d.b + 50) / 100 * canvas.height)
        .attr("fill", d => d.rgb().toString());
}

d3.select('#colorDots').on('click', mouseClick);
function mouseClick() {
    var jab = coordToJab(d3.mouse(this));
    var c = jab.rgb();
    
    var min_dist = minDist(jab);
    
    if (min_dist > 20 && c.displayable()) {
        colors.push(jab);
        
        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.innerHTML = '<span class="swatchListBlock" style="background:' +
            jab.rgb().toString() + '">&#x2588;&#x2588;&#x2588;&#x2588;</span>' + colorToHex(jab.rgb()) +
            '<span class="swatchButtons"><span class="js-edit">&#x270e;</span> <span class="js-remove">&#x2716;</span></span>';
        li.dataset.color = jab;
        swatchList.appendChild(li);
        
        updateViz(colors);
        
        render();
        updateViz(colors);
        canvas.style.cursor = 'default';
    }
}

/*function render() {
    var width = canvas.width,
        height = canvas.height,
        ctx = canvas.getContext('2d'),
        image = ctx.createImageData(width, height),
        i = 0;
    
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var jab = coordToJab([x, y]);
            var c = jab.rgb();

            var min_dist = minDist(jab);

            if (min_dist < 20 || !c.displayable()) {
                image.data[i++] = 240;
                image.data[i++] = 240;
                image.data[i++] = 240;
            } else {
                image.data[i++] = c.r;
                image.data[i++] = c.g;
                image.data[i++] = c.b;
            }
            image.data[i++] = 255;
        }
    }

    ctx.putImageData(image, 0, 0);
    
    //for (var i = 0; i < colors.length; i++) {
    //    ctx.beginPath();
    //    ctx.fillStyle = colors[i].toString();
    //    ctx.arc((colors[i].a + 50)/100 * width, height - ((colors[i].b + 50)/100 * height), 5, 0, 2 * Math.PI);
    //    ctx.fill();
    //}
}*/
function render() {
    webglRender(sliderVal);
}

var sliderMargin = {right: 10, left: 10},
    sliderWidth = +vizLightness.attr("width") - sliderMargin.left - sliderMargin.right,
    sliderHeight = 20;

var sliderGradient = vizLightness.append("defs").append("linearGradient")
   .attr("id", "grad")
   .attr("x1", "0%")
   .attr("x2", "100%")
   .attr("y1", "0%")
   .attr("y2", "0%")
   .attr("gradientUnits", "userSpaceOnUse");
sliderGradient.append("stop")
   .attr("offset", "0%")
   .attr("style", "stop-color: hsl(0, 0%, 35%);");
sliderGradient.append("stop")
   .attr("offset", "100%")
   .attr("style", "stop-color: hsl(0, 0%, 95%);");

var sliderScale = d3.scaleLinear()
    .domain([35, 95])
    .range([0, sliderWidth])
    .clamp(true);

var slider = vizLightness.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + sliderMargin.left + "," + sliderHeight / 2+ ")");
slider.append("line")
    .attr("class", "track-inset")
    .attr("x1", sliderScale.range()[0])
    .attr("x2", sliderScale.range()[1])
    .attr("stroke", "url(#grad)")
    .attr("stroke-width", 10);
var trackOverlay = slider.append("line")
    .attr("id", "sliderTrackOverlay")
    .attr("x1", sliderScale.range()[0])
    .attr("x2", sliderScale.range()[1])
    .call(d3.drag()
        .on("start.interrupt", function() { slider.interrupt(); })
        .on("start drag", function() { adjustSlider(sliderScale.invert(d3.event.x)); }));

function adjustSlider(val) {
  sliderVal = val;
  sliderHandle.attr("cx", sliderScale(val));
  webglRender(val);
}

trackOverlay.on('mousemove', function() {
    webglRender(sliderScale.invert(d3.mouse(this)[0]));
});
trackOverlay.on('mouseout', render);

var sliderHandle = slider.insert("circle", "#sliderTrackOverlay")
    .attr("id", "sliderHandle")
    .attr("r", 8.75);

webglInit(canvas);
adjustSlider(60);   // Sets inital lightness and renders visualization
