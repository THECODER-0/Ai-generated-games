// 3D Maze Rendering with Three.js

// Load Three.js via CDN (if not present)
(function loadThree() {
    if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.min.js';
        document.head.appendChild(script);
    }
})();

let renderer, scene, camera, animationId;

function renderMaze3D(maze, size) {
    // Wait if Three.js isn't loaded yet
    if (!window.THREE) {
        setTimeout(()=>renderMaze3D(maze,size),100);
        return;
    }
    disposeThreeJS();

    const cellSize = 3;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f4e7);

    // Basic camera
    camera = new THREE.PerspectiveCamera(65, 0.8, 0.1, 2500);
    camera.position.set(-cellSize*2, cellSize*size*0.8, cellSize*size*1.1);
    camera.lookAt(cellSize*size/2, 0, cellSize*size/2);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfefae0, 0.92);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xcfc68d, 0.6);
    dirLight.position.set(cellSize*size, cellSize*size, cellSize*size);
    scene.add(dirLight);

    // "Backrooms" wall material
    const wallMat = new THREE.MeshPhongMaterial({
        color: 0xd6d1a4,
        emissive: 0xebe4c6,
        shininess: 5
    });

    // "Carpet" floor
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xb6b690 });

    // Floor mesh
    const floorGeom = new THREE.BoxGeometry(cellSize*size, 0.6, cellSize*size);
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(cellSize*size/2-cellSize/2, -0.38, cellSize*size/2-cellSize/2);
    scene.add(floorMesh);

    // Walls
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (maze[y][x] === 1) {
                const wallGeom = new THREE.BoxGeometry(cellSize, 2.6, cellSize);
                const wallMesh = new THREE.Mesh(wallGeom, wallMat);
                wallMesh.position.set(x*cellSize, 1.3, y*cellSize);
                // Flickering "fluorescent" effect on some walls
                wallMesh.material.emissiveIntensity = 0.8 + (Math.random() * 0.3);
                scene.add(wallMesh);
            }
            // Start/end highlight
            if (y === 1 && x === 1) {
                const startGeom = new THREE.BoxGeometry(cellSize, 0.8, cellSize);
                const startMat = new THREE.MeshPhongMaterial({color:0x7adeb5});
                const startMesh = new THREE.Mesh(startGeom, startMat);
                startMesh.position.set(x*cellSize, 0, y*cellSize);
                scene.add(startMesh);
            }
            if (y === size-2 && x === size-2) {
                const endGeom = new THREE.BoxGeometry(cellSize, 0.8, cellSize);
                const endMat = new THREE.MeshPhongMaterial({color:0xbf7070});
                const endMesh = new THREE.Mesh(endGeom, endMat);
                endMesh.position.set(x*cellSize, 0, y*cellSize);
                scene.add(endMesh);
            }
        }
    }

    // Optional: Pillar "lamps" in backrooms
    for (let i = 2; i < size; i+=7) {
        for (let j = 2; j < size; j+=7) {
            const lampGeom = new THREE.CylinderGeometry(0.32,0.32,3.5,12);
            const lampMat = new THREE.MeshPhongMaterial({color:0xefeecf, emissive:0xfdf6a0, emissiveIntensity:0.72});
            const lampMesh = new THREE.Mesh(lampGeom, lampMat);
            lampMesh.position.set(i*cellSize,1.75,j*cellSize);
            scene.add(lampMesh);
        }
    }

    // Render setup
    const canvasDiv = document.getElementById('threejs-canvas');
    canvasDiv.innerHTML = ''; // clear
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xf4eedc);
    renderer.setSize(canvasDiv.offsetWidth, canvasDiv.offsetHeight);
    canvasDiv.appendChild(renderer.domElement);

    // Controls: simple orbit
    let angle = 0;
    function animate() {
        angle += 0.003; // Slow rotation
        camera.position.x = cellSize*size/2 + Math.cos(angle)*cellSize*size*1.2;
        camera.position.z = cellSize*size/2 + Math.sin(angle)*cellSize*size*1.2;
        camera.lookAt(cellSize*size/2,0,cellSize*size/2);
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function disposeThreeJS() {
    if (renderer) {
        renderer.dispose(); renderer = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    scene = null;
    camera = null;

    const canvasDiv = document.getElementById('threejs-canvas');
    if (canvasDiv) canvasDiv.innerHTML = '';
}
