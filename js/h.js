var renderer, scene, camera;
var cameraControls;
var movingCube; // Coche
var heightMapImage = null;   // La imagen del heightmap
var heightMapData = null;    // Datos de píxeles
var heightMapWidth = 0;
var heightMapHeight = 0;
var displacementScale = 40;
var carCameraOffset = new THREE.Vector3(1, 3, 4); // Cámara detrás del coche
var keyMaps = {}; // Mapa de teclas presionadas
var groundMesh; // Terreno
var wheel1, wheel2, wheel3, wheel4; // Ruedas del coche
var bidones = []; // Bidones de gasolina en la escena
var barraTrasera; // Barra trasera del coche
var barraDiagonal; 
var volante; // Volante del coche
var loader;
var stats;
var gasolina = 100; // Nivel de gasolina
var porcetajePorBidon = 3; // Cada bidón da un 3% de gasolina
var cactus = []

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

const clock = new THREE.Clock();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // suaviza las sombras
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x87CEEB)); // color cielo
  document.getElementById('container').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 5000);
  camera.position.set(30, 40, 60);

  //cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  //cameraControls.target.set(0, 0, 0);

  // Añadir stats
  stats = new Stats();
  stats.setMode( 0 );					// Muestra FPS
	stats.domElement.style.position = 'absolute';		// Abajo izquierda
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.left = '0px';
	document.getElementById( 'container' ).appendChild( stats.domElement );

  // luz direccional
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(200, 400, 200);
  light.castShadow = true;

  // Resolución del mapa de sombras
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;

  // Ajustar el área de proyección de la cámara de sombras
  const d = 500; 
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  light.shadow.camera.near = 1;
  light.shadow.camera.far = 1000;
    scene.add(light);

    // Luz ambiental suave
    scene.add(new THREE.AmbientLight(0x404040, 0.6));

  window.addEventListener('resize', updateAspectRatio);
}

function loadScene() {
  // NOTE: https://www.youtube.com/watch?v=wULUAhckH9w
  var floorGeometry = new THREE.PlaneGeometry(400, 400, 100, 100);

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

    // Cargar el modelo del barril una sola vez
    const loader = new THREE.GLTFLoader();
    loader.load("/GPCProyecto/models/oil_barrel_low-poly/scene.gltf", function (gltf) {
      const baseModel = gltf.scene;
      baseModel.scale.set(3, 3, 3);

      baseModel.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
      });

      // Crear múltiples copias
      for (let i = 0; i < 30; i++) {
        let x = (Math.random() - 0.5) * 300;
        let z = (Math.random() - 0.5) * 300;
        let y = getHeightAt(x, z);

        // Clonar el modelo en vez de volverlo a cargar
        let modelo = baseModel.clone(true);

        // Ajustar posición y rotación
        modelo.position.set(x, y + 0.5, z);
        modelo.userData = { name: "bidon" };

        bidones.push(modelo);
        scene.add(modelo);
      }
    });

    for (let i = 0; i < 20; i++) {
      let x = (Math.random() - 0.5) * 300;
      let z = (Math.random() - 0.5) * 300;
      let y = getHeightAt(x, z);

      const geometry = new THREE.ConeGeometry(1, 3, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x228B22, metalness: 0.2, roughness: 0.8 });
      const cactusMesh = new THREE.Mesh(geometry, material);
      cactusMesh.position.set(x, y + 1.5, z);
      scene.add(cactusMesh);
      cactus.push(cactusMesh);
    }

    console.log("Heightmap cargado y listo para lectura");
  };
  img.src = '/GPCProyecto/images/h.jpg';

  // Cargar heightmap
  let disMap = new THREE.TextureLoader().setPath('/GPCProyecto/images/').load("h.jpg");
  let sandTex = new THREE.TextureLoader().setPath('/GPCProyecto/images/').load("sand.jpg");


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
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  movingCube = new THREE.Object3D(); // contenedor vacío
  movingCube.castShadow = true;
  movingCube.receiveShadow = true;
  scene.add(movingCube);

  wheel1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 0, 0, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel1.rotation.z = Math.PI / 2;
  wheel1.position.set(3, 1, 2);
  movingCube.add(wheel1);

  wheel2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 0, 0, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel2.rotation.z = Math.PI / 2;
  wheel2.position.set(-3, 1, 2);

  movingCube.add(wheel2);

  wheel3 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel3.rotation.z = Math.PI / 2;
  wheel3.position.set(3, 1, -2);
  movingCube.add(wheel3);

  wheel4 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel4.rotation.z = Math.PI / 2;
  wheel4.position.set(-3, 1, -2);
  movingCube.add(wheel4);

  movingCube.position.set(0, 10, 0)

