var renderer, scene, camera;
var cameraControls;
var movingCube; // Coche
var heightMapImage = null;   // La imagen del heightmap
var heightMapData = null;    // Datos de píxeles
var heightMapWidth = 0;
var heightMapHeight = 0;
var displacementScale = 40;
var carCameraOffset = new THREE.Vector3(0, 3, 4); // Cámara detrás del coche
var keyMaps = {}; // Mapa de teclas presionadas para mover el coche
var groundMesh; // Terreno del juego
var wheel1, wheel2, wheel3, wheel4; // Ruedas del coche
var bidones = []; // Bidones de gasolina en la escena
var total_bidones = 20 // Total de bidones a generar para el videojuego
var total_cactus = 70 // Total de cactus a generar para el videojuego
var barraTrasera; // Barra trasera del coche
var barraDiagonal; 
var volante; // Volante del coche
var loader; // Loader para cargar texturas
var stats; // Cuadrado para mostrar fps
var gasolina = 100; // Nivel de gasolina
var porcetajePorBidon = 3; // Cada bidón da un 3% de gasolina
var cactus = [] // Lista de cactus que aparecen en el mapa
var minimapa; // Minimapa del juego
var ganador = null; // Indica si has ganado el juego
const listener = new THREE.AudioListener();

const ambientSound = new THREE.Audio(listener);  // música de fondo
const motorSound = new THREE.Audio(listener);    // motor del coche
const pickupSound = new THREE.Audio(listener);   // sonido al recoger bidón

// Loaders independientes
const ambientLoader = new THREE.AudioLoader();
const motorLoader = new THREE.AudioLoader();
const bidonLoader = new THREE.AudioLoader();
var isAudioLoaded = false; // Flag para controlar si el audio ya está cargado
var isPlaying = false; // Flag para controlar si el audio ya está reproduciéndose

var ambientSoundPlaying = false; // Flag para poder saber si la música de fondo está sonando o no


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
  camera.add(listener)

  ambientLoader.load('/GPCProyecto/audios/western-loop.mp3', function(buffer) {
    ambientSound.setBuffer(buffer);
    ambientSound.setVolume(0.5);
    ambientSound.setLoop(true);
    ambientSound.play();
    ambientSoundPlaying = true;
  });

  // Añadir stats
  stats = new Stats();
  stats.setMode( 0 ); // Muestra FPS
	stats.domElement.style.position = 'absolute'; // Arriba izquierda
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.left = '0px';
	document.getElementById( 'container' ).appendChild( stats.domElement );

  // Cámara para el minimapa
  const zoom = 50;
  minimapa = new THREE.OrthographicCamera(-zoom, zoom, zoom, -zoom, 0.1, 1000);

  minimapa.position.set(0, 400, 0); // Vista aérea
  minimapa.lookAt(0, 0, 0);
  minimapa.up.set(0, 0, -1); // para que adelante del coche apunte hacia arriba


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

  // Luz ambiental
  scene.add(new THREE.AmbientLight(0x404040, 0.6));

  window.addEventListener('resize', updateAspectRatio);
}

