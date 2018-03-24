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
    let colorArray = Array(128*3);
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

    // Set CVD severity
    u = gl.getUniformLocation(program, 'u_protanomaly_severity');
    gl.uniform1f(u, Number(document.getElementById('protanomalyInput').value));
    u = gl.getUniformLocation(program, 'u_deuteranomaly_severity');
    gl.uniform1f(u, Number(document.getElementById('deuteranomalyInput').value));
    u = gl.getUniformLocation(program, 'u_tritanomaly_severity');
    gl.uniform1f(u, Number(document.getElementById('tritanomalyInput').value));

    // Draw using current buffer
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function initUniforms() {    
    let u = gl.getUniformLocation(program, 'CIECAM02_VC_n');
    gl.uniform1f(u, CIECAM02_VC.n);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_z');
    gl.uniform1f(u, CIECAM02_VC.z);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_achromaticResponseToWhite');
    gl.uniform1f(u, CIECAM02_VC.achromaticResponseToWhite);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_ncb');
    gl.uniform1f(u, CIECAM02_VC.ncb);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_nbb');
    gl.uniform1f(u, CIECAM02_VC.nbb);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_fl');
    gl.uniform1f(u, CIECAM02_VC.fl);
    u = gl.getUniformLocation(program, 'CIECAM02_VC_D65_LMS');
    gl.uniform3fv(u, [CIECAM02_VC.D65_LMS.l, CIECAM02_VC.D65_LMS.m, CIECAM02_VC.D65_LMS.s]);
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

vec3 rgbLinear(vec3 rgb) {
    vec3 rgb_linear;
    for (int i = 0; i < 3; i++) {
        if (rgb[i] <= 0.04045) {
            rgb_linear[i] = rgb[i] / 12.92;
        } else {
            rgb_linear[i] = pow((rgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return rgb_linear;
}

vec3 rgb2xyz(vec3 rgb) {
    // Assume sRGB
    rgb = rgbLinear(rgb);
    // Convert to XYZ in [0,100] rather than [0,1]
    return vec3((rgb[0] * 0.4124 + rgb[1] * 0.3576 + rgb[2] * 0.1805) * 100.0,
                (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) * 100.0,
                (rgb[0] * 0.0193 + rgb[1] * 0.1192 + rgb[2] * 0.9505) * 100.0);
}

vec3 xyz2rgb(vec3 xyz) {
  xyz /= 100.0;

  float preR = xyz[0] *  3.2404542 + xyz[1] * -1.5371385 - xyz[2] * 0.4985314,
      preG = xyz[0] * -0.9692660 + xyz[1] *  1.8760108 + xyz[2] * 0.0415560,
      preB = xyz[0] *  0.0556434 + xyz[1] * -0.2040259 + xyz[2] * 1.0572252;

  return vec3(toRGB(preR), toRGB(preG), toRGB(preB));
}

vec3 xyz2cat02(vec3 xyz) {
  float l = ( 0.7328 * xyz[0]) + (0.4296 * xyz[1]) - (0.1624 * xyz[2]),
      m = (-0.7036 * xyz[0]) + (1.6975 * xyz[1]) + (0.0061 * xyz[2]),
      s = ( 0.0030 * xyz[0]) + (0.0136 * xyz[1]) + (0.9834 * xyz[2]);
  return vec3(l, m, s);
}

vec3 cat022xyz(vec3 lms) {
  float x = ( 1.096124 * lms[0]) - (0.278869 * lms[1]) + (0.182745 * lms[2]),
      y = ( 0.454369 * lms[0]) + (0.473533 * lms[1]) + (0.072098 * lms[2]),
      z = (-0.009628 * lms[0]) - (0.005698 * lms[1]) + (1.015326 * lms[2]);
  return vec3(x, y, z);
}

vec3 cat022hpe(vec3 lms) {
  float lh = ( 0.7409792 * lms[0]) + (0.2180250 * lms[1]) + (0.0410058 * lms[2]),
      mh = ( 0.2853532 * lms[0]) + (0.6242014 * lms[1]) + (0.0904454 * lms[2]),
      sh = (-0.0096280 * lms[0]) - (0.0056980 * lms[1]) + (1.0153260 * lms[2]);

  return vec3(lh, mh, sh);
}

vec3 hpe2xyz(vec3 lms) {
  float x = (1.910197 * lms[0]) - (1.112124 * lms[1]) + (0.201908 * lms[2]),
      y = (0.370950 * lms[0]) + (0.629054 * lms[1]) - (0.000008 * lms[2]),
      z = lms[2];
  return vec3(x, y, z);
}

vec3 inverseNonlinearAdaptation(vec3 coneResponse, float fl) {
    vec3 p = (27.13 * abs(coneResponse - 0.1)) / (400.0 - abs(coneResponse - 0.1));
    p[0] = pow(p[0], 1.0 / 0.42);
    p[1] = pow(p[1], 1.0 / 0.42);
    p[2] = pow(p[2], 1.0 / 0.42);
    return (100.0 / fl) * p;
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

// D65 standard referent
const float CIECAM02_VC_D65_X = 95.047;
const float CIECAM02_VC_D65_Y = 100.0;
const float CIECAM02_VC_D65_Z = 108.883;

// Surround
const float CIECAM02_VC_c = 0.69;   // average;  dim: 0.59; dark: 0.525
const float CIECAM02_VC_nc = 1.0;   // average;  dim: 0.95; dark: 0.8

uniform float CIECAM02_VC_n, CIECAM02_VC_z,
    CIECAM02_VC_achromaticResponseToWhite, CIECAM02_VC_ncb,
    CIECAM02_VC_nbb, CIECAM02_VC_fl, CIECAM02_VC_d;
uniform vec3 CIECAM02_VC_D65_LMS;

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

    vec3 p = inverseNonlinearAdaptation(lms_a, CIECAM02_VC_fl);

    vec3 txyz = hpe2xyz(p);
    vec3 lms_c = xyz2cat02(txyz);

    vec3 lms = lms_c / ( ((CIECAM02_VC_D65_Y * CIECAM02_VC_d) / CIECAM02_VC_D65_LMS)
        + (1.0 - CIECAM02_VC_d) );

    vec3 xyz = cat022xyz(lms);
    vec3 rgb = xyz2rgb(xyz);

    return rgb;
}

vec3 nonlinearAdaptation(vec3 coneResponse, float fl) {
  coneResponse = fl *coneResponse / 100.0;
  vec3 p;
  p[0] = pow(coneResponse[0], 0.42);
  p[1] = pow(coneResponse[1], 0.42);
  p[2] = pow(coneResponse[2], 0.42);
  return ((400.0 * p) / (27.13 + p)) + 0.1;
}

vec3 cTransform(vec3 cone, vec3 D65_cone) {
    return cone * (((CIECAM02_VC_D65_Y * CIECAM02_VC_d) / D65_cone) + (1.0 - CIECAM02_VC_d));
}

vec3 cat022cam02(vec3 lms) {
    vec3 c = cTransform(lms, CIECAM02_VC_D65_LMS);

    vec3 hpeTransforms = cat022hpe(c);

    vec3 pa = nonlinearAdaptation(hpeTransforms, CIECAM02_VC_fl);

    float ca = pa[0] - ((12.0*pa[1]) / 11.0) + (pa[2] / 11.0);
    float cb = (1.0/9.0) * (pa[0] + pa[1] - 2.0*pa[2]);

    float h = (180.0 / PI) * atan(cb, ca);
    if (h < 0.0)
        h += 360.0;

    float temp;
    float H;
    if (h < 20.14) {
        temp = ((h + 122.47)/1.2) + ((20.14 - h)/0.8);
        H = 300.0 + (100.0*((h + 122.47)/1.2)) / temp;
    } else if(h < 90.0) {
        temp = ((h - 20.14)/0.8) + ((90.00 - h)/0.7);
        H = (100.0*((h - 20.14)/0.8)) / temp;
    } else if(h < 164.25) {
        temp = ((h - 90.00)/0.7) + ((164.25 - h)/1.0);
        H = 100.0 + ((100.0*((h - 90.00)/0.7)) / temp);
    } else if (h < 237.53) {
        temp = ((h - 164.25)/1.0) + ((237.53 - h)/1.2);
        H = 200.0 + ((100.0*((h - 164.25)/1.0)) / temp);
    } else {
        temp = ((h - 237.53)/1.2) + ((360.0 - h + 20.14)/0.8);
        H = 300.0 + ((100.0*((h - 237.53)/1.2)) / temp);
    }

    float a = ( 2.0*pa[0] + pa[1] + 0.05*pa[2] - 0.305 ) * CIECAM02_VC_nbb;

    float J = 100.0 * pow(a / CIECAM02_VC_achromaticResponseToWhite,
        CIECAM02_VC_c * CIECAM02_VC_z);

    float et = 0.25 * (cos((h * PI) / 180.0 + 2.0) + 3.8);
    float t = ((50000.0 / 13.0) * CIECAM02_VC_nc * CIECAM02_VC_ncb * et * sqrt(ca*ca + cb*cb)) /
        (pa[0] + pa[1] + (21.0/20.0)*pa[2]);

    float C = pow(t, 0.9) * sqrt(J / 100.0) * pow(1.64 - pow(0.29, CIECAM02_VC_n), 0.73);

    //float Q = (4.0 / CIECAM02_VC_c) * sqrt(J / 100.0) *
    //    (CIECAM02_VC_achromaticResponseToWhite + 4.0) * pow(CIECAM02_VC_fl, 0.25);

    float M = C * pow(CIECAM02_VC_fl, 0.25);

    //float s = 100.0 * sqrt(M / Q);

    return vec3(J, M, h);
}

vec3 jabToRgb(vec3 jab) {
  float J = jab[0];
  float a = jab[1];
  float b = jab[2];

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

vec3 rgbToJab(vec3 rgb) {
    vec3 xyz = rgb2xyz(rgb);
    vec3 lmsConeResponses = xyz2cat02(xyz);
    vec3 cam02 = cat022cam02(lmsConeResponses);

    float JPrime = ((1.0 + 100.0*altCam02Coef_ucs[1]) * cam02[0]) / (1.0 + altCam02Coef_ucs[1] * cam02[0]);
    JPrime /= altCam02Coef_ucs[0];

    float MPrime = (1.0/altCam02Coef_ucs[2]) * log(1.0 + altCam02Coef_ucs[2]*cam02[1]);

    float a = MPrime * cos(PI / 180.0 * cam02[2]);
    float b = MPrime * sin(PI / 180.0 * cam02[2]);

    return vec3(JPrime, a, b);
}

float cam02de(vec3 c1, vec3 c2) {
    float diffJ = abs(c1[0] - c2[0]),
        diffA = abs(c1[1] - c2[1]),
        diffB = abs(c1[2] - c2[2]);
    return sqrt( (diffJ/altCam02Coef_ucs[0])*(diffJ/altCam02Coef_ucs[0]) + diffA*diffA + diffB*diffB );
}

// Existing colors
uniform vec3 u_colors[128];

float minDist(vec3 jab) {
    float min_dist = 9999.;
    for (int i = 0; i < 128; i++)
        if (u_colors[i][0] >= -999. && u_colors[i][1] >= -999. && u_colors[i][2] >= -999.)
            min_dist = min(min_dist, cam02de(jab, u_colors[i]));
    return min_dist;
}

float minLightnessDist(vec3 jab) {
    float min_dist = 9999.;
    for (int i = 0; i < 128; i++)
        if (u_colors[i][0] >= -999. && u_colors[i][1] >= -999. && u_colors[i][2] >= -999.)
            min_dist = min(min_dist, abs(jab[0] - u_colors[i][0]));
    return min_dist;
}



const mat3 MACHADO_ET_AL_protanomaly_0 = mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0);
const mat3 MACHADO_ET_AL_protanomaly_10 = mat3(0.856167,0.029342,-0.00288,0.182038,0.955115,-0.001563,-0.038205,0.015544,1.004443);
const mat3 MACHADO_ET_AL_protanomaly_20 = mat3(0.734766,0.05184,-0.004928,0.334872,0.919198,-0.004209,-0.069637,0.028963,1.009137);
const mat3 MACHADO_ET_AL_protanomaly_30 = mat3(0.630323,0.069181,-0.006308,0.465641,0.890046,-0.007724,-0.095964,0.040773,1.014032);
const mat3 MACHADO_ET_AL_protanomaly_40 = mat3(0.539009,0.082546,-0.007136,0.579343,0.866121,-0.011959,-0.118352,0.051332,1.019095);
const mat3 MACHADO_ET_AL_protanomaly_50 = mat3(0.458064,0.092785,-0.007494,0.679578,0.846313,-0.016807,-0.137642,0.060902,1.024301);
const mat3 MACHADO_ET_AL_protanomaly_60 = mat3(0.38545,0.100526,-0.007442,0.769005,0.829802,-0.02219,-0.154455,0.069673,1.029632);
const mat3 MACHADO_ET_AL_protanomaly_70 = mat3(0.319627,0.106241,-0.007025,0.849633,0.815969,-0.028051,-0.169261,0.07779,1.035076);
const mat3 MACHADO_ET_AL_protanomaly_80 = mat3(0.259411,0.110296,-0.006276,0.923008,0.80434,-0.034346,-0.18242,0.085364,1.040622);
const mat3 MACHADO_ET_AL_protanomaly_90 = mat3(0.203876,0.112975,-0.005222,0.990338,0.794542,-0.041043,-0.194214,0.092483,1.046265);
const mat3 MACHADO_ET_AL_protanomaly_100 = mat3(0.152286,0.114503,-0.003882,1.052583,0.786281,-0.048116,-0.204868,0.099216,1.051998);

const mat3 MACHADO_ET_AL_deuteranomaly_0 = mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0);
const mat3 MACHADO_ET_AL_deuteranomaly_10 = mat3(0.866435,0.049567,-0.003453,0.177704,0.939063,0.007233,-0.044139,0.01137,0.99622);
const mat3 MACHADO_ET_AL_deuteranomaly_20 = mat3(0.760729,0.090568,-0.006027,0.319078,0.889315,0.013325,-0.079807,0.020117,0.992702);
const mat3 MACHADO_ET_AL_deuteranomaly_30 = mat3(0.675425,0.125303,-0.00795,0.43385,0.847755,0.018572,-0.109275,0.026942,0.989378);
const mat3 MACHADO_ET_AL_deuteranomaly_40 = mat3(0.605511,0.155318,-0.009376,0.52856,0.812366,0.023176,-0.134071,0.032316,0.9862);
const mat3 MACHADO_ET_AL_deuteranomaly_50 = mat3(0.547494,0.181692,-0.01041,0.607765,0.781742,0.027275,-0.155259,0.036566,0.983136);
const mat3 MACHADO_ET_AL_deuteranomaly_60 = mat3(0.498864,0.205199,-0.011131,0.674741,0.754872,0.030969,-0.173604,0.039929,0.980162);
const mat3 MACHADO_ET_AL_deuteranomaly_70 = mat3(0.457771,0.226409,-0.011595,0.731899,0.731012,0.034333,-0.18967,0.042579,0.977261);
const mat3 MACHADO_ET_AL_deuteranomaly_80 = mat3(0.422823,0.245752,-0.011843,0.781057,0.709602,0.037423,-0.203881,0.044646,0.974421);
const mat3 MACHADO_ET_AL_deuteranomaly_90 = mat3(0.392952,0.263559,-0.01191,0.82361,0.69021,0.040281,-0.216562,0.046232,0.97163);
const mat3 MACHADO_ET_AL_deuteranomaly_100 = mat3(0.367322,0.280085,-0.01182,0.860646,0.672501,0.04294,-0.227968,0.047413,0.968881);

const mat3 MACHADO_ET_AL_tritanomaly_0 = mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0);
const mat3 MACHADO_ET_AL_tritanomaly_10 = mat3(0.92667,0.021191,0.008437,0.092514,0.964503,0.054813,-0.019184,0.014306,0.93675);
const mat3 MACHADO_ET_AL_tritanomaly_20 = mat3(0.89572,0.029997,0.013027,0.13333,0.9454,0.104707,-0.02905,0.024603,0.882266);
const mat3 MACHADO_ET_AL_tritanomaly_30 = mat3(0.905871,0.026856,0.01341,0.127791,0.941251,0.148296,-0.033662,0.031893,0.838294);
const mat3 MACHADO_ET_AL_tritanomaly_40 = mat3(0.948035,0.014364,0.010853,0.08949,0.946792,0.193991,-0.037526,0.038844,0.795156);
const mat3 MACHADO_ET_AL_tritanomaly_50 = mat3(1.017277,-0.006113,0.006379,0.027029,0.958479,0.248708,-0.044306,0.047634,0.744913);
const mat3 MACHADO_ET_AL_tritanomaly_60 = mat3(1.104996,-0.032137,0.001336,-0.046633,0.971635,0.317922,-0.058363,0.060503,0.680742);
const mat3 MACHADO_ET_AL_tritanomaly_70 = mat3(1.193214,-0.058496,-0.002346,-0.109812,0.97941,0.403492,-0.083402,0.079086,0.598854);
const mat3 MACHADO_ET_AL_tritanomaly_80 = mat3(1.257728,-0.078003,-0.003316,-0.139648,0.975409,0.501214,-0.118081,0.102594,0.502102);
const mat3 MACHADO_ET_AL_tritanomaly_90 = mat3(1.278864,-0.084748,-0.000989,-0.125333,0.957674,0.601151,-0.153531,0.127074,0.399838);
const mat3 MACHADO_ET_AL_tritanomaly_100 = mat3(1.255528,-0.078411,0.004733,-0.076749,0.930809,0.691367,-0.178779,0.147602,0.3039);

mat3 machado_et_al_2009_matrix_protanomaly(float severity) {
    float fraction = mod(severity, 10.0);
    float low = severity - fraction;
    float high = low + 10.0;
    int mat_idx;

    mat3 low_matrix;
    mat_idx = int(low / 10.0);
    if (mat_idx == 0)
        low_matrix = MACHADO_ET_AL_protanomaly_0;
    else if (mat_idx == 1)
        low_matrix = MACHADO_ET_AL_protanomaly_10;
    else if (mat_idx == 2)
        low_matrix = MACHADO_ET_AL_protanomaly_20;
    else if (mat_idx == 3)
        low_matrix = MACHADO_ET_AL_protanomaly_30;
    else if (mat_idx == 4)
        low_matrix = MACHADO_ET_AL_protanomaly_40;
    else if (mat_idx == 5)
        low_matrix = MACHADO_ET_AL_protanomaly_50;
    else if (mat_idx == 6)
        low_matrix = MACHADO_ET_AL_protanomaly_60;
    else if (mat_idx == 7)
        low_matrix = MACHADO_ET_AL_protanomaly_70;
    else if (mat_idx == 8)
        low_matrix = MACHADO_ET_AL_protanomaly_80;
    else if (mat_idx == 9)
        low_matrix = MACHADO_ET_AL_protanomaly_90;
    else if (mat_idx == 10)
        low_matrix = MACHADO_ET_AL_protanomaly_100;

    if (severity >= 100.0)
        return low_matrix;

    mat3 high_matrix;
    mat_idx = int(high / 10.0);
    if (mat_idx == 0)
        high_matrix = MACHADO_ET_AL_protanomaly_0;
    else if (mat_idx == 1)
        high_matrix = MACHADO_ET_AL_protanomaly_10;
    else if (mat_idx == 2)
        high_matrix = MACHADO_ET_AL_protanomaly_20;
    else if (mat_idx == 3)
        high_matrix = MACHADO_ET_AL_protanomaly_30;
    else if (mat_idx == 4)
        high_matrix = MACHADO_ET_AL_protanomaly_40;
    else if (mat_idx == 5)
        high_matrix = MACHADO_ET_AL_protanomaly_50;
    else if (mat_idx == 6)
        high_matrix = MACHADO_ET_AL_protanomaly_60;
    else if (mat_idx == 7)
        high_matrix = MACHADO_ET_AL_protanomaly_70;
    else if (mat_idx == 8)
        high_matrix = MACHADO_ET_AL_protanomaly_80;
    else if (mat_idx == 9)
        high_matrix = MACHADO_ET_AL_protanomaly_90;
    else if (mat_idx == 10)
        high_matrix = MACHADO_ET_AL_protanomaly_100;
    return (1.0 - fraction / 10.0) * low_matrix + fraction / 10.0 * high_matrix;
}
mat3 machado_et_al_2009_matrix_deuteranomaly(float severity) {
    float fraction = mod(severity, 10.0);
    float low = severity - fraction;
    float high = low + 10.0;
    int mat_idx;

    mat3 low_matrix;
    mat_idx = int(low / 10.0);
    if (mat_idx == 0)
        low_matrix = MACHADO_ET_AL_deuteranomaly_0;
    else if (mat_idx == 1)
        low_matrix = MACHADO_ET_AL_deuteranomaly_10;
    else if (mat_idx == 2)
        low_matrix = MACHADO_ET_AL_deuteranomaly_20;
    else if (mat_idx == 3)
        low_matrix = MACHADO_ET_AL_deuteranomaly_30;
    else if (mat_idx == 4)
        low_matrix = MACHADO_ET_AL_deuteranomaly_40;
    else if (mat_idx == 5)
        low_matrix = MACHADO_ET_AL_deuteranomaly_50;
    else if (mat_idx == 6)
        low_matrix = MACHADO_ET_AL_deuteranomaly_60;
    else if (mat_idx == 7)
        low_matrix = MACHADO_ET_AL_deuteranomaly_70;
    else if (mat_idx == 8)
        low_matrix = MACHADO_ET_AL_deuteranomaly_80;
    else if (mat_idx == 9)
        low_matrix = MACHADO_ET_AL_deuteranomaly_90;
    else if (mat_idx == 10)
        low_matrix = MACHADO_ET_AL_deuteranomaly_100;

    if (severity >= 100.0)
        return low_matrix;

    mat3 high_matrix;
    mat_idx = int(high / 10.0);
    if (mat_idx == 0)
        high_matrix = MACHADO_ET_AL_deuteranomaly_0;
    else if (mat_idx == 1)
        high_matrix = MACHADO_ET_AL_deuteranomaly_10;
    else if (mat_idx == 2)
        high_matrix = MACHADO_ET_AL_deuteranomaly_20;
    else if (mat_idx == 3)
        high_matrix = MACHADO_ET_AL_deuteranomaly_30;
    else if (mat_idx == 4)
        high_matrix = MACHADO_ET_AL_deuteranomaly_40;
    else if (mat_idx == 5)
        high_matrix = MACHADO_ET_AL_deuteranomaly_50;
    else if (mat_idx == 6)
        high_matrix = MACHADO_ET_AL_deuteranomaly_60;
    else if (mat_idx == 7)
        high_matrix = MACHADO_ET_AL_deuteranomaly_70;
    else if (mat_idx == 8)
        high_matrix = MACHADO_ET_AL_deuteranomaly_80;
    else if (mat_idx == 9)
        high_matrix = MACHADO_ET_AL_deuteranomaly_90;
    else if (mat_idx == 10)
        high_matrix = MACHADO_ET_AL_deuteranomaly_100;
    return (1.0 - fraction / 10.0) * low_matrix + fraction / 10.0 * high_matrix;
}
mat3 machado_et_al_2009_matrix_tritanomaly(float severity) {
    float fraction = mod(severity, 10.0);
    float low = severity - fraction;
    float high = low + 10.0;
    int mat_idx;

    mat3 low_matrix;
    mat_idx = int(low / 10.0);
    if (mat_idx == 0)
        low_matrix = MACHADO_ET_AL_tritanomaly_0;
    else if (mat_idx == 1)
        low_matrix = MACHADO_ET_AL_tritanomaly_10;
    else if (mat_idx == 2)
        low_matrix = MACHADO_ET_AL_tritanomaly_20;
    else if (mat_idx == 3)
        low_matrix = MACHADO_ET_AL_tritanomaly_30;
    else if (mat_idx == 4)
        low_matrix = MACHADO_ET_AL_tritanomaly_40;
    else if (mat_idx == 5)
        low_matrix = MACHADO_ET_AL_tritanomaly_50;
    else if (mat_idx == 6)
        low_matrix = MACHADO_ET_AL_tritanomaly_60;
    else if (mat_idx == 7)
        low_matrix = MACHADO_ET_AL_tritanomaly_70;
    else if (mat_idx == 8)
        low_matrix = MACHADO_ET_AL_tritanomaly_80;
    else if (mat_idx == 9)
        low_matrix = MACHADO_ET_AL_tritanomaly_90;
    else if (mat_idx == 10)
        low_matrix = MACHADO_ET_AL_tritanomaly_100;

    if (severity >= 100.0)
        return low_matrix;

    mat3 high_matrix;
    mat_idx = int(high / 10.0);
    if (mat_idx == 0)
        high_matrix = MACHADO_ET_AL_tritanomaly_0;
    else if (mat_idx == 1)
        high_matrix = MACHADO_ET_AL_tritanomaly_10;
    else if (mat_idx == 2)
        high_matrix = MACHADO_ET_AL_tritanomaly_20;
    else if (mat_idx == 3)
        high_matrix = MACHADO_ET_AL_tritanomaly_30;
    else if (mat_idx == 4)
        high_matrix = MACHADO_ET_AL_tritanomaly_40;
    else if (mat_idx == 5)
        high_matrix = MACHADO_ET_AL_tritanomaly_50;
    else if (mat_idx == 6)
        high_matrix = MACHADO_ET_AL_tritanomaly_60;
    else if (mat_idx == 7)
        high_matrix = MACHADO_ET_AL_tritanomaly_70;
    else if (mat_idx == 8)
        high_matrix = MACHADO_ET_AL_tritanomaly_80;
    else if (mat_idx == 9)
        high_matrix = MACHADO_ET_AL_tritanomaly_90;
    else if (mat_idx == 10)
        high_matrix = MACHADO_ET_AL_tritanomaly_100;
    return (1.0 - fraction / 10.0) * low_matrix + fraction / 10.0 * high_matrix;
}

vec3 cvd_forward_protanomaly(vec3 rgb_linear, float severity) {
    mat3 mat = machado_et_al_2009_matrix_protanomaly(severity);
    vec3 result_linear = mat * rgb_linear;
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (result_linear[i] <= 0.0031308) {
            result[i] = 12.92 * result_linear[i];
        } else {
            result[i] = 1.055 * pow(result_linear[i], 1.0 / 2.4);
        }
    }
    return result;
}
vec3 cvd_forward_deuteranomaly(vec3 rgb_linear, float severity) {
    mat3 mat = machado_et_al_2009_matrix_deuteranomaly(severity);
    vec3 result_linear = mat * rgb_linear;
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (result_linear[i] <= 0.0031308) {
            result[i] = 12.92 * result_linear[i];
        } else {
            result[i] = 1.055 * pow(result_linear[i], 1.0 / 2.4);
        }
    }
    return result;
}
vec3 cvd_forward_tritanomaly(vec3 rgb_linear, float severity) {
    mat3 mat = machado_et_al_2009_matrix_tritanomaly(severity);
    vec3 result_linear = mat * rgb_linear;
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (result_linear[i] <= 0.0031308) {
            result[i] = 12.92 * result_linear[i];
        } else {
            result[i] = 1.055 * pow(result_linear[i], 1.0 / 2.4);
        }
    }
    return result;
}

