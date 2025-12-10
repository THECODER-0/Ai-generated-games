// 3D rendering, procedural textures, and first-person movement with collision
// Requires maze (2D array), mazeSize, and startPos from maze.js
(function loadThree(){
  if(!window.THREE){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.min.js';
    s.onload = ()=>{};
    document.head.appendChild(s);
  }
})();

let renderer, scene, camera, fp = null, animationId=null;
let keys = {};
let pointerLocked = false;

function createProceduralWallTexture(size=512){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // base mustard-ish
  ctx.fillStyle = '#d6d1a4';
  ctx.fillRect(0,0,size,size);

  // add vertical stripes and noise
  for(let i=0;i<6;i++){
    ctx.fillStyle = `rgba(200,180,120,${0.02+Math.random()*0.05})`;
    const w = Math.floor(size*(0.02+Math.random()*0.08));
    const x = Math.floor(Math.random()*size);
    ctx.fillRect(x,0,w,size);
  }

  // blotches
  for(let i=0;i<1200;i++){
    const x = Math.random()*size, y=Math.random()*size;
    const r = Math.random()*1.4;
    ctx.fillStyle = `rgba(80,70,40,${Math.random()*0.06})`;
    ctx.fillRect(x,y,r,r);
  }

  // subtle vignette
  const g = ctx.createRadialGradient(size/2,size/2,size*0.2,size/2,size/2,size*0.8);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(1,'rgba(0,0,0,0.06)');
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1,1);
  tex.anisotropy = 4;
  return tex;
}

