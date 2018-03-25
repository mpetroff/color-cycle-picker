let canvas = document.getElementById('canvas');
let swatchList = document.getElementById('swatchlist');
let colorDots = document.getElementById('colorDots');
let sliderVal = 35;

Sortable.create(swatchList, {
    //filter: '.js-remove',
    filter: evt => evt.target.className == 'js-remove' || evt.target.className == 'js-edit',
    onFilter: function(evt) {
        if (evt.target.className == 'js-remove') {
            for (let i = 0; i < colors.length; i++) {
                if (colors[i][0] == evt.item.dataset.color) {
                    colors.splice(i, 1);
                    render();
                }
            }
            evt.item && evt.item.parentNode.removeChild(evt.item);
            configChange();
            updateViz(colors);
        } else {
            // TODO: open color swatch edit dialog
        }
    },
    onUpdate: function(evt) {
        // FIXME: There must be a better way to do this...
        colors = Array.prototype.map.call(evt.target.childNodes, function(x) {
            const c = colorToHex(d3.rgb(x.dataset.color));
            for (let i = 0; i < colors.length; i++) {
                if (colorToHex(colors[i][0].rgb()) == c)
                    return colors[i];
            }
        });
        updateViz(colors);
    }
});

let colors = [];

function minDist(jab) {
    let cvd_colors = calcCVD(jab);
    let min_dist = 9999;
    Object.keys(cvd_colors).forEach(function(key) {
        for (let k = 0; k < cvd_colors[key].length; k ++)
            for (let i = 0; i < colors.length; i++)
                for (let j = 0; j < colors[i][key].length; j++)
                    min_dist = Math.min(min_dist, cvd_colors[key][k].de(colors[i][key][j]));
    });
    return min_dist;
}

function minLightnessDist(J) {
    let min_dist = 9999;
    for (let i = 0; i < colors.length; i++)
        min_dist = Math.min(min_dist, Math.abs(J - colors[i].base[0].J));
    return min_dist;
}

function coordToJab(coords) {
    const width = canvas.width,
        height = canvas.height,
        x = coords[0],
        y = coords[1];
    return d3.jab(sliderVal, x/width * 100 - 50, (height - y)/height * 100 - 50);
}


d3.select('#colorDots').on('mousemove', function() {
    if (colors.length >= 12) {
        colorDots.style.cursor = 'default';
        return;
    }

    const jab = coordToJab(d3.mouse(this));
    const c = jab.rgb();

    const min_light_dist = minLightnessDist(jab.J);
    const min_dist = minDist(jab);

    let cs = colors.slice();
    if (min_dist < Number(document.getElementById('colorDistInput').value) ||
        min_light_dist < Number(document.getElementById('lightDistInput').value) ||
        !c.displayable()) {
        colorDots.style.cursor = 'default';
    } else {
        colorDots.style.cursor = 'crosshair';
        cs.push({base: [jab]});
    }
    updateViz(cs);
    
    
});

function colorToHex(c) {
    let r = Math.round(c.r).toString(16),
        g = Math.round(c.g).toString(16),
        b = Math.round(c.b).toString(16);
    r = r.length == 1 ? 0 + r : r;
    g = g.length == 1 ? 0 + g : g;
    b = b.length == 1 ? 0 + b : b;
    return '#' + r + g + b;
}

let vizLightness = d3.select("#vizLightness");
let vizLightnessGray = vizLightness.append("g")
    .attr("transform", "translate(0," + 20 + ")");
let vizLightnessColor = vizLightness.append("g")
    .attr("transform", "translate(0," + 40 + ")");

