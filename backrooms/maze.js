// Maze editor, generation, import/export, and painting tools
let mazeSize = 16;
let maze = [];
let startPos = {x:1,y:1};
let endPos = {x:mazeSize-2,y:mazeSize-2};

// Tools: "wall" | "empty" | "rect" | "start" | "end"
let currentTool = 'wall';
let isPainting = false;
let paintMode = 'wall'; // temporary mode during drag
let rectStart = null;

const container = document.getElementById('maze-container');
const sizeSelect = document.getElementById('maze-size');

function init() {
  sizeSelect.value = mazeSize;
  sizeSelect.addEventListener('change', onSizeChange);
  document.getElementById('generate-maze').addEventListener('click', ()=>{randomMaze(mazeSize); renderMaze();});
  document.getElementById('clear-maze').addEventListener('click', ()=>{clearMaze(); renderMaze();});
  document.getElementById('export-maze').addEventListener('click', exportMaze);
  document.getElementById('import-maze-btn').addEventListener('click', ()=>document.getElementById('import-maze').click());
  document.getElementById('import-maze').addEventListener('change', e=>{ if (e.target.files[0]) importMaze(e.target.files[0]); });

  // tool buttons
  const tools = ['wall','empty','rect','start','end'];
  tools.forEach(t=>{
    const btn = document.getElementById('tool-'+t);
    if(!btn) return;
    btn.addEventListener('click', ()=>{ setTool(t); });
  });

  // editor mouse handlers
  container.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mouseup', ()=>{ isPainting=false; rectStart=null; });
  container.addEventListener('mouseover', onPointerOver);
  container.addEventListener('mousemove', onPointerMove);

  // view 3d
  document.getElementById('view-3d').addEventListener('click', ()=> {
    document.getElementById('three-container').classList.remove('hidden');
    document.getElementById('controls').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
    renderMaze3D(maze, mazeSize, startPos);
  });
  document.getElementById('exit-3d').addEventListener('click', ()=> {
    disposeThreeJS();
    document.getElementById('three-container').classList.add('hidden');
    document.getElementById('controls').style.display = '';
    document.getElementById('editor').style.display = '';
  });

  randomMaze(mazeSize);
  renderMaze();
}

function onSizeChange(e){
  mazeSize = parseInt(e.target.value,10);
  startPos = {x:1,y:1};
  endPos = {x:mazeSize-2,y:mazeSize-2};
  randomMaze(mazeSize);
  renderMaze();
}

function randomMaze(size){
  maze = [];
  for(let y=0;y<size;y++){
    const row=[];
    for(let x=0;x<size;x++){
      if (y===0||x===0||y===size-1||x===size-1) row.push(1);
      else row.push(Math.random()<0.28?1:0);
    }
    maze.push(row);
  }
  // ensure start/end open
  maze[1][1]=0; maze[size-2][size-2]=0;
  startPos = {x:1,y:1};
  endPos = {x:size-2,y:size-2};
}

function clearMaze(){
  maze = [];
  for(let y=0;y<mazeSize;y++){
    const row=[];
    for(let x=0;x<mazeSize;x++) row.push((y===0||x===0||y===mazeSize-1||x===mazeSize-1)?1:0);
    maze.push(row);
  }
  startPos={x:1,y:1};
  endPos={x:mazeSize-2,y:mazeSize-2};
}

function renderMaze(){
  container.style.setProperty('--maze-size', mazeSize);
  container.innerHTML = '';
  for(let y=0;y<mazeSize;y++){
    for(let x=0;x<mazeSize;x++){
      const d=document.createElement('div');
      d.className='cell';
      d.dataset.x=x; d.dataset.y=y;
      if(maze[y][x]===1) d.classList.add('wall');
      if(x===startPos.x && y===startPos.y) d.classList.add('start');
      if(x===endPos.x && y===endPos.y) d.classList.add('end');
      container.appendChild(d);
    }
  }
}

function setTool(t){
  currentTool = t;
  document.querySelectorAll('button.tool').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('tool-'+t);
  if(btn) btn.classList.add('active');
}

// Editor pointer handlers
function onPointerDown(e){
  const tile = getTileFromEvent(e);
  if(!tile) return;
  const x=tile.x, y=tile.y;
  if(currentTool==='wall' || currentTool==='empty'){
    isPainting=true;
    paintMode = (currentTool==='wall')?1:0;
    applyPaint(x,y,paintMode);
    renderMaze();
  } else if(currentTool==='rect'){
    if(!rectStart) rectStart={x,y};
    else {
      // draw rectangle between rectStart and this tile
      const x0=Math.min(rectStart.x,x), x1=Math.max(rectStart.x,x);
      const y0=Math.min(rectStart.y,y), y1=Math.max(rectStart.y,y);
      for(let yy=y0;yy<=y1;yy++) for(let xx=x0;xx<=x1;xx++) maze[yy][xx]=1;
      rectStart=null;
      renderMaze();
    }
  } else if(currentTool==='start'){
    // clear previous start cell class and set new start (only on empty)
    if(maze[y][x]===0){ startPos={x,y}; renderMaze(); }
  } else if(currentTool==='end'){
    if(maze[y][x]===0){ endPos={x,y}; renderMaze(); }
  }
}

function onPointerOver(e){
  if(!isPainting) return;
  const tile = getTileFromEvent(e);
  if(!tile) return;
  applyPaint(tile.x,tile.y,paintMode);
  renderMaze();
}

function onPointerMove(e){
  // optional: preview rectangle while dragging with rect tool
  if(currentTool==='rect' && rectStart){
    // redraw preview by re-rendering base and overlay; keep simple - no preview for now
  }
}

function applyPaint(x,y,val){
  if(x<=0||y<=0||x>=mazeSize-1||y>=mazeSize-1) return;
  maze[y][x]=val;
  // prevent painting over start/end; move them if overwritten
  if(x===startPos.x && y===startPos.y && val===1) startPos={x:1,y:1};
  if(x===endPos.x && y===endPos.y && val===1) endPos={x:mazeSize-2,y:mazeSize-2};
}

function getTileFromEvent(e){
  const el = e.target;
  if(!el || !el.classList.contains('cell')) return null;
  return { x: parseInt(el.dataset.x,10), y: parseInt(el.dataset.y,10) };
}

// Export / Import
function exportMaze(){
  const data = { size:mazeSize, maze, startPos, endPos };
  const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'backrooms-maze.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

function importMaze(file){
  const r=new FileReader();
  r.onload = (ev)=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(typeof data.size==='number' && Array.isArray(data.maze)){
        mazeSize = data.size;
        maze = data.maze;
        startPos = data.startPos || {x:1,y:1};
        endPos = data.endPos || {x:mazeSize-2,y:mazeSize-2};
        document.getElementById('maze-size').value = mazeSize;
        renderMaze();
      } else alert('Invalid maze file');
    }catch(err){ alert('Error reading file'); }
  };
  r.readAsText(file);
}

// allow keyboard shortcuts for tools
window.addEventListener('keydown', (e)=>{
  if(e.key==='1') setTool('wall');
  if(e.key==='2') setTool('empty');
  if(e.key==='3') setTool('rect');
  if(e.key==='4') setTool('start');
  if(e.key==='5') setTool('end');
});

init();