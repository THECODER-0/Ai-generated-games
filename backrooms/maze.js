// Maze generation and import/export logic

let mazeSize = 10;
let maze = [];

// Maze cell bits: 0=open, 1=wall
function randomMaze(size) {
    maze = [];
    for (let y = 0; y < size; y++) {
        let row = [];
        for (let x = 0; x < size; x++) {
            // Border cells are always wall, others are random
            if (y === 0 || y === size-1 || x === 0 || x === size-1) {
                row.push(1); // wall
            } else {
                row.push(Math.random() < 0.25 ? 1 : 0); // open/wall
            }
        }
        maze.push(row);
    }
    // Set start/end positions
    maze[1][1] = 0; // start
    maze[size-2][size-2] = 0; // end
}

// Render maze in grid
function renderMaze() {
    const container = document.getElementById('maze-container');
    container.style.setProperty('--maze-size', mazeSize);
    container.innerHTML = '';
    for (let y = 0; y < mazeSize; y++) {
        for (let x = 0; x < mazeSize; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (maze[y][x] === 1) cell.classList.add('wall');
            if (y === 1 && x === 1) cell.classList.add('start');
            if (y === mazeSize-2 && x === mazeSize-2) cell.classList.add('end');
            container.appendChild(cell);
        }
    }
}

// Export maze to JSON file
function exportMaze() {
    const data = {
        size: mazeSize,
        maze: maze
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'maze.json';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
}

// Import maze from JSON file
function importMaze(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (typeof data.size === 'number' && Array.isArray(data.maze)) {
                mazeSize = data.size;
                maze = data.maze;
                document.getElementById('maze-size').value = mazeSize;
                renderMaze();
            } else {
                alert("Invalid maze file");
            }
        } catch {
            alert("Error reading maze file");
        }
    };
    reader.readAsText(file);
}

document.getElementById('maze-size').addEventListener('change', e => {
    mazeSize = parseInt(e.target.value);
    randomMaze(mazeSize);
    renderMaze();
});
document.getElementById('generate-maze').addEventListener('click', () => {
    randomMaze(mazeSize);
    renderMaze();
});

document.getElementById('export-maze').addEventListener('click', exportMaze);

document.getElementById('import-maze-btn').addEventListener('click', () => {
    document.getElementById('import-maze').click();
});
document.getElementById('import-maze').addEventListener('change', e => {
    if (e.target.files[0]) {
        importMaze(e.target.files[0]);
    }
});

document.getElementById('view-3d').addEventListener('click', () => {
    document.getElementById('three-container').style.display = '';
    document.getElementById('maze-container').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    renderMaze3D(maze, mazeSize);
});

document.getElementById('close-3d').addEventListener('click', () => {
    document.getElementById('three-container').style.display = 'none';
    document.getElementById('maze-container').style.display = '';
    document.getElementById('controls').style.display = '';
    disposeThreeJS();
});

// Initial maze
randomMaze(mazeSize);
renderMaze();