// Función para crear un cactus. No encotraba modelos por internet así que he creado yo el cactus
function createCactus(){
  let x = (Math.random() - 0.5) * 300;
      let z = (Math.random() - 0.5) * 300;
      let y = getHeightAt(x, z);
      y -= 0.2 // para que se hunda un poco en el suelo porque aveces parece que flota

      const cactusObject = new THREE.Object3D();

      const paloRadius = 0.5;
      // Tronco del cactus
      const troncoCactus = new THREE.CylinderGeometry(paloRadius, paloRadius, 3, 8);
      // Parte redondeada del cactus
      const redondeoCactus = new THREE.SphereGeometry(paloRadius, 8, 8);

      // Material y malla del tronco
      const paloMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, metalness: 0.2, roughness: 0.8 });
      const paloMesh = new THREE.Mesh(troncoCactus, paloMaterial);
      paloMesh.position.set(0, 1.5, 0);
      paloMesh.castShadow = true;
      paloMesh.receiveShadow = true;
      cactusObject.add(paloMesh);

      // Material y malla de la parte redondeada
      const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, metalness: 0.2, roughness: 0.8 });
      const cactusMesh = new THREE.Mesh(redondeoCactus, cactusMaterial);
      cactusMesh.position.set(0, 3, 0);
      cactusObject.add(cactusMesh);

      // Palo horizontal del cactus
      const paloHorizontal1 = new THREE.CylinderGeometry(paloRadius * 0.7, paloRadius * 0.7, 2.5, 8);
      const paloHorizontalMesh1 = new THREE.Mesh(paloHorizontal1, paloMaterial);
      paloHorizontalMesh1.position.set(0, 2, 0);
      paloHorizontalMesh1.rotation.z = Math.PI / 2;
      cactusObject.add(paloHorizontalMesh1);

      // Parte redondeada del palo horizontal
      const redondeoHorizontal1 = new THREE.SphereGeometry(paloRadius * 0.68, 8, 8);
      const redondeoHorizontalMesh1 = new THREE.Mesh(redondeoHorizontal1, cactusMaterial);
      redondeoHorizontalMesh1.position.set(1.25, 2, 0); // Posición en el extremo derecho
      cactusObject.add(redondeoHorizontalMesh1);
      
      // Parte redondeada del otro extremo del palo horizontal
      const redondeoHorizontal2 = new THREE.SphereGeometry(paloRadius * 0.68, 8, 8);
      const redondeoHorizontalMesh2 = new THREE.Mesh(redondeoHorizontal2, cactusMaterial);
      redondeoHorizontalMesh2.position.set(-1.25, 2, 0); // Posición en el extremo izquierdo
      cactusObject.add(redondeoHorizontalMesh2);

      // TODO: Añadir pinchos

      cactusObject.position.set(x, y, z);

      return cactusObject
}

function loadScene() {
  // NOTE: https://www.youtube.com/watch?v=wULUAhckH9w
  // Aquí lo que se hace es crear el terreno a partir de un heightmap
  // La imagen del heightmap es una imagen de escala de grises donde el valor de cada píxel indica la altura en ese punto
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

    // Cargar el modelo del barril y tambien cargamos los cactus
    // Los cargamos aquí para asegurarnos que se cargan después de cargar el heightmap porque si lo hacia después de esta función no se cargaban
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

      // Aquí creamos multiples copias de los bidones
      for (let i = 0; i < total_bidones; i++) {
        let x = (Math.random() - 0.5) * 300;
        let z = (Math.random() - 0.5) * 300;
        let y = getHeightAt(x, z);

        let modelo = baseModel.clone(true);

        modelo.position.set(x, y + 0.5, z);
        modelo.userData = { name: "bidon" };

        bidones.push(modelo);
        scene.add(modelo);
      }
    });

    // Cargamos los cactus
    for (let i = 0; i < total_cactus; i++) {
      cactusObject = createCactus();
      scene.add(cactusObject);
      cactus.push(cactusObject);
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
  // Creamos el terreno con la textura de arena y el heigtmap para crear las montañas del desierto
  const groundMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    displacementMap: disMap,
    displacementScale: displacementScale,
    metalness: 0.1,
    roughness: 0.9
  });

  // Creamos el mesh del terreno
  groundMesh = new THREE.Mesh(floorGeometry, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Creamos el coche
  movingCube = new THREE.Object3D();
  movingCube.castShadow = true;
  movingCube.receiveShadow = true;
  scene.add(movingCube);

  // Rueda 1 del coche
  wheel1 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel1.rotation.z = Math.PI / 2; // Rotamos para que la rueda esté en posición correcta
  wheel1.position.set(3, 1, 2);
  movingCube.add(wheel1);

  // Rueda 2 del coche
  wheel2 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel2.rotation.z = Math.PI / 2;
  wheel2.position.set(-3, 1, 2);

  movingCube.add(wheel2);

  // Rueda 3 del coche
  wheel3 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel3.rotation.z = Math.PI / 2;
  wheel3.position.set(3, 1, -2);
  movingCube.add(wheel3);

  // Rueda 4 del coche
  wheel4 = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  wheel4.rotation.z = Math.PI / 2;
  wheel4.position.set(-3, 1, -2);
  movingCube.add(wheel4);

  movingCube.position.set(0, 10, 0)

  // Barra trasera
  barraTrasera = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraTrasera.position.set(0, 1, -2);
  movingCube.add(barraTrasera);

  // Bara derecha de las ruedas
  barraEnmedio1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 4),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraEnmedio1.position.set(3, 0, 0);
  movingCube.add(barraEnmedio1);

  // Barra izquierda de las ruedas
  barraEnmedio2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 4),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
  );
  barraEnmedio2.position.set(-3, 0, 0);
  movingCube.add(barraEnmedio2);

  // Volante
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

