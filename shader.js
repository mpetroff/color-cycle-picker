function webglInit(canvas) {
    gl = canvas.getContext('experimental-webgl', {alpha: true, depth: false});

    // Create viewport for entire canvas
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Create vertex shader
    vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    // Create fragment shader
    fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    // Link WebGL program
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // Log errors
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
        console.log(gl.getShaderInfoLog(vs));
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
        console.log(gl.getShaderInfoLog(fs));
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.log(gl.getProgramInfoLog(program));

    // Use WebGL program
    gl.useProgram(program);

    // Initialize uniforms
    initUniforms()

    // Look up texture coordinates location
    program.texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(program.texCoordLocation);

    // Provide texture coordinates for rectangle
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,1,1,1,-1,-1,1,1,-1,-1,-1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
}

function webglRender(J) {
    // Set lightness
    let u = gl.getUniformLocation(program, 'u_J');
    gl.uniform1f(u, J);
    
    // Set existing colors
    let colorArray = Array(512*3);
    colorArray.fill(-1000);
    let n = 0;
    for (let i = 0; i < colors.length; i++) {
        for (let j = 0; j < colors[i].length; j++) {
            colorArray[n++] = colors[i][j].J;
            colorArray[n++] = colors[i][j].a;
            colorArray[n++] = colors[i][j].b;
        }
    }
    u = gl.getUniformLocation(program, 'u_colors');
    gl.uniform3fv(u, colorArray);

    // Set minimum distances
    u = gl.getUniformLocation(program, 'u_minColorDist');
    gl.uniform1f(u, Number(document.getElementById('colorDistInput').value));
    u = gl.getUniformLocation(program, 'u_minLightDist');
    gl.uniform1f(u, Number(document.getElementById('lightDistInput').value));

    // Draw using current buffer
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function initUniforms() {    
    let u = gl.getUniformLocation(program, 'CIECAM02_VC_n');
    gl.uniform1f(u, CIECAM02_VC.n);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_c');
    gl.uniform1f(u, CIECAM02_VC.c);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_z');
    gl.uniform1f(u, CIECAM02_VC.z);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_achromaticResponseToWhite');
    gl.uniform1f(u, CIECAM02_VC.achromaticResponseToWhite);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_nc');
    gl.uniform1f(u, CIECAM02_VC.nc);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_ncb');
    gl.uniform1f(u, CIECAM02_VC.ncb);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_nbb');
    gl.uniform1f(u, CIECAM02_VC.nbb);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_fl');
    gl.uniform1f(u, CIECAM02_VC.fl);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_D65_X');
    gl.uniform1f(u, CIECAM02_VC.D65_X);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_D65_Y');
    gl.uniform1f(u, CIECAM02_VC.D65_Y);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_D65_Z');
    gl.uniform1f(u, CIECAM02_VC.D65_Z);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_d');
    gl.uniform1f(u, CIECAM02_VC.d);
}


/*
 * Below is heavily based on or copied verbatim from d3-cam02:
 * https://github.com/connorgr/d3-cam02
 */

// Vertex shader
const vertexShader = [
'attribute vec2 a_texCoord;',
'varying vec2 v_texCoord;',

'void main() {',
    // Set position
    'gl_Position = vec4(a_texCoord, 0.0, 1.0);',
    
    // Pass the coordinates to the fragment shader
    'v_texCoord = a_texCoord;',
'}'
].join('');


const fragmentShader = `
precision mediump float;
const float PI = 3.14159265358979323846264;

float toRGB(float c) {
    return (c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1. / 2.4) - 0.055);
}

vec3 xyz2rgb(float x, float y, float z) {
  x = x / 100.0;
  y = y / 100.0;
  z = z / 100.0;

  float preR = x *  3.2404542 + y * -1.5371385 - z * 0.4985314,
      preG = x * -0.9692660 + y *  1.8760108 + z * 0.0415560,
      preB = x *  0.0556434 + y * -0.2040259 + z * 1.0572252;

  return vec3(toRGB(preR), toRGB(preG), toRGB(preB));
}

vec3 xyz2cat02(float x, float y, float z) {
  float l = ( 0.7328 * x) + (0.4296 * y) - (0.1624 * z),
      m = (-0.7036 * x) + (1.6975 * y) + (0.0061 * z),
      s = ( 0.0030 * x) + (0.0136 * y) + (0.9834 * z);
  return vec3(l, m, s);
}

vec3 cat022xyz(float l, float m, float s) {
  float x = ( 1.096124 * l) - (0.278869 * m) + (0.182745 * s),
      y = ( 0.454369 * l) + (0.473533 * m) + (0.072098 * s),
      z = (-0.009628 * l) - (0.005698 * m) + (1.015326 * s);
  return vec3(x, y, z);
}

vec3 cat022hpe(float l, float m, float s) {
  float lh = ( 0.7409792 * l) + (0.2180250 * m) + (0.0410058 * s),
      mh = ( 0.2853532 * l) + (0.6242014 * m) + (0.0904454 * s),
      sh = (-0.0096280 * l) - (0.0056980 * m) + (1.0153260 * s);

  return vec3(lh, mh, sh);
}

vec3 hpe2xyz(float l, float m, float s) {
  float x = (1.910197 * l) - (1.112124 * m) + (0.201908 * s),
      y = (0.370950 * l) + (0.629054 * m) - (0.000008 * s),
      z = s;
  return vec3(x, y, z);
}

float inverseNonlinearAdaptation(float coneResponse, float fl) {
    return (100.0 / fl) * pow((27.13 * abs(coneResponse - 0.1))
        / (400.0 - abs(coneResponse - 0.1)), 1.0 / 0.42);
}

vec3 Aab2Cat02LMS(float A, float aa, float bb, float nbb) {
  float x = (A / nbb) + 0.305;

  float l = (0.32787 * x) + (0.32145 * aa) + (0.20527 * bb),
      m = (0.32787 * x) - (0.63507 * aa) - (0.18603 * bb),
      s = (0.32787 * x) - (0.15681 * aa) - (4.49038 * bb);

  return vec3(l, m, s);
}

// Updated attempts at perceptually uniform color spaces
// Formulas and constants taken from
// M.R. Luo and C. Li. "CIECAM02 and Its Recent Developments"
vec3 altCam02Coef_ucs = vec3(1.00, 0.007, 0.0228);

uniform float CIECAM02_VC_n, CIECAM02_VC_c, CIECAM02_VC_z,
    CIECAM02_VC_achromaticResponseToWhite, CIECAM02_VC_nc, CIECAM02_VC_ncb,
    CIECAM02_VC_nbb, CIECAM02_VC_fl, CIECAM02_VC_D65_X, CIECAM02_VC_D65_Y,
    CIECAM02_VC_D65_Z, CIECAM02_VC_d;

vec3 cam022rgb(float J, float C, float h) {
    float t = pow(C / (sqrt(J / 100.0) * pow(1.64-pow(0.29, CIECAM02_VC_n), 0.73)), (1.0 / 0.9));
    float et = 1.0 / 4.0 * (cos(radians(h) + 2.0) + 3.8);

    float a = pow( J / 100.0, 1.0 / (CIECAM02_VC_c * CIECAM02_VC_z) )
        * CIECAM02_VC_achromaticResponseToWhite;

    float p1 = ((50000.0 / 13.0) * CIECAM02_VC_nc * CIECAM02_VC_ncb) * et / t;
    float p2 = (a / CIECAM02_VC_nbb) + 0.305;
    float p3 = 21.0 / 20.0;
    float p4, p5, ca, cb;

    float hr = radians(h);

    if (abs(sin(hr)) >= abs(cos(hr))) {
        p4 = p1 / sin(hr);
        cb = (p2 * (2.0 + p3) * (460.0 / 1403.0)) /
              (p4 + (2.0 + p3) * (220.0 / 1403.0) *
              (cos(hr) / sin(hr)) - (27.0 / 1403.0) +
              p3 * (6300.0 / 1403.0));
        ca = cb * (cos(hr) / sin(hr));
    } else {
        p5 = p1 / cos(hr);
        ca = (p2 * (2.0 + p3) * (460.0 / 1403.0)) /
             (p5 + (2.0 + p3) * (220.0 / 1403.0) -
             ((27.0 / 1403.0) - p3 * (6300.0 / 1403.0)) *
             (sin(hr) / cos(hr)));
        cb = ca * (sin(hr) / cos(hr));
    }

    vec3 lms_a = Aab2Cat02LMS(a, ca, cb, CIECAM02_VC_nbb);
    float lpa = lms_a[0],
        mpa = lms_a[1],
        spa = lms_a[2];

    float lp = inverseNonlinearAdaptation(lpa, CIECAM02_VC_fl),
        mp = inverseNonlinearAdaptation(mpa, CIECAM02_VC_fl),
        sp = inverseNonlinearAdaptation(spa, CIECAM02_VC_fl);

    vec3 txyz = hpe2xyz(lp, mp, sp);
    vec3 lms_c =  xyz2cat02(txyz[0], txyz[1], txyz[2]);

    vec3 D65_CAT02 = xyz2cat02(CIECAM02_VC_D65_X, CIECAM02_VC_D65_Y,
                               CIECAM02_VC_D65_Z);

    float l = lms_c[0] / ( ((CIECAM02_VC_D65_Y * CIECAM02_VC_d) / D65_CAT02[0])
            + (1.0 - CIECAM02_VC_d) ),
        m = lms_c[1] / ( ((CIECAM02_VC_D65_Y * CIECAM02_VC_d) / D65_CAT02[1])
            + (1.0 - CIECAM02_VC_d) ),
        s = lms_c[2] / ( ((CIECAM02_VC_D65_Y * CIECAM02_VC_d) / D65_CAT02[2])
            + (1.0 - CIECAM02_VC_d) );

    vec3 xyz = cat022xyz(l, m, s);
    vec3 rgb = xyz2rgb(xyz[0], xyz[1], xyz[2]);

    return rgb;
}

vec3 jabToRgb(float J, float a, float b) {
  vec3 coefs = altCam02Coef_ucs;

  // Get the new M using trigonomic identities
  // MPrime = (1.0/coefs.c2) * Math.log(1.0 + coefs.c2*cam02.M); // log=ln
  // var a = MPrime * Math.cos(o.h),
  //     b = MPrime * Math.sin(o.h);
  // x*x = (x*cos(y))*(x(cos(y))) + (x*sin(y))*(x(sin(y)))
  float newMPrime = sqrt(a*a + b*b),
      newM = (exp(newMPrime * coefs[2]) - 1.0) / coefs[2];

  // TODO: is atan okay instead of atan2
  float newh = degrees(atan(b,a));
  if (newh < 0.)
    newh = 360.0 + newh;

  float newC = newM / pow(CIECAM02_VC_fl, 0.25);

  // Last, derive the new Cam02J
  // JPrime = ((1.0 + 100.0*coefs.c1) * cam02.J) / (1.0 + coefs.c1 * cam02.J)
  // simplified: var cam02J = JPrime / (1.0 + coefs.c1*(100.0 - JPrime));
  // if v = (d*x) / (b + a*x), x = (b*(v/d)) / (1 - a(v/d))
  float newCam02J = J / (1.0 + coefs[1]*(100.0 - J));

  return cam022rgb(newCam02J, newC, newh);
}

float cam02de(vec3 c1, vec3 c2) {
    float diffJ = abs(c1[0] - c2[0]),
        diffA = abs(c1[1] - c2[1]),
        diffB = abs(c1[2] - c2[2]);
    return sqrt( (diffJ/altCam02Coef_ucs[0])*(diffJ/altCam02Coef_ucs[0]) + diffA*diffA + diffB*diffB );
}

// Existing colors
uniform vec3 u_colors[512];

float minDist(vec3 jab) {
    float min_dist = 9999.;
    for (int i = 0; i < 512; i++)
        if (u_colors[i][0] >= -999. && u_colors[i][1] >= -999. && u_colors[i][2] >= -999.)
            min_dist = min(min_dist, cam02de(jab, u_colors[i]));
    return min_dist;
}

float minLightnessDist(vec3 jab) {
    float min_dist = 9999.;
    for (int i = 0; i < 512; i++)
        if (u_colors[i][0] >= -999. && u_colors[i][1] >= -999. && u_colors[i][2] >= -999.)
            min_dist = min(min_dist, abs(jab[0] - u_colors[i][0]));
    return min_dist;
}

// Coordinates passed in from vertex shader
varying vec2 v_texCoord;

// Minimum distances
uniform float u_minColorDist;
uniform float u_minLightDist;

// Lightness
uniform float u_J;

void main() {
    vec3 jab = vec3(u_J, v_texCoord.x * 50., v_texCoord.y * 50.);
    vec3 rgb = jabToRgb(jab[0], jab[1], jab[2]);
    if (rgb[0] < 0. || rgb[0] > 1. || rgb[1] < 0. || rgb[1] > 1. || rgb[2] < 0. || rgb[2] > 1.
        || minDist(jab) < u_minColorDist || minLightnessDist(jab) < u_minLightDist) {
        rgb = vec3(0.94, 0.94, 0.94);
    }
    
    gl_FragColor = vec4(rgb[0], rgb[1], rgb[2], 1.);
}
`;



// CIECAM02_VC viewing conditions; assumes average viewing conditions
const CIECAM02_VC = (function() {
  const vc = {
    D65_X: 95.047, // D65 standard referent
    D65_Y: 100.0,
    D65_Z: 108.883,
    // Viewing conditions
    // Note about L_A:
    // Billy Bigg's implementation just uses a value of 4 cd/m^2, but
    // the colorspacious implementation uses greater precision by calculating
    // it with (64 / numpy.pi) / 5
    // This is based on Moroney (2000), "Usage guidelines for CIECAM97s" where
    // sRGB illuminance is 64 lux. Because of its greater precision we use
    // Moroney's alternative definition.
    la: (64.0 / Math.PI) / 5.0,
    yb: 20.0, // 20% gray
    // Surround
    f: 1.0,  // average;  dim: 0.9;  dark: 0.8
    c: 0.69, // average;  dim: 0.59; dark: 0.525
    nc: 1.0  // average;  dim: 0.95; dark: 0.8
  };

  vc.D65_LMS = xyz2cat02(vc.D65_X, vc.D65_Y, vc.D65_Z),

  vc.n = vc.yb / vc.D65_Y;
  vc.z = 1.48 + Math.sqrt(vc.n);

  const k = 1.0 / ((5.0 * vc.la) + 1.0);
  vc.fl = (0.2 * Math.pow(k, 4.0) * (5.0 * vc.la)) +
          0.1 * Math.pow(1.0 - Math.pow(k, 4.0), 2.0) *
              Math.pow(5.0 * vc.la, 1.0/3.0);

  vc.nbb = 0.725 * Math.pow(1.0 / vc.n, 0.2);
  vc.ncb = vc.nbb;
  vc.d = vc.f * ( 1.0 - (1.0 / 3.6) * Math.exp((-vc.la - 42.0) / 92.0) );
  vc.achromaticResponseToWhite = (function() {
    const l = vc.D65_LMS.l,
        m = vc.D65_LMS.m,
        s = vc.D65_LMS.s;

    const lc = l * (((vc.D65_Y * vc.d) / l) + (1.0 - vc.d)),
        mc = m * (((vc.D65_Y * vc.d) / m) + (1.0 - vc.d)),
        sc = s * (((vc.D65_Y * vc.d) / s) + (1.0 - vc.d));

    const hpeTransforms = cat022hpe(lc, mc, sc),
        lp = hpeTransforms.lh,
        mp = hpeTransforms.mh,
        sp = hpeTransforms.sh;

    const lpa = nonlinearAdaptation(lp, vc.fl),
        mpa = nonlinearAdaptation(mp, vc.fl),
        spa = nonlinearAdaptation(sp, vc.fl);

    return (2.0 * lpa + mpa + 0.05 * spa - 0.305) * vc.nbb;
  })();

  return vc;
})(); // end CIECAM02_VC

function xyz2cat02(x,y,z) {
  const l = ( 0.7328 * x) + (0.4296 * y) - (0.1624 * z),
      m = (-0.7036 * x) + (1.6975 * y) + (0.0061 * z),
      s = ( 0.0030 * x) + (0.0136 * y) + (0.9834 * z);
  return {l: l, m: m, s: s};
}

function cat022hpe(l,m,s) {
  const lh = ( 0.7409792 * l) + (0.2180250 * m) + (0.0410058 * s),
      mh = ( 0.2853532 * l) + (0.6242014 * m) + (0.0904454 * s),
      sh = (-0.0096280 * l) - (0.0056980 * m) + (1.0153260 * s);

  return {lh: lh, mh: mh, sh: sh};
}

function nonlinearAdaptation(coneResponse, fl) {
  const p = Math.pow( (fl * coneResponse) / 100.0, 0.42 );
  return ((400.0 * p) / (27.13 + p)) + 0.1;
}
