export function pinSvg ({
  strokeColor = 'black',
  fillColor = 'white',
  fillOpacity = 1,
  strokeWidth = 30
}) {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns:osb="http://www.openswatchbook.org/uri/2009/osb"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:cc="http://creativecommons.org/ns#"
      xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      xmlns:svg="http://www.w3.org/2000/svg"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
      xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" id="Capa_1" x="0px" y="0px" width="32" height="32" viewBox="0 0 32 32" xml:space="preserve" class="" inkscape:version="0.48.5 r10040" sodipodi:docname="blue-white-center-hollow.svg">

      <g id="g3" transform="matrix(0.06260921,0,0,0.0565501,-0.02795756,0.905589)">
        <path d="M 256,0 C 167.641,0 96,71.625 96,160 c 0,24.75 5.625,48.219 15.672,69.125 C 112.234,230.313 256,512 256,512 L 398.594,232.625 C 409.719,210.844 416,186.156 416,160 416,71.625 344.375,0 256,0 z"
          class="active-path"
          id="path7"
          style="fill:${fillColor};fill-opacity:${fillOpacity};stroke:${strokeColor};stroke-width:${strokeWidth};stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"
        />
      </g>
    </svg>
  `);
}