// Actualizar minimapa de acuerdo a la posición del coche
function updateMinimap() {
  minimapa.position.x = movingCube.position.x;
  minimapa.position.z = movingCube.position.z;
  minimapa.lookAt(movingCube.position.x, 0, movingCube.position.z);
}

function getHeightAt(x, z) {
  if (!heightMapData) return 0; // el mapa no está cargado aún
  const terrainSize = 400; // tamaño del plano en unidades
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

// Event listeners para capturar las teclas que están siendo pulsadas
document.addEventListener('keydown', (event) => {
  keyMaps[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
  keyMaps[event.key.toLowerCase()] = false;
});

function moveCar(delta) {
  const maxSpeed = 30; // maxma velocidad del coche
  const acceleration = 60; // aceleración para que el coche no arranque a la máxima velocidad nada más pulsar
  const deceleration = 20; // deceleración para que cuando suelte la tecla w el coche no se pare en seco
  const rotateSpeed = Math.PI; // rotación de las ruedas
  
  // guardamos para el coche la velocidad actual
  if (!movingCube.userData.velocity) {
    movingCube.userData.velocity = 0;
    // Manejar el audio del motor
  }

  if (!isAudioLoaded) {
      // NOTE: https://threejs.org/docs/#api/en/audio/Audio
      // NOTE: https://pixabay.com/es/sound-effects/motor-brake-sound-324220/
      motorLoader.load('/GPCProyecto/audios/motor-brake-sound.mp3', function(buffer) {
        motorSound.setBuffer(buffer);
        motorSound.setVolume(0.5); // Ajustar volumen según velocidad
        motorSound.setLoop(true); // El sonido se reproducirá en bucle
        isAudioLoaded = true;
      });
    }
    
    if (Math.abs(movingCube.userData.velocity) > 0.1) {
      if (isAudioLoaded && !isPlaying) {
        motorSound.play();
        motorSound.setVolume(0.5 + Math.min(Math.abs(movingCube.userData.velocity) / maxSpeed, 1) * 0.5); // Ajustar volumen según velocidad
        isPlaying = true;
      }
    } else {
      if (isPlaying) {
        motorSound.pause();
        isPlaying = false;
      }
    }
  
  let currentVelocity = movingCube.userData.velocity;
  let targetVelocity = 0;
  
  // Calculamos la velocidad a la que debería ir el coche
  if (keyMaps['w'] || keyMaps['arrowup']) {
    targetVelocity = -maxSpeed;
    if (keyMaps['shift']) {
      targetVelocity = -maxSpeed * 2; // pulsando shift pones turbo pero consumes más gasolina
      gasolina -= 0.05; // Consumir gasolina más rápido
    } else {
      gasolina -= 0.03; // Consumir gasolina lentamente
    }
    gasolina = Math.max(0, gasolina); // Asegurarse que la gasolina no sea negativa
  } else if (keyMaps['s'] || keyMaps['arrowdown']) {
    targetVelocity = maxSpeed;
    gasolina -= 0.02; // Consumir gasolina al ir marcha atrás
    gasolina = Math.max(0, gasolina);
  }
  
  // La ajustamos según la aceleración y deceleración
  if (currentVelocity < targetVelocity) {
    currentVelocity = Math.min(targetVelocity, currentVelocity + acceleration * delta);
  } else if (currentVelocity > targetVelocity) {
    currentVelocity = Math.max(targetVelocity, currentVelocity - deceleration * delta);
  }
  
  // Almacenamos la nueva velocidad
  movingCube.userData.velocity = currentVelocity;
  
  // Movemos el coche
  if (Math.abs(currentVelocity) > 0.01) {
    movingCube.translateZ(currentVelocity * delta);
  }
  let anguloGiro = 0
  const maxRotation = Math.PI / 3; // 30 grados

  // Cuando es marcha atrás el giro es inverso
  if (keyMaps['a'] || keyMaps['arrowleft']) {
    volante.rotation.y = Math.min(volante.rotation.y + rotateSpeed * delta, maxRotation);

    if(keyMaps['s'] || keyMaps['arrowdown']){
      movingCube.rotation.y += -rotateSpeed * delta;
    } else{
      movingCube.rotation.y += rotateSpeed * delta;
    }
    anguloGiro = Math.PI / 6;

  }
  // Si hacemos un giro rotamos el volante, para añadir algo de animación
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
  
  // Calcular el ángulo de rotación en el eje Z
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
  // Crear el contenedor para mostrar el nivel de gasolina
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
  if (gasolina <= 0 && ganador != true) {
    ganador = false
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
      gameOverMsg.style.padding = '30px';
      gameOverMsg.style.borderRadius = '10px';
      gameOverMsg.style.fontSize = '24px';
      gameOverMsg.style.fontFamily = 'Arial, sans-serif';
      gameOverMsg.style.textAlign = 'center';
      gameOverMsg.style.zIndex = '9999';

      const texto = document.createElement('div');
      texto.innerHTML = '¡Te has quedado sin gasolina!<br><br><strong>Has perdido 😢</strong>';

      const boton = document.createElement('button');
      boton.innerText = 'Reiniciar partida';
      boton.style.marginTop = '20px';
      boton.style.padding = '10px 20px';
      boton.style.fontSize = '18px';
      boton.style.border = 'none';
      boton.style.borderRadius = '5px';
      boton.style.backgroundColor = '#28a745';
      boton.style.color = 'white';
      boton.style.cursor = 'pointer';
      boton.style.transition = 'background 0.3s';

      boton.onclick = () => {
        location.reload();
      };

      gameOverMsg.appendChild(texto);
      gameOverMsg.appendChild(boton);
      document.body.appendChild(gameOverMsg);
    }
  } else {
    const gameOverMsg = document.getElementById('gameOverMsg');
    if (gameOverMsg) {
      gameOverMsg.remove();
    }
  }
}

function displaySuccess() {
  if (bidones.length === 0 && gasolina != 100 && ganador != false) {
    ganador = true
    let successMsg = document.getElementById('successMsg');
    if (!successMsg) {
      successMsg = document.createElement('div');
      successMsg.id = 'successMsg';
      successMsg.style.position = 'absolute';
      successMsg.style.top = '50%';
      successMsg.style.left = '50%';
      successMsg.style.transform = 'translate(-50%, -50%)';
      successMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      successMsg.style.color = 'white';
      successMsg.style.padding = '30px';
      successMsg.style.borderRadius = '10px';
      successMsg.style.fontSize = '24px';
      successMsg.style.fontFamily = 'Arial, sans-serif';
      successMsg.style.textAlign = 'center';
      successMsg.style.zIndex = '9999';
      successMsg.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

      const texto = document.createElement('div');
      texto.innerHTML = '🎉 ¡Has recogido todos los bidones! 🎉<br><br><strong>¡Has ganado! 🏆</strong>';

      const boton = document.createElement('button');
      boton.innerText = 'Jugar de nuevo';
      boton.style.marginTop = '20px';
      boton.style.padding = '10px 20px';
      boton.style.fontSize = '18px';
      boton.style.border = 'none';
      boton.style.borderRadius = '5px';
      boton.style.backgroundColor = '#007bff';
      boton.style.color = 'white';
      boton.style.cursor = 'pointer';
      boton.style.transition = 'background 0.3s';

      boton.onclick = () => {
        location.reload(); // reinicia el juego
      };

      successMsg.appendChild(texto);
      successMsg.appendChild(boton);
      document.body.appendChild(successMsg);
    }
  } else {
    const successMsg = document.getElementById('successMsg');
    if (successMsg) {
      successMsg.remove();
    }
  }
}

// Función para comprobar si el coche ha salido del terreno
// Si se ha salido, devuelvo el coche al centro del terreno
function checkOutOfBounds() {
  const limit = 200 + 20; // límite del terreno
  if (Math.abs(movingCube.position.x) > limit || Math.abs(movingCube.position.z) > limit) {
    // Si el coche sale del terreno, lo devolvemos al centro
    movingCube.position.set(0, getHeightAt(0, 0) + 2.5, 0);
    movingCube.userData.velocity = 0; // parar el coche
  }
}

// Función para pausar o reanudar la música ambiente
function pauseSong(){
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === 'm') {
      if(ambientSoundPlaying){
        ambientSound.pause();
        ambientSoundPlaying = false;
      } else{
        ambientSound.play();
        ambientSoundPlaying = true;
      }
   }
  })
}