// CVD severities
uniform float u_protanomaly_severity;
uniform float u_deuteranomaly_severity;
uniform float u_tritanomaly_severity;

float cvdMinDist(vec3 rgb) {
    float min_dist = 9999.;
    float cvd_dist;
    int cvd_num = 10;

    vec3 rgb_linear = rgbLinear(rgb);

    //cvd_dist = minDist(cvd_forward_protanomaly(jab, u_protanomaly_severity));
    //cvd_num = int(cvd_dist / 2.0);
    for (int i = 0; i <= 10; i++)
        min_dist = min(min_dist, minDist(rgbToJab(cvd_forward_protanomaly(rgb_linear, float(i) * u_protanomaly_severity / float(cvd_num)))));

    //cvd_dist = minDist(cvd_forward_deuteranomaly(jab, u_deuteranomaly_severity));
    //cvd_num = int(cvd_dist / 2.0);
    for (int i = 0; i <= 10; i++)
        min_dist = min(min_dist, minDist(rgbToJab(cvd_forward_deuteranomaly(rgb_linear, float(i) * u_deuteranomaly_severity / float(cvd_num)))));

    //cvd_dist = minDist(cvd_forward_tritanomaly(jab, u_tritanomaly_severity));
    //cvd_num = int(cvd_dist / 2.0);
    for (int i = 0; i <= 10; i++)
        min_dist = min(min_dist, minDist(rgbToJab(cvd_forward_tritanomaly(rgb_linear, float(i) * u_tritanomaly_severity / float(cvd_num)))));

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
    vec3 rgb = jabToRgb(jab);
    if (rgb[0] < 0. || rgb[0] > 1. || rgb[1] < 0. || rgb[1] > 1. || rgb[2] < 0. || rgb[2] > 1.
        || min(cvdMinDist(rgb), minDist(jab)) < u_minColorDist || minLightnessDist(jab) < u_minLightDist) {
        rgb = vec3(0.94, 0.94, 0.94);
        //rgb = jabToRgb(rgbToJab(vec3(0.94, 0.94, 0.94)));
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