function createProceduralFloorTexture(size=512){
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#b6b690'; ctx.fillRect(0,0,size,size);

  // carpet noise
  for(let i=0;i<5000;i++){
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.02})`;
    const x=Math.random()*size,y=Math.random()*size,r= Math.random()*1.4;
    ctx.fillRect(x,y,r,r);
  }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.floor(size/64)), Math.max(1, Math.floor(size/64)));
  return tex;
}

// map maze array cell to world coordinate: cellSize applied
const cellSize = 3;

function renderMaze3D(mazeArray, size, start){
  if(!window.THREE){
    setTimeout(()=>renderMaze3D(mazeArray,size,start),80);
    return;
  }
  disposeThreeJS();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f4e7);

  // camera
  camera = new THREE.PerspectiveCamera(75, (getCanvasDiv().offsetWidth/getCanvasDiv().offsetHeight), 0.1, 2000);
  // place camera a bit above start cell (y)
  const spawn = {
    x: start.x*cellSize + cellSize/2,
    z: start.y*cellSize + cellSize/2
  };
  camera.position.set(spawn.x, 1.6, spawn.z);

  // lighting
  const amb = new THREE.AmbientLight(0xfaf7e6, 0.8);
  const dir = new THREE.DirectionalLight(0xe6deab, 0.6);
  dir.position.set(size*cellSize, size*cellSize*1.2, size*cellSize);
  scene.add(amb, dir);

  // ground
  const floorMat = new THREE.MeshPhongMaterial({
    map: createProceduralFloorTexture(512),
    shininess: 2
  });
  const floorGeo = new THREE.BoxGeometry(size*cellSize, 0.6, size*cellSize);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(size*cellSize/2 - cellSize/2, -0.35, size*cellSize/2 - cellSize/2);
  scene.add(floorMesh);

  // walls
  const wallMat = new THREE.MeshPhongMaterial({
    map: createProceduralWallTexture(512),
    shininess: 6,
  });

  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      if(mazeArray[y][x]===1){
        const g=new THREE.BoxGeometry(cellSize, 2.6, cellSize);
        const m=new THREE.Mesh(g, wallMat);
        m.position.set(x*cellSize, 1.3, y*cellSize);
        scene.add(m);
      } else {
        // small ceiling blemish or tile variation could be added
      }
    }
  }

  // subtle lamps at intervals
  for(let i=2;i<size;i+=7){
    for(let j=2;j<size;j+=7){
      const lampMat = new THREE.MeshBasicMaterial({color:0xfff9d6});
      const lampGeo = new THREE.CylinderGeometry(0.18,0.18,2.2,10);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(i*cellSize, 1.1, j*cellSize);
      scene.add(lamp);
      const p = new THREE.PointLight(0xfff6c6, 0.6, cellSize*5);
      p.position.copy(lamp.position);
      scene.add(p);
    }
  }

  // renderer
  const canvasDiv = getCanvasDiv();
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(canvasDiv.offsetWidth, canvasDiv.offsetHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  canvasDiv.innerHTML=''; canvasDiv.appendChild(renderer.domElement);

  // simple first-person controls implemented here
  setupPointerLock(renderer.domElement, camera, mazeArray, size);

  // animation loop
  let last = performance.now();
  function animate(ts){
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    updateMovement(dt, mazeArray, size);
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }
  animationId = requestAnimationFrame(animate);

  // handle resizing
  window.addEventListener('resize', onResize);
  function onResize(){
    if(!renderer) return;
    renderer.setSize(canvasDiv.offsetWidth, canvasDiv.offsetHeight);
    camera.aspect = canvasDiv.offsetWidth / canvasDiv.offsetHeight;
    camera.updateProjectionMatrix();
  }
}

function getCanvasDiv(){ return document.getElementById('threejs-canvas'); }

function disposeThreeJS(){
  if(animationId) cancelAnimationFrame(animationId);
  animationId=null;
  if(renderer){
    try{ renderer.forceContextLoss(); renderer.domElement.remove(); }catch(e){}
    renderer=null;
  }
  scene=null; camera=null;
  keys={};
  removePointerLockHandlers();
}

// Movement state
let yaw = 0, pitch = 0;
let moveSpeed = 3.8; // meters per second
let lookSpeed = 0.0022;
let jumpVelocity = 0;
let verticalVelocity = 0;
let onGround = true;
const collisionRadius = 0.28; // player body radius in world units

// pointer lock and input
let domElemForPointer = null;
let mouseMoveHandler = null;
let keyDownHandler = null;
let keyUpHandler = null;
let clickHandler = null;
let pointerlockchangeHandler = null;

function setupPointerLock(domElement, cameraRef, mazeArray, size){
  domElemForPointer = domElement;

  clickHandler = ()=>{ domElemForPointer.requestPointerLock(); };
  domElemForPointer.addEventListener('click', clickHandler);

  pointerlockchangeHandler = ()=>{
    pointerLocked = (document.pointerLockElement === domElemForPointer);
  };
  document.addEventListener('pointerlockchange', pointerlockchangeHandler);

  mouseMoveHandler = (e)=>{
    if(!pointerLocked) return;
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
    cameraRef.rotation.set(pitch, yaw, 0, 'ZYX');
  };
  document.addEventListener('mousemove', mouseMoveHandler);

  keyDownHandler = (e)=>{ keys[e.key.toLowerCase()] = true; };
  keyUpHandler = (e)=>{ keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', keyDownHandler);
  window.addEventListener('keyup', keyUpHandler);

  // initialize yaw/pitch from camera
  yaw = cameraRef.rotation.y || 0;
  pitch = cameraRef.rotation.x || 0;
}

function removePointerLockHandlers(){
  if(domElemForPointer && clickHandler) domElemForPointer.removeEventListener('click', clickHandler);
  if(pointerlockchangeHandler) document.removeEventListener('pointerlockchange', pointerlockchangeHandler);
  if(mouseMoveHandler) document.removeEventListener('mousemove', mouseMoveHandler);
  if(keyDownHandler) window.removeEventListener('keydown', keyDownHandler);
  if(keyUpHandler) window.removeEventListener('keyup', keyUpHandler);
  domElemForPointer = null;
  mouseMoveHandler = keyDownHandler = keyUpHandler = clickHandler = pointerlockchangeHandler = null;
}

// apply movement with collision against mazeArray
function updateMovement(dt, mazeArray, size){
  if(!camera) return;

  const forward = (keys['w'] || keys['arrowup']) ? 1 : ((keys['s']||keys['arrowdown']) ? -1 : 0);
  const strafe = (keys['d']||keys['arrowright']) ? 1 : ((keys['a']||keys['arrowleft']) ? -1 : 0);

  // build direction relative to yaw
  const dirX = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
  const dirZ = Math.cos(yaw) * (-forward) + Math.sin(yaw) * strafe; // note coordinate sign
  let len = Math.hypot(dirX, dirZ);
  if(len > 0.001){
    const nx = dirX / len;
    const nz = dirZ / len;
    const speed = moveSpeed * (keys['shift'] ? 1.8 : 1.0);
    const dx = nx * speed * dt;
    const dz = nz * speed * dt;

    attemptMove(dx, dz, mazeArray, size);
  }

  // simple gravity & jump (space)
  if((keys[' '] || keys['space']) && onGround){
    verticalVelocity = 4.2;
    onGround = false;
  }
  verticalVelocity -= 9.8 * dt;
  camera.position.y += verticalVelocity * dt;
  if(camera.position.y <= 1.6){
    camera.position.y = 1.6;
    verticalVelocity = 0;
    onGround = true;
  }
}

// attempt to move camera by dx,dz while preventing walking through walls
function attemptMove(dx, dz, mazeArray, size){
  const px = camera.position.x;
  const pz = camera.position.z;
  // try X movement
  if(!collidesAt(px + dx, pz, mazeArray, size)){
    camera.position.x += dx;
  } else {
    // slide along x: try tiny steps to edge
    let step = Math.sign(dx)*0.03;
    let moved = false;
    for(let i=0;i<Math.abs(dx)/Math.abs(step);i++){
      if(!collidesAt(px + step*(i+1), pz, mazeArray, size)){
        camera.position.x += step*(i+1);
        moved = true; break;
      }
    }
    if(!moved) {/* blocked */}
  }
  // try Z movement
  if(!collidesAt(camera.position.x, pz + dz, mazeArray, size)){
    camera.position.z += dz;
  } else {
    let step = Math.sign(dz)*0.03;
    let moved=false;
    for(let i=0;i<Math.abs(dz)/Math.abs(step);i++){
      if(!collidesAt(camera.position.x, pz + step*(i+1), mazeArray, size)){
        camera.position.z += step*(i+1);
        moved = true; break;
      }
    }
    if(!moved){}
  }
}

// check collision with walls; returns true if position collides with any wall cell
function collidesAt(worldX, worldZ, mazeArray, size){
  // calculate which cells around player to test
  const cx = worldX / cellSize;
  const cz = worldZ / cellSize;
  const px = cx;
  const pz = cz;
  const r = collisionRadius / cellSize;

  // check nearby cells in range
  const minX = Math.max(0, Math.floor(px - r - 1));
  const maxX = Math.min(size-1, Math.ceil(px + r + 1));
  const minY = Math.max(0, Math.floor(pz - r - 1));
  const maxY = Math.min(size-1, Math.ceil(pz + r + 1));
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(mazeArray[y][x]===1){
        // compute nearest point on cell to player
        const cellCenterX = x + 0.5;
        const cellCenterY = y + 0.5;
        const dx = Math.abs(cellCenterX - px) - 0.5;
        const dy = Math.abs(cellCenterY - pz) - 0.5;
        const dxClamped = Math.max(0, dx);
        const dyClamped = Math.max(0, dy);
        const dist = Math.hypot(dxClamped, dyClamped);
        if(dist < r - 1e-6) return true;
      }
    }
  }
  return false;
}