document.addEventListener("wheel", (event) => {
  // Hacer zoom moviendo la rueda del ratón
  if (event.deltaY < 0) {
    camera.fov = Math.max(30, camera.fov - 2); 
  } else {
    camera.fov = Math.min(90, camera.fov + 2);
  }
  camera.updateProjectionMatrix();
});

function update() {
  moveCar(0.016); // asumiendo ~60fps, delta ~16ms

  // obtener altura del coche sobre el terreno
  let terrainHeight = getHeightAt(movingCube.position.x, movingCube.position.z);
  movingCube.position.y = terrainHeight + 2.5;
  checkOutOfBounds();
  pauseSong();

  // ajustar las ruedas a la altura del terreno
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

  // Comprobar intersecciones con el resto de bidones
  // NOTE: https://threejs.org/docs/index.html#api/en/math/Box3.intersectsBox
  // NOTE: https://stackoverflow.com/questions/66032362/using-intersect-intersectsbox-for-object-collision-threejs
  let carBox = new THREE.Box3().setFromObject(movingCube);

  // filtramos bidones que colisionan con el coche y si colisionan los eliminamos de la escena y de la lista de bidones
  bidones = bidones.filter((bidon) => {
    let bidonBox = new THREE.Box3().setFromObject(bidon);

    if (carBox.intersectsBox(bidonBox)) {
      if (pickupSound.buffer) {
      const pickupInstance = new THREE.Audio(listener);
      pickupInstance.setBuffer(pickupSound.buffer);
      pickupInstance.setVolume(1);
      pickupInstance.play();
      } else {
      bidonLoader.load('/GPCProyecto/audios/collectcoin.mp3', function(buffer) {
        pickupSound.setBuffer(buffer);
        pickupSound.setVolume(1);
        pickupSound.play();
      });
      }

      scene.remove(bidon);
      gasolina += porcetajePorBidon;
      gasolina = Math.min(100, gasolina);
      return false;
    }
    return true;
  });

  // filtramos cactus que colisionan con el coche y si colisionan los eliminamos de la escena y de la lista de cactus
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

  let gasolinaDisplay = document.getElementById('gasolinaDisplay');
  let bidonesRecogidos = document.getElementById('conteoBidones');
  if (bidonesRecogidos) {
    bidonesRecogidos.innerHTML = `Bidones restantes: ${bidones.length}/${total_bidones}`;
  }

  updatePercentajeGasolina(gasolinaDisplay);

  if(ganador == null){
    displayWarning();
    displaySuccess();
  }
  
  // Actualizar la posición de la cámara para que siga al coche
  let offset = carCameraOffset.clone();
  offset.applyQuaternion(movingCube.quaternion);

  camera.position.copy(movingCube.position).add(offset);

  let direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(movingCube.quaternion);
  let lookTarget = movingCube.position.clone().add(direction.multiplyScalar(5));

  camera.lookAt(lookTarget);
  // Actualizar las barras del coche
  updateBarra(barraTrasera, wheel3, wheel4);
  updateBarraEnmedio(barraEnmedio1, wheel1, wheel3);
  updateBarraEnmedio(barraEnmedio2, wheel2, wheel4);

  // Actualizar stats
  stats.update();

  // Actualizar minimapa
  updateMinimap();
}


function render() {
  requestAnimationFrame(render);
  update();
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);

  const padding = 20; // margen desde esquina
  const minimapSize = 200; // tamaño en píxeles

  renderer.setViewport(padding, window.innerHeight - minimapSize - padding, minimapSize, minimapSize);
  renderer.setScissor(padding, window.innerHeight - minimapSize - padding, minimapSize, minimapSize);
  renderer.setScissorTest(true);

  // Fondo semitransparente para el minimapa
  renderer.setClearColor(0x000000, 0.5); 
  renderer.clearDepth(); // solo limpiar profundidad para no borrar el render principal

  renderer.render(scene, minimapa);

  renderer.setScissorTest(false);
}
