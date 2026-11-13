// Render opaque faces into a depth buffer, then composite transparent props.
function createDepthRenderer() {
  const layer = document.createElement('canvas');
  const gl = layer.getContext('webgl', {alpha:false, antialias:true});
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec4 color;
      uniform vec2 scale;
      varying vec4 tint;
      void main() {
        float z = position.z;
        gl_Position = vec4(position.xy * scale, z - 0.16, z);
        tint = color;
      }`],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec4 tint;
      void main() { gl_FragColor = tint; }`],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name,size,offset] of [['position',3,0],['color',4,12]]) {
    const attribute = gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,28,offset);
  }
  const scale = gl.getUniformLocation(program,'scale');
  const colors = new Map();
  function rgba(hex) {
    if (!colors.has(hex)) {
      const raw = hex.slice(1);
      const expanded = raw.length === 3 ? [...raw].map(c=>c+c).join('') : raw;
      const bytes = (expanded.length === 6 ? expanded+'ff' : expanded).match(/../g);
      colors.set(hex,bytes.map(byte=>parseInt(byte,16)/255));
    }
    return colors.get(hex);
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(.84,.72,.58,1);
  return function draw(items,w,h,lens) {
    if (gl.isContextLost() || !w || !h) return null;
    if (layer.width!==w || layer.height!==h) {
      layer.width=w;
      layer.height=h;
      gl.viewport(0,0,w,h);
    }
    gl.uniform2f(scale,2*lens/w,2*lens/h);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const opaque=[], edges=[], translucent=[];
    for (const {surface,corners,depth,stroke} of items) {
      const color = lightsOff ? surface.night ?? surface.color : surface.color;
      if (color==='transparent') continue;
      const tint=rgba(color);
      const fill=tint[3]===1 ? opaque : [];
      const vertex=(target,p,c)=>target.push(p.x,p.y,p.z,...c);
      for(let i=1;i<corners.length-1;i++){
        vertex(fill,corners[0],tint);
        vertex(fill,corners[i],tint);
        vertex(fill,corners[i+1],tint);
      }
      if(tint[3]!==1) translucent.push({depth,fill});
      if(!surface.soft && tint[3]===1) {
        const outline=rgba(stroke);
        for(let i=0;i<corners.length;i++){
          vertex(edges,corners[i],outline);
          vertex(edges,corners[(i+1)%corners.length],outline);
        }
      }
    }
    function batch(vertices,mode) {
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STREAM_DRAW);
      gl.drawArrays(mode,0,vertices.length/7);
    }
    gl.disable(gl.BLEND);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1,1);
    batch(opaque,gl.TRIANGLES);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    batch(edges,gl.LINES);
    const transparentVertices=[];
    for(const {fill} of translucent.sort((a,b)=>b.depth-a.depth)) transparentVertices.push(...fill);
    batch(transparentVertices,gl.TRIANGLES);
    gl.depthMask(true);
    return layer;
  };
}