// --- Barra delantera ---

  // --- Barra trasera ---
  barraTrasera = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraTrasera.position.set(0, 1, -2);
  movingCube.add(barraTrasera);

  barraEnmedio1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 4), // ancho, alto, profundo
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraEnmedio1.position.set(3, 0, 0);
  movingCube.add(barraEnmedio1);

  barraEnmedio2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 4), // ancho, alto, profundo
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraEnmedio2.position.set(-3, 0, 0);
  movingCube.add(barraEnmedio2);

  volante = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );

  volante.position.set(-0.5, -0.5, -2)
  volante.rotation.x = Math.PI / 2
  volante.rotation.z = -Math.PI / 20
  movingCube.add(volante);

  scene.add(movingCube);
}

function updateAspectRatio() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function getHeightAt(x, z) {
  if (!heightMapData) return 0; // aún no cargado
  const terrainSize = 400; // tamaño del plano en unidades
  // El plano va de -100 a 100 en X y Z (porque es 200x200 centrado en 0)
  // Convertimos x,z a coordenadas UV [0, 1]
  let u = (x + terrainSize/2) / terrainSize;  // mapea -100..100 → 0..1
  let v = (z + terrainSize/2) / terrainSize;  // igual para z

  // Convertimos UV a coordenadas de píxel en la imagen
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
  const maxRotation = Math.PI / 3; // 30 grados

  // Handle rotation
  if (keyMaps['a'] || keyMaps['arrowleft']) {
    volante.rotation.y = Math.min(volante.rotation.y + rotateSpeed * delta, maxRotation);

    if(keyMaps['s'] || keyMaps['arrowdown']){
      movingCube.rotation.y += -rotateSpeed * delta;
    } else{
      movingCube.rotation.y += rotateSpeed * delta;
    }
    anguloGiro = Math.PI / 6;

  }
  if (keyMaps['d'] || keyMaps['arrowright']) {
    volante.rotation.y = Math.max(volante.rotation.y - rotateSpeed * delta, -maxRotation);
    if(keyMaps['s'] || keyMaps['arrowdown']){
      movingCube.rotation.y -= -rotateSpeed * delta;
    } else{
      movingCube.rotation.y -= rotateSpeed * delta;
    }
    anguloGiro = -Math.PI / 6;

  }
  wheel3.rotation.y = anguloGiro;
  wheel4.rotation.y = anguloGiro;

}

function updateBarra(barra, rueda1, rueda2) {
  // Calcular posición promedio entre las dos ruedas
  let pos1 = rueda1.position.clone();
  let pos2 = rueda2.position.clone();
  let posicionPromedio = pos1.clone().add(pos2).multiplyScalar(0.5);
  
  // Actualizar posición de la barra
  barra.position.copy(posicionPromedio);
  
  // Calcular el vector dirección entre las ruedas
  let direccion = pos2.clone().sub(pos1);
  
  // Calcular el ángulo de rotación en el eje Z (roll)
  // Usamos Math.atan2 para obtener el ángulo correcto
  let anguloZ = Math.atan2(direccion.y, direccion.x);
  
  // Aplicar la rotación manteniendo la orientación original
  barra.rotation.set(0, 0, anguloZ);
}

function updateBarraEnmedio(barra, rueda1, rueda2) {
  // Calcular posición promedio entre las dos ruedas
  let pos1 = rueda1.position.clone();
  let pos2 = rueda2.position.clone();
  let posicionPromedio = pos1.clone().add(pos2).multiplyScalar(0.5);
  
  // Actualizar posición de la barra
  barra.position.copy(posicionPromedio);
  
  // Calcular el vector dirección entre las ruedas (rueda trasera - rueda delantera)
  let direccion = pos2.clone().sub(pos2);
  
  // Para barras longitudinales (conectan adelante-atrás), necesitamos rotar en el eje X
  // El ángulo se calcula usando la diferencia en Y y Z
  let anguloX = Math.atan2(direccion.y, direccion.z);
  
  // Aplicar la rotación en el eje X para inclinar la barra longitudinalmente
  barra.rotation.set(anguloX, 0, 0);
}

function displayGasolina(){
  let gasolinaDisplay = document.getElementById('gasolinaDisplay');
    if (!gasolinaDisplay) {
      gasolinaDisplay = document.createElement('div');
      gasolinaDisplay.id = 'gasolinaDisplay';
      gasolinaDisplay.style.position = 'absolute';
      gasolinaDisplay.style.top = '20px';
      gasolinaDisplay.style.right = '20px';
      gasolinaDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      gasolinaDisplay.style.color = 'white';
      gasolinaDisplay.style.padding = '10px';
      gasolinaDisplay.style.borderRadius = '5px';
      gasolinaDisplay.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(gasolinaDisplay);
    }
}

