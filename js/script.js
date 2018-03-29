/*
 * Color Cycle Picker
 * Copyright (c) 2017-2018 Matthew Petroff
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// For gamut visualization
const canvas = document.getElementById('canvas');
let colorDots = document.getElementById('colorDots');

// For swatch list
let swatchList = document.getElementById('swatchlist');

// Color cycle colors
let colors = [],
    too_close = false,
    out_of_gamut = false;

// Create lightness slider input
let sliderVal = 35;
let vizLightness = d3.select("#vizLightness");
let vizLightnessGray = vizLightness.append("g")
    .attr("transform", "translate(0," + 20 + ")");
let vizLightnessColor = vizLightness.append("g")
    .attr("transform", "translate(0," + 40 + ")");
const sliderMargin = {
        right: 10,
        left: 10
    },
    sliderWidth = +vizLightness.attr("width") - sliderMargin.left -
        sliderMargin.right,
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
const sliderScale = d3.scaleLinear()
    .domain([35, 95])
    .range([0, sliderWidth])
    .clamp(true);
let slider = vizLightness.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + sliderMargin.left + "," +
        sliderHeight / 2 + ")");
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
        .on("start.interrupt", function() {
            slider.interrupt();
        })
        .on("start drag", function() {
            adjustSlider(sliderScale.invert(d3.event.x));
        }));

// Set lightness slider to a given lightness
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

// For rearranging swatch list
Sortable.create(swatchList, {
    filter: evt => evt.target.className == 'js-remove',
    onFilter: function(evt) {
        if (evt.target.className == 'js-remove') {
            for (let i = 0; i < colors.length; i++) {
                if (colors[i].base[0] == evt.item.dataset.color) {
                    colors.splice(i, 1);
                    render();
                }
            }
            if (evt.item)
                evt.item.parentNode.removeChild(evt.item);
            configChange();
            updateViz(colors);
        }
    },
    onUpdate: function(evt) {
        // FIXME: There must be a better way to do this...
        colors = Array.prototype.map.call(evt.target.childNodes, function(x) {
            const c = colorToHex(d3.rgb(x.dataset.color));
            for (let i = 0; i < colors.length; i++) {
                if (colorToHex(colors[i].base[0].rgb()) == c)
                    return colors[i];
            }
        });
        updateViz(colors);
    }
});

// Calculate minimum distance between a given color and existing colors
function minDist(jab) {
    let cvd_colors = calcCVD(jab);
    let min_dist = 9999;
    Object.keys(cvd_colors).forEach(function(key) {
        for (let k = 0; k < cvd_colors[key].length; k++)
            for (let i = 0; i < colors.length; i++)
                for (let j = 0; j < colors[i][key].length; j++)
                    min_dist = Math.min(min_dist, cvd_colors[key][k].de(
                        colors[i][key][j]));
    });
    return min_dist;
}

// Calculate minimum lightness distance between a given color and existing colors
function minLightnessDist(J) {
    let min_dist = 9999;
    for (let i = 0; i < colors.length; i++)
        min_dist = Math.min(min_dist, Math.abs(J - colors[i].base[0].J));
    return min_dist;
}

// Convert canvas coordinates into a color
function coordToJab(coords) {
    const width = canvas.width,
        height = canvas.height,
        x = coords[0],
        y = coords[1];
    return d3.jab(sliderVal, x / width * 100 - 50, (height - y) /
        height * 100 - 50);
}

// Convert D3 color to hex code
function colorToHex(c) {
    if (!c.displayable())
        return 'Out of Gamut!';

    let r = Math.round(c.r).toString(16),
        g = Math.round(c.g).toString(16),
        b = Math.round(c.b).toString(16);
    r = r.length == 1 ? 0 + r : r;
    g = g.length == 1 ? 0 + g : g;
    b = b.length == 1 ? 0 + b : b;
    return '#' + r + g + b;
}

// Update visualization
function updateViz(cs, do_not_update_dots) {
    do_not_update_dots = do_not_update_dots ? true : false;
    let c = [];
    for (let i = 0; i < cs.length; i++)
        c.push({
            color: cs[i].base[0],
            tooClose: cs[i].tooClose
        });

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
        .attr("y", (d, i) => i * 50)
        .attr("width", "100%")
        .attr("height", 50)
      .merge(rects)
        .attr("fill", d => d.color.rgb().toString());

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
        .attr("fill", d => d.color.rgb().toString());

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
        .attr("fill", d => d.color.rgb().toString());

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
        .attr("stroke", d => d.color.rgb().toString());

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
        .attr("y", (d, i) => i * 20)
        .attr("width", "100%")
        .attr("height", 2)
      .merge(rects)
        .attr("fill", d => d.color.rgb().toString());

    // Vertical line swatches for lightness visualization
    swatches = vizLightnessGray;
    // Update contents
    rects = swatches.selectAll("rect")
        .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("y", 0)
        .attr("width", 4)
        .attr("height", 20)
        .call(d3.drag()
            .on('start', lineDragStarted)
            .on('drag', lineDragged)
            .on('end', lineDragEnded))
        .on('mouseover', lineMouseOver)
        .on('mouseout', lineMouseOut)
      .merge(rects)
        .attr("x", d => sliderScale(d.color.J) + sliderMargin.left - 2)
        .attr("fill", d => d3.jab(d.color.J, 0, 0).rgb().toString())
        .attr("id", (d, i) => 'grect' + i)
        .attr("class", 'color-rect');
    swatches = vizLightnessColor;
    // Update contents
    rects = swatches.selectAll("rect")
        .data(c);
    rects.exit().remove();
    rects.enter().append("rect")
        .attr("y", 0)
        .attr("width", 4)
        .attr("height", 20)
        .call(d3.drag()
            .on('start', lineDragStarted)
            .on('drag', lineDragged)
            .on('end', lineDragEnded))
        .on('mouseover', lineMouseOver)
        .on('mouseout', lineMouseOut)
      .merge(rects)
        .attr("x", d => sliderScale(d.color.J) + sliderMargin.left - 2)
        .attr("fill", d => d.color.rgb().toString())
        .attr("id", (d, i) => 'crect' + i)
        .attr("class", 'color-rect');

    // Update output text area
    updateOutput();

    // Dots on gamut
    if (!do_not_update_dots) {
        swatches = d3.select('#colorDots');
        if (colorDots.style.cursor == 'crosshair')
            c = c.slice(0, c.length - 1);
        // Update contents
        circles = swatches.selectAll("circle")
            .data(c);
        circles.exit().remove();
        circles.enter().append("circle")
            .attr("r", 5)
            .call(d3.drag()
                .on('start', dotDragStarted)
                .on('drag', dotDragged)
                .on('end', dotDragEnded))
            .on('mouseover', dotMouseOver)
            .on('mouseout', dotMouseOut)
          .merge(circles)
            .attr("cx", d => (d.color.a + 50) / 100 * canvas.width)
            .attr("cy", d => canvas.height - (d.color.b + 50) / 100 *
                canvas.height)
            .attr("fill", d => d.color.rgb().toString())
            .attr("stroke", d => d.tooClose ? "#800" : "none")
            .attr("stroke-width", d => d.tooClose ? "3" : "0")
            .attr("id", (d, i) => 'colordot' + i)
            .attr("class", 'color-dot');
    }
}

// Event handlers for dragging color dots on gamut visualization
function dotDragStarted(d) {
    d3.select(this).attr("stroke-width", "3");
}
function dotDragged(d) {
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    dragUpdate(d, this, this.id.slice(8), 'dot', true);
}
function dotDragEnded(d) {
    dragUpdate(d, this, this.id.slice(8), 'dot', false);
}

// Event handlers for dragging color line below gamut visualization
function lineDragStarted(d) {
    const idx = this.id.slice(5);
    d3.select('#colordot' + idx).attr("stroke-width", "3");
}
function lineDragged(d) {
    const idx = this.id.slice(5);
    d3.select('#grect' + idx).attr("x", d.x = d3.event.x);
    d3.select('#crect' + idx).attr("x", d.x = d3.event.x);
    dragUpdate(d, this, this.id.slice(5), 'line', true);
}
function lineDragEnded(d) {
    dragUpdate(d, this, this.id.slice(5), 'line', false);
}

// Main drag update function
function dragUpdate(d, _this, idx, type, ignoreColor) {
    const elem = document.getElementById('color' +
        colorToHex(colors[idx].base[0].rgb()).slice(1));

    // Update color list
    let c = colors[idx];
    if (type == 'dot') {
        c.base[0].a = d.x / canvas.width * 100 - 50;
        c.base[0].b = (canvas.height - d.y) / canvas.height * 100 - 50;
    } else {
        c.base[0].J = sliderScale.invert(d3.mouse(_this)[0] -
            sliderMargin.left + 2);
    }
    colors[idx] = calcCVD(c.base[0]);

    // Update swatch list
    elem.dataset.color = c.base[0];
    const hex = colorToHex(c.base[0].rgb());
    elem.id = 'color' + hex.slice(1);
    elem.childNodes[0].style.background = c.base[0].rgb().toString();
    elem.children[1].innerHTML = hex;

    if (ignoreColor) {
        // Update dot
        d3.select('#colordot' + idx).attr("fill", c.base[0].rgb().toString());

        configChange(true, true);

        // Visualize colors that are too close
        for (let i = 0; i < colors.length; i++) {
            if (i == idx)
                d3.select('#colordot' + idx).attr("stroke",
                    colors[i].tooClose ? '#800' : "#fff");
            else
                d3.select('#colordot' + i)
                  .attr("stroke", colors[i].tooClose ? "#800" : "none")
                  .attr("stroke-width", colors[i].tooClose ? "3" : "0");
        }

        colors[idx].ignore = true;
        webglRender(c.base[0].J, true);
        colors[idx].ignore = false;
    } else {
        configChange(true, false);
    }
}

// Highlight color in swatch list when mousing over color in gamut visualization
function dotMouseOver(d) {
    swatchHighlight(this.id.slice(8), true);
}
function dotMouseOut(d) {
    swatchHighlight(this.id.slice(8), false);
}
function lineMouseOver(d) {
    swatchHighlight(this.id.slice(5), true);
}
function lineMouseOut(d) {
    swatchHighlight(this.id.slice(5), false);
}
function swatchHighlight(idx, highlight) {
    const elem = document.getElementById('color' + colorToHex(
        colors[idx].base[0].rgb()).slice(1));
    if (highlight)
        elem.classList.add('list-group-item-hover');
    else
        elem.classList.remove('list-group-item-hover');
}

// Add color when clicking on gamut visualization
d3.select('#colorDots').on('click', function() {
    const jab = coordToJab(d3.mouse(this));
    addColor(jab);
});

// Show color preview while mousing over canvas
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
        cs.push({
            base: [jab],
            tooClose: false
        });
    }
    updateViz(cs);
});

// Add a given color to swatch list
function addColor(jab, add_anyway) {
    if (colors.length >= 12) {
        alert('Only 12 colors are supported (due to WebGL limitations)!');
        return;
    }

    const c = jab.rgb();

    if ((minDist(jab) >= Number(document.getElementById('colorDistInput').value) &&
        minLightnessDist(jab.J) >=
        Number(document.getElementById('lightDistInput').value) &&
        c.displayable()) || add_anyway) {
        let cs = calcCVD(jab);
        cs.tooClose = false;
        colors.push(cs);

        let li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.innerHTML = '<span class="swatchListBlock" style="background:' +
            jab.rgb().toString() + '">&#x2588;&#x2588;&#x2588;&#x2588;</span><span>' +
            colorToHex(jab.rgb()) +
            '</span><span class="swatchButtons"><span class="js-remove">&#x2716;</span></span>';
        li.dataset.color = jab;
        li.id = 'color' + colorToHex(c).slice(1);
        li.addEventListener('mouseenter', swatchMouseEnter);
        li.addEventListener('mouseleave', swatchMouseLeave);
        swatchList.appendChild(li);

        updateViz(colors);

        render();
        canvas.style.cursor = 'default';
    }
}

// Highlight color in gamut visualization when mousing over swatch list
function swatchMouseEnter(e) {
    for (let i = 0; i < colors.length; i++) {
        if (colors[i].base[0] == e.target.dataset.color) {
            d3.select('#colordot' + i)
              .attr('stroke', '#fff')
              .attr('stroke-width', '3');
            d3.select('#grect' + i)
              .attr('fill', colors[i].base[0].rgb().brighter().toString());
        }
    }
}
function swatchMouseLeave(e) {
    for (let i = 0; i < colors.length; i++) {
        if (colors[i].base[0] == e.target.dataset.color) {
            d3.select('#colordot' + i)
              .attr('stroke', colors[i].tooClose ? '#800' : 'none')
              .attr('stroke-width', colors[i].tooClose ? '3' : '0');
            d3.select('#grect' + i)
              .attr('fill', d3.jab(colors[i].base[0].J, 0, 0).rgb().toString());
        }
    }
}

// Render gamut visualization
function render(ignoreLightness) {
    webglRender(sliderVal, ignoreLightness);
}

// Update text output
function updateOutput() {
    // Update output text area
    let output = '';
    if (!document.getElementById('settings').checkValidity())
        output = 'Settings are invalid!';
    else if (out_of_gamut)
        output = 'At least one color is out of gamut!';
    else if (too_close)
        output = 'Colors are too close!';
    else {
        for (let i = 0; i < colors.length; i++)
            output += colorToHex(colors[i].base[0].rgb()) + ', ';
        if (output.length > 2)
            output = output.slice(0, output.length - 2);
    }
    document.getElementById('output').value = output;
}

// Calculate color vision deficiency simulation colors for a given color
function calcCVD(jab) {
    let color = {
        'base': [jab]
    };
    const c = jab.rgb();
    const cvd_config = {
        'protanomaly': Number(document.getElementById('protanomalyInput').value),
        'deuteranomaly': Number(document.getElementById('deuteranomalyInput').value),
        'tritanomaly': Number(document.getElementById('tritanomalyInput').value)
    };
    Object.keys(cvd_config).forEach(function(key) {
        const cvd_c = d3.jab(cvd_forward(c, key, cvd_config[key]));
        color[key] = [cvd_c];
        //const cvd_dist = jab.de(cvd_c);
        //const cvd_num = Math.round(cvd_dist / 2);
        const cvd_num = 4; // Dynamic is better but isn't possible in shader
        for (let i = 1; i <= cvd_num; i++)
            color[key].push(d3.jab(cvd_forward(c, key, i *
                cvd_config[key] / cvd_num)));
    });
    return color;
}

// Recalculate CVD simulation and distances when configuration changes
function configChange(do_not_recalc_cvd, do_not_render) {
    do_not_recalc_cvd = do_not_recalc_cvd ? true : false;
    do_not_render = do_not_render ? true : false;

    // Recalculate CVD simulation
    if (!do_not_recalc_cvd)
        for (let i = 0; i < colors.length; i++)
            colors[i] = calcCVD(colors[i].base[0]);

    // Check for colors that are too close
    const color_dist = Number(document.getElementById('colorDistInput').value);
    const light_dist = Number(document.getElementById('lightDistInput').value);
    too_close = out_of_gamut = false;
    for (let i = 0; i < colors.length; i++) {
        let min_color_dist = 9999;
        let min_light_dist = 9999;
        let cvd_colors = calcCVD(colors[i].base[0]);
        for (let j = 0; j < colors.length; j++) {
            if (i != j) {
                Object.keys(cvd_colors).forEach(function(key) {
                    for (let k = 0; k < colors[j][key].length; k++)
                        min_color_dist = Math.min(min_color_dist,
                            cvd_colors[key][k].de(colors[j][key][k]));
                });
                min_light_dist = Math.min(min_light_dist,
                    Math.abs(colors[i].base[0].J - colors[j].base[0].J));
            }
        }
        const rgb = colors[i].base[0].rgb();
        const elem = document.getElementById('color' +
            colorToHex(rgb).slice(1));
        const displayable = rgb.displayable();
        if (min_color_dist < color_dist || min_light_dist < light_dist ||
            !displayable) {
            if (!displayable)
                out_of_gamut = true;
            else
                too_close = true;
            elem.classList.add('list-group-item-danger');
            colors[i].tooClose = true;
        } else {
            elem.classList.remove('list-group-item-danger');
            colors[i].tooClose = false;
        }
    }

    updateOutput();
    updateViz(colors, do_not_render);
    if (!do_not_render)
        render();
}

// Add color using text specifier input
const colorInput = document.getElementById('colorInput');
document.getElementById('colorAdd').addEventListener('click', function() {
    const c = d3.color(colorInput.value);
    if (c) {
        const jab = d3.jab(c);
        if (jab.J < sliderScale.domain()[0] || jab.J > sliderScale.domain()[1]) {
            alert("Color's lightness is out of range!");
        } else {
            addColor(jab, true);
            colorInput.value = '';
            configChange(false, false);
        }
    } else {
        alert('Invalid color specifier!');
    }
});

// Initialize visualization
webglInit(canvas);
adjustSlider(60);   // Sets initial lightness and renders visualization
updateOutput();     // Clears output on page refresh
