var renderer, scene, camera;
var cameraControls;
var movingCube; // <-- Añadimos esta línea
var heightMapImage = null;   // La imagen del heightmap
var heightMapData = null;    // Datos de píxeles
var heightMapWidth = 0;
var heightMapHeight = 0;
var displacementScale = 40;  // ¡Importante! Debe coincidir con el material
var carCameraOffset = new THREE.Vector3(0, 15, 30);
var keyMaps = {};
var groundMesh;
var bidones = [];
var gltfLoader = new THREE.GLTFLoader();
// Variables globales
var ruedas = [];   // todas
var ruedasDelanteras = []; // las dos de delante
var ruedasTraseras = [];   // las dos de atrás


// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x87CEEB)); // color cielo
  document.getElementById('container').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 5000);
  camera.position.set(30, 40, 60);

  //cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  //cameraControls.target.set(0, 0, 0);

  // luz direccional
  const dirLight = new THREE.DirectionalLight(0xfff2cc, 1.0);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  // luz ambiente tenue y cálida
  scene.add(new THREE.AmbientLight(0xffddaa, 0.4));

  window.addEventListener('resize', updateAspectRatio);
}

function loadScene() {
  // NOTE: https://www.youtube.com/watch?v=wULUAhckH9w
  var floorGeometry = new THREE.PlaneGeometry(800, 800, 600, 600);

  let img = new Image();
  img.onload = function() {
    heightMapImage = img;
    heightMapWidth = img.width;
    heightMapHeight = img.height;

    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    heightMapData = ctx.getImageData(0, 0, img.width, img.height).data;

    for (let i = 0; i < 30; i++) {
      let bidon = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 2, 12),
        new THREE.MeshStandardMaterial({ color: 0xaa3333, metalness: 0.3, roughness: 0.8 })
      );

      let x = (Math.random() - 0.5) * 600; // dentro del terreno
      let z = (Math.random() - 0.5) * 600;
      let y = getHeightAt(x, z);

      bidon.position.set(x, y + 0.5, z); // apoyado en el terreno
      bidon.userData = {name: 'bidon'}
      bidones.push(bidon);
      scene.add(bidon);
    }

    console.log("Heightmap cargado y listo para lectura");
  };
  img.src = '../images/h.jpg';

  // Cargar heightmap
  let disMap = new THREE.TextureLoader().setPath('../images/').load("h.jpg");
  let sandTex = new THREE.TextureLoader().setPath('../images/').load("sand.jpg");


  disMap.wrapS = disMap.wrapT = THREE.RepeatWrapping;
  disMap.repeat.set(5, 5);

  // Material con mapa de desplazamiento
  const groundMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    //wireframe: true,
    displacementMap: disMap,
    displacementScale: displacementScale,
    metalness: 0.1,
    roughness: 0.9
  });

  groundMesh = new THREE.Mesh(floorGeometry, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  scene.add(groundMesh);

  movingCube = new THREE.Object3D(); // contenedor vacío

  gltfLoader.load(
  'models/Heuer_FS2_coloured.gltf', // <-- ruta de tu coche
  function (gltf) {
    movingCube = gltf.scene;
    movingCube.scale.set(0.05, 0.05, 0.05); // escala adecuada
    movingCube.position.set(0, -2, 0); // posición inicial
    scene.add(movingCube);

    gltf.scene.traverse((child) => {
      if (child.isMesh && child.name.includes("Cylinder.1")) {
        ruedas.push(child);
      }
    });

    // Ordenar ruedas por posición Z (para separar delanteras y traseras)
    ruedas.sort((a, b) => a.position.z - b.position.z);

    // Suponemos que las 2 primeras son traseras y las 2 últimas delanteras
    ruedasTraseras = [ruedas[0], ruedas[1]];
    ruedasDelanteras = [ruedas[2], ruedas[3]];

    console.log("Coche cargado correctamente");
  },
  undefined,
  function (error) {
    console.error("Error al cargar el coche:", error);
  }
);
}

