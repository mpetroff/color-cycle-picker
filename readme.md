# Color Cycle Picker

## About

This tool was developed in an effort to promote the development of colorblind-friendly color cycles for scientific visualization. It allows colors to be picked from a CAM02-UCS color gamut, which is perceptually uniform, and assembled into a color cycle. A minimum perceptual distance is enforced between the colors in the cycle, both for normal and anomalous trichromats. This is accomplished by performing color vision deficiency simulations for various types of deficiencies and enforcing a minimum perceptual difference for the simulated colors (each type of deficiency is treated separately).

## Browser Compatibility

Tested with Firefox 59 & Chromium 64

## License
Distributed under the MIT License. For more information, read the file `COPYING` or peruse the license [online](https://github.com/mpetroff/color-cycle-picker/blob/master/COPYING).

The included CAM02-UCS GLSL implementation is based on [d3-cam02](https://github.com/connorgr/d3-cam02), which is [BSD 3-Clause licensed](https://github.com/connorgr/d3-cam02/blob/945951e95621bf5f8458cf11a458e1559d73b75e/LICENSE).

The included JavaScript (and GLSL to a lesser extent) CVD simulation implementation is based on [Colorspacious](https://github.com/njsmith/colorspacious), which is [MIT licensed](https://github.com/njsmith/colorspacious/blob/v1.1.0/LICENSE.txt).

## Credits

* [Matthew Petroff](https://mpetroff.net/), Original author
* [D3.js](https://d3js.org/), JavaScript visualization framework
* [d3-cam02](https://github.com/connorgr/d3-cam02), CAM02-UCS implementation
* [Colorspacious](https://github.com/njsmith/colorspacious), Basis for CVD simulation implementation
* [Sortable](https://github.com/RubaXa/Sortable), Used for drag-and-drop list
* [Bootstrap](https://getbootstrap.com/), Front-end component library

CVD simulation is based on:

> G. M. Machado, M. M. Oliveira and L. A. F. Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency," in _IEEE Transactions on Visualization and Computer Graphics_, vol. 15, no. 6, pp. 1291-1298, Nov.-Dec. 2009. [doi:10.1109/TVCG.2009.113](https://doi.org/10.1109/TVCG.2009.113)

CIECAM02 and CAM02-UCS overview:

> Luo M.R., Li C. (2013) CIECAM02 and Its Recent Developments. In: Fernandez-Maloigne C. (eds) Advanced Color Image Processing and Analysis. Springer, New York, NY. [doi:10.1007/978-1-4419-6190-7_2](https://doi.org/10.1007/978-1-4419-6190-7_2)