function updateViz(cs) {
    let c = [];
    for (let i = 0; i < cs.length; i++)
        c.push(cs[i].base[0]);

    // Large swatches
    let swatches = d3.select('#vizLargeSwatches');
    // Resize to fit
    swatches.style("height", c.length * 50 + 'px');
    // Update contents
    let rects = swatches.selectAll("rect")
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
    swatches = d3.select('#vizMediumSwatches');
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
    swatches = d3.select('#vizSmallSwatches');
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
    swatches = d3.select('#vizCircles');
    // Resize to fit
    swatches.style("height", Math.ceil(c.length / 3) * 35 + 'px');
    // Update contents
    let circles = swatches.selectAll("circle")
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
    swatches = d3.select('#vizLines');
    // Resize to fit
    swatches.style("height", c.length * 20 + 'px');
    // Update contents
    rects = swatches.selectAll("rect")
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
    swatches = vizLightnessGray;
    // Update contents
    rects = swatches.selectAll("rect")
      .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("y", 0)
        .attr("width", 2)
        .attr("height", 20)
      .merge(rects)
        .attr("x", d => sliderScale(d.J) + sliderMargin.left - 1)
        .attr("fill", d => d3.jab(d.J, 0, 0).rgb().toString());
    swatches = vizLightnessColor;
    // Update contents
    rects = swatches.selectAll("rect")
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
    updateOutput();
    
    // Dots of gamut
    swatches = d3.select('#colorDots');
    if (colorDots.style.cursor == 'crosshair')
        c = c.slice(0, c.length - 1);
    // Update contents
    circles = swatches.selectAll("circle")
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
    if (colors.length >= 12) {
        alert('Only 12 colors are supported (due to WebGL limitations)!')
        return;
    }

    const jab = coordToJab(d3.mouse(this));
    const c = jab.rgb();

    if (minDist(jab) > Number(document.getElementById('colorDistInput').value) &&
        minLightnessDist(jab.J) > Number(document.getElementById('lightDistInput').value) &&
        c.displayable()) {
        colors.push(calcCVD(jab));
        
        let li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.innerHTML = '<span class="swatchListBlock" style="background:' +
            jab.rgb().toString() + '">&#x2588;&#x2588;&#x2588;&#x2588;</span>' + colorToHex(jab.rgb()) +
            '<span class="swatchButtons"><span class="js-edit">&#x270e;</span> <span class="js-remove">&#x2716;</span></span>';
        li.dataset.color = jab;
        li.id = 'color' + colorToHex(c).slice(1);
        swatchList.appendChild(li);
        
        updateViz(colors);
        
        render();
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

const sliderMargin = {right: 10, left: 10},
    sliderWidth = +vizLightness.attr("width") - sliderMargin.left - sliderMargin.right,
    sliderHeight = 20;

const sliderGradient = vizLightness.append("defs").append("linearGradient")
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

let sliderScale = d3.scaleLinear()
    .domain([35, 95])
    .range([0, sliderWidth])
    .clamp(true);

let slider = vizLightness.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + sliderMargin.left + "," + sliderHeight / 2+ ")");
slider.append("line")
    .attr("class", "track-inset")
    .attr("x1", sliderScale.range()[0])
    .attr("x2", sliderScale.range()[1])
    .attr("stroke", "url(#grad)")
    .attr("stroke-width", 10);
let trackOverlay = slider.append("line")
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

let sliderHandle = slider.insert("circle", "#sliderTrackOverlay")
    .attr("id", "sliderHandle")
    .attr("r", 8.75);

d3.select('#colorDistInput').on('change', configChange);
d3.select('#lightDistInput').on('change', configChange);
d3.select('#deuteranomalyInput').on('change', configChange);
d3.select('#protanomalyInput').on('change', configChange);
d3.select('#tritanomalyInput').on('change', configChange);

function updateOutput() {
    // Update output text area
    let output = '';
    if (too_close)
        output = 'Colors are too close!'
    else
        for (let i = 0; i < colors.length; i++)
            output += colorToHex(colors[i].base[0].rgb()) + ', ';
    document.getElementById('output').value = output;
}

function calcCVD(jab) {
    let color = {'base': [jab]};
    const c = jab.rgb();
    const cvd_config = {
        'protanomaly': Number(document.getElementById('protanomalyInput').value),
        'deuteranomaly': Number(document.getElementById('deuteranomalyInput').value),
        'tritanomaly': Number(document.getElementById('tritanomalyInput').value)
    }
    Object.keys(cvd_config).forEach(function(key) {
        const cvd_c = d3.jab(cvd_forward(c, key, cvd_config[key]));
        color[key] = [cvd_c];
        //const cvd_dist = jab.de(cvd_c);
        //const cvd_num = Math.round(cvd_dist / 2);
        const cvd_num = 4;  // Dynamic is better but isn't possible in shader
        for (let i = 1; i <= cvd_num; i++)
            color[key].push(d3.jab(cvd_forward(c, key, i * cvd_config[key] / cvd_num)));
    });
    return color;
}

let too_close = false;
function configChange() {
    // Recalculate CVD simulation
    for (let i = 0; i < colors.length; i++)
        colors[i] = calcCVD(colors[i][0]);

    // Check for colors that are too close
    const color_dist = Number(document.getElementById('colorDistInput').value);
    const light_dist = Number(document.getElementById('lightDistInput').value);
    too_close = false;
    for (let i = 0; i < colors.length; i++) {
        let min_color_dist = 9999;
        let min_light_dist = 9999;
        let jab = colors[i][0];
        for (let j = 0; j < colors.length; j++) {
            if (i != j) {
                for (let k = 0; k < colors[j].length; k++)
                    min_color_dist = Math.min(min_color_dist, jab.de(colors[j][k]));
                min_light_dist = Math.min(min_light_dist, Math.abs(jab.J - colors[j][0].J));
            }
        }
        const elem = document.getElementById('color' + colorToHex(colors[i][0].rgb()).slice(1));
        if (min_color_dist < color_dist || min_light_dist < light_dist) {
            too_close = true;
            elem.classList.add('list-group-item-danger');
        } else {
            elem.classList.remove('list-group-item-danger');
        }

        // TODO: remove these debug statements
        if (min_color_dist < color_dist)
            console.log('color ' + i + 'is too close in color: ' + min_color_dist);
        if (min_light_dist < light_dist)
            console.log('color ' + i + ' is too close in lightness: ' + min_light_dist);
    }

    updateOutput();
    render();
}

webglInit(canvas);
adjustSlider(60);   // Sets inital lightness and renders visualization