function updatePercentajeGasolina(element) {
  // Actualizar el nivel de gasolina y cambiar color según nivel
  const gasolinaPorcentaje = Math.round(gasolina);
  let color = 'green';
  if (gasolinaPorcentaje < 30) color = 'red';
  else if (gasolinaPorcentaje < 70) color = 'orange';

  element.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Gasolina</div>
    <div style="width: 100px; height: 20px; background-color: #333; border-radius: 10px; overflow: hidden;">
      <div style="width: ${gasolinaPorcentaje}%; height: 100%; background-color: ${color};"></div>
    </div>
    <div style="text-align: center;">${gasolinaPorcentaje}%</div>
  `;
}

function displayWarning() {
 // Actualizar el mensaje si no hay gasolina
  if (gasolina <= 0) {
    let gameOverMsg = document.getElementById('gameOverMsg');
    if (!gameOverMsg) {
      gameOverMsg = document.createElement('div');
      gameOverMsg.id = 'gameOverMsg';
      gameOverMsg.style.position = 'absolute';
      gameOverMsg.style.top = '50%';
      gameOverMsg.style.left = '50%';
      gameOverMsg.style.transform = 'translate(-50%, -50%)';
      gameOverMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      gameOverMsg.style.color = 'white';
      gameOverMsg.style.padding = '20px';
      gameOverMsg.style.borderRadius = '10px';
      gameOverMsg.style.fontSize = '24px';
      gameOverMsg.style.fontFamily = 'Arial, sans-serif';
      gameOverMsg.style.textAlign = 'center';
      gameOverMsg.innerHTML = 'Sin gasolina!<br>Recoge bidones para continuar.';
      document.body.appendChild(gameOverMsg);
    }
  } else {
    const gameOverMsg = document.getElementById('gameOverMsg');
    if (gameOverMsg) {
      gameOverMsg.remove();
    }
  }
}

function update() {
  moveCar(0.016); // asumiendo ~60fps, delta ~16ms

  // --- ALTURA DEL COCHE SEGÚN TERRENO ---
  let terrainHeight = getHeightAt(movingCube.position.x, movingCube.position.z);
  movingCube.position.y = terrainHeight + 2.5;

  // --- ALTURA DE CADA RUEDA ---
  let wheels = [wheel1, wheel2, wheel3, wheel4];

  wheels.forEach((wheel) => {
    // Obtener posición global de la rueda
    let worldPos = wheel.getWorldPosition(new THREE.Vector3());

    // Altura del terreno en esa posición
    let groundHeight = getHeightAt(worldPos.x, worldPos.z);

    // Ajustar rueda en Y: altura del terreno + radio
    let targetY = groundHeight + 1; // radio = 1 (porque CylinderGeometry de radio 1)

    // Convertimos a coordenadas locales del coche
    let localPos = wheel.position.clone();
    localPos.y += (targetY - worldPos.y);

    wheel.position.y = localPos.y;
  });

  gasolina -= 0.05; // Consumir gasolina lentamente
  gasolina = Math.max(0, gasolina); // No puede ser negativa

  // Comprobar intersecciones con el resto de bidones
  // NOTE: https://threejs.org/docs/index.html#api/en/math/Box3.intersectsBox
  // NOTE: https://stackoverflow.com/questions/66032362/using-intersect-intersectsbox-for-object-collision-threejs
  let carBox = new THREE.Box3().setFromObject(movingCube);

  // Use filter to create a new array without the collected bidones
  bidones = bidones.filter((bidon) => {
    let bidonBox = new THREE.Box3().setFromObject(bidon);

    if (carBox.intersectsBox(bidonBox)) {
      scene.remove(bidon);
      gasolina += porcetajePorBidon;
      gasolina = Math.min(100, gasolina);
      return false;
    }
    return true;
  });

  cactus = cactus.filter((c) => {
    let cactusBox = new THREE.Box3().setFromObject(c);
    if (carBox.intersectsBox(cactusBox)) {
      gasolina -= 10;
      gasolina = Math.max(0, gasolina);
      scene.remove(c);
      return false;
    }
    return true;
  });

  displayGasolina();
  let gasolinaDisplay = document.getElementById('gasolinaDisplay');

  updatePercentajeGasolina(gasolinaDisplay);

  displayWarning();

  // --- CÁMARA DETRÁS DEL COCHE ---
  let offset = carCameraOffset.clone();
  offset.applyQuaternion(movingCube.quaternion);

  camera.position.copy(movingCube.position).add(offset);

  let direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(movingCube.quaternion);
  let lookTarget = movingCube.position.clone().add(direction.multiplyScalar(5));

  camera.lookAt(lookTarget);

  updateBarra(barraTrasera, wheel3, wheel4);

  updateBarraEnmedio(barraEnmedio1, wheel1, wheel3);
  updateBarraEnmedio(barraEnmedio2, wheel2, wheel4);
  stats.update();

}


function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