function updateAspectRatio() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function getHeightAt(x, z) {
  if (!heightMapData) return 0; // aún no cargado

  // El plano va de -100 a 100 en X y Z (porque es 200x200 centrado en 0)
  // Convertimos x,z a coordenadas UV [0, 1]
  let u = (x + 400) / 800;  // mapea -100..100 → 0..1
  let v = (z + 400) / 800;  // igual para z

  // Convertimos UV a píxeles
  let pixelX = Math.floor(u * heightMapWidth);
  let pixelY = Math.floor(v * heightMapHeight);

  // Asegurar límites
  pixelX = Math.max(0, Math.min(pixelX, heightMapWidth - 1));
  pixelY = Math.max(0, Math.min(pixelY, heightMapHeight - 1));

  // Leer el valor en la textura (asumimos escala de grises: R=G=B)
  // Los datos están en: [R, G, B, A, R, G, B, A, ...]
  let index = (pixelY * heightMapWidth + pixelX) * 4;
  let grayValue = heightMapData[index] / 255.0; // normalizar 0-1

  // Aplicar escala de desplazamiento
  return grayValue * displacementScale;
}

document.addEventListener('keydown', (event) => {
  keyMaps[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
  keyMaps[event.key.toLowerCase()] = false;
});

function moveCar(delta) {
  const maxSpeed = 30; // maximum speed units per second
  const acceleration = 60; // units per second squared
  const deceleration = 20; // units per second squared
  const rotateSpeed = Math.PI; // radians per second
  // Store and manage velocity as a persistent variable
  if (!movingCube.userData.velocity) {
    movingCube.userData.velocity = 0;
  }
  
  let currentVelocity = movingCube.userData.velocity;
  let targetVelocity = 0;
  
  // Determine target velocity based on input
  if (keyMaps['w'] || keyMaps['arrowup']) {
    targetVelocity = -maxSpeed; // negative Z is forward
    if (keyMaps['shift']) {
      targetVelocity = -maxSpeed * 2; // boost with shift
    }
  } else if (keyMaps['s'] || keyMaps['arrowdown']) {
    targetVelocity = maxSpeed; // positive Z is backward
  }
  
  // Smoothly adjust current velocity towards target
  if (currentVelocity < targetVelocity) {
    currentVelocity = Math.min(targetVelocity, currentVelocity + acceleration * delta);
  } else if (currentVelocity > targetVelocity) {
    currentVelocity = Math.max(targetVelocity, currentVelocity - deceleration * delta);
  }
  
  // Store updated velocity
  movingCube.userData.velocity = currentVelocity;
  
  // Apply movement if there's any velocity
  if (Math.abs(currentVelocity) > 0.01) {
    movingCube.translateZ(currentVelocity * delta);
  }
  let anguloGiro = 0
  // Handle rotation
  if (keyMaps['a'] || keyMaps['arrowleft']) {
    movingCube.rotation.y += rotateSpeed * delta;
    anguloGiro = Math.PI / 6;

  }
  if (keyMaps['d'] || keyMaps['arrowright']) {
    movingCube.rotation.y -= rotateSpeed * delta;
    anguloGiro = -Math.PI / 6;
  }
}

function update() {
  moveCar(0.016); // asumiendo ~60fps, delta ~16ms

  // --- ALTURA DEL COCHE SEGÚN TERRENO ---
  let terrainHeight = getHeightAt(movingCube.position.x, movingCube.position.z);
  movingCube.position.y = terrainHeight;


  // Comprobar intersecciones con el resto de bidones
  // NOTE: https://threejs.org/docs/index.html#api/en/math/Box3.intersectsBox
  // NOTE: https://stackoverflow.com/questions/66032362/using-intersect-intersectsbox-for-object-collision-threejs
  let carBox = new THREE.Box3().setFromObject(movingCube);

  bidones.forEach((bidon) => {
    let bidonBox = new THREE.Box3().setFromObject(bidon);

    if (carBox.intersectsBox(bidonBox)) {
      scene.remove(bidon);
    }
  });

  // --- CÁMARA DETRÁS DEL COCHE ---
  let offset = carCameraOffset.clone();
  offset.applyQuaternion(movingCube.quaternion);

  camera.position.copy(movingCube.position).add(offset);

  let direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(movingCube.quaternion);
  let lookTarget = movingCube.position.clone().add(direction.multiplyScalar(5));
  camera.lookAt(lookTarget);
}


function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
