var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var robot;

// partes que necesitaremos controlar
var base, brazo, eje, rotula, antebrazo, mano, pinzaIzq, pinzaDer;

var keymap = {};

// capturamos tanto teclas normales como flechas
document.addEventListener('keydown', (event) => {
    keymap[event.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (event) => {
    keymap[event.key.toLowerCase()] = false;
});

var gui = new dat.GUI();
var robotFolder = gui.addFolder('Robot');
robotFolder.open();

var params = {
  // movement
  speed: 0.4,
  // rotations (grados)
  baseY: 0,          // [-180..180]
  ejeZ: 0,           // [-45..45]
  rotulaY: 0,        // [-180..180]
  rotulaZ: 0,        // [-90..90]
  manoZ: 0,          // [-40..220]
  pinzaOpen: 3,      // [0..15] distancia de apertura
  wireframe: false
};

// --- helpers ---
function degToRad(d){ return d * Math.PI / 180; }
function setMaterialWireframe(root, w){
  root.traverse(function(obj){
    if (obj.isMesh && obj.material){
      obj.material.wireframe = w;
      // si el material no soporta wireframe y es un array: intenta forzar
    }
  });
}

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init()
{
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 100 );
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 6, 0 );

  window.addEventListener('resize', updateAspectRatio );
}

function loadScene(){
    var floorGeometry = new THREE.PlaneGeometry(10000, 10000, 10, 10);
    var floorMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA });
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2);
    scene.add(floor);

    robot = new THREE.Object3D();
    scene.add(robot);

    // Base del robot
    base = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 1.5, 16),
      new THREE.MeshNormalMaterial()
    );
    base.position.set(0, 0.75, 0); // centro de la base
    robot.add(base);

    // Brazo del robot (grupo)
    brazo = new THREE.Object3D();
    base.add(brazo);

    let esparragoColor = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    let esparrago  = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.8, 32), esparragoColor);
    esparrago.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2);
    esparrago.position.set(0, 1.5, 0);
    brazo.add(esparrago);
    
    // Eje: ahora padre de todo lo que va encima
    eje = new THREE.Object3D();
    eje.position.y = 0; // eje al nivel del brazo
    brazo.add(eje);

    // Crear un mesh para visualizar el eje
    const ejeVisual = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 12, 16), // radio, radio, altura
        new THREE.MeshNormalMaterial({ wireframe: false })
    );
    ejeVisual.position.y = 6; // centrar el cilindro con respecto a todo lo que gira
    eje.add(ejeVisual);

    // Rótula (bola)
    rotula = new THREE.Mesh(new THREE.SphereGeometry(2, 18, 18), new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
    rotula.position.y = 12; // relativo al eje
    eje.add(rotula);

    // Antebrazo
    antebrazo = new THREE.Object3D();
    antebrazo.position.y = 12; // relativo al eje
    eje.add(antebrazo);

    let discoGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.6, 32);
    let discoMaterial = new THREE.MeshNormalMaterial();
    let disco = new THREE.Mesh(discoGeometry, discoMaterial);
    disco.position.y = 0; // relativo a antebrazo
    antebrazo.add(disco);

    // nervios
    for(let i = 0; i < 4; i++){
        let nervio = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.6, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000FF }));
        nervio.position.y = 3.5; // relativo al antebrazo
        let angle = i * Math.PI/2 + Math.PI/4;
        nervio.position.x = Math.cos(angle) * 1.5;
        nervio.position.z = Math.sin(angle) * 1.5;
        antebrazo.add(nervio);
    }

    // disco superior (relativo a antebrazo)
    let disco2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 5, 32), discoMaterial);
    disco2.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI/2);
    disco2.position.y = 6.5;
    antebrazo.add(disco2);

    // mano y pinzas
    // creación de geometría de pinza (igual que la tuya)
    var vertices = new Float32Array([
      0, 0, 0,
      1.9, 0, 0,
      0, 2, 0,
      1.9, 2, 0,
      3.8, 0.5, -0.1,
      3.8, 1.5, -0.1,
      0, 0, -0.4,
      1.9, 0, -0.4,
      0, 2, -0.4,
      1.9, 2, -0.4,
      3.8, 0.5, -0.3,
      3.8, 1.5, -0.3,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([
      0,1,2, 2,1,3, 1,4,3, 3,4,5,
      6,8,7, 7,8,9, 7,9,10, 9,11,10,
      0,6,1, 1,6,7, 1,7,4, 4,7,10, 4,10,5, 5,10,11, 5,11,3, 3,11,9, 3,9,2, 2,9,8, 2,8,0, 0,8,6,
    ]);
    geometry.computeVertexNormals();
    const material = new THREE.MeshNormalMaterial();

    pinzaIzq = new THREE.Mesh(geometry, material);
    pinzaIzq.position.z = -1;
    pinzaIzq.position.y = -1;
    // dejamos pinzaIzq.position.x = 0 inicialmente

    pinzaDer = pinzaIzq.clone();
    pinzaDer.position.y = -1;
    pinzaDer.position.z = 1;
    // pinzaDer.position.x = 0

    mano = new THREE.Object3D();
    mano.position.set(0, 6.5, 0); // mano relativa a antebrazo
    mano.add(pinzaIzq);
    mano.add(pinzaDer);

    // anclamos la mano al antebrazo
    antebrazo.add(mano);

    // finalmente, añadimos la base y brazo (ya estamos añadiéndolos antes)
    robot.add(base); // base ya añadido, no cae mal añadir otra vez (si quieres evitar duplicates - revisa)
    // (brazo, rotula y antebrazo ya añadidos)

    // --- GUI: añadimos controles ---
    // Movilidad (velocidad)
    robotFolder.add(params, 'speed', 0.05, 2).name('Velocidad');

    // 2. Giro de la base sobre Y [-180..180]
    robotFolder.add(params, 'baseY', -180, 180).name('Base Y (°)');

    // 3. Giro del brazo sobre Z de la pieza 'eje' [-45..45]
    robotFolder.add(params, 'ejeZ', -45, 45).name('Eje Z (°)');

    // 4. Giro del antebrazo sobre Y de la pieza 'rotula' [-180..180]
    robotFolder.add(params, 'rotulaY', -180, 180).name('Rotula Y (°)');

    // 5. Giro del antebrazo sobre Z de la pieza 'rotula' [-90..90]
    robotFolder.add(params, 'rotulaZ', -90, 90).name('Rotula Z (°)');

    // 6. Rotación de la pinza sobre Z de la mano [-40..220]
    robotFolder.add(params, 'manoZ', -40, 220).name('Mano Z (°)');

    // 7. Apertura/Cierre de la pinza sobre el eje X relativo a la mano [0..15]
    robotFolder.add(params, 'pinzaOpen', 0, 1.6*2).name('Apertura pinza');

    // 8. Checkbox para cambio de alámbrico a sólido
    robotFolder.add(params, 'wireframe').name('Alambrico/Solido').onChange(function(value){
      setMaterialWireframe(scene, value);
    });

    // 9. Boton para animar el robot
    robotFolder.add({ animar: function(){ animarRobot(); } }, 'animar').name('Animar Robot');

    robotFolder.open();

    // aplicamos el wireframe inicial
    setMaterialWireframe(scene, params.wireframe);
}

// resolver resize
function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function animarRobot() {
  // Variable para controlar el estado de la animación
  let animating = false;
  let animationStep = 0;
  const totalSteps = 300;

  // Si ya está animando, cancelamos
  if (animating) return;
  animating = true;

  // Valores iniciales
  const initialBaseY = params.baseY;
  const initialEjeZ = params.ejeZ;
  const initialRotulaY = params.rotulaY;
  const initialRotulaZ = params.rotulaZ;
  const initialManoZ = params.manoZ;
  const initialPinzaOpen = params.pinzaOpen;

  // Función de animación
  function animate() {
    // Si completamos la animación, detenemos y volvemos a la posición original
    if (animationStep >= totalSteps) {
      // Restauramos los valores iniciales
      params.baseY = initialBaseY;
      params.ejeZ = initialEjeZ;
      params.rotulaY = initialRotulaY;
      params.rotulaZ = initialRotulaZ;
      params.manoZ = initialManoZ;
      params.pinzaOpen = initialPinzaOpen;
      
      animating = false;
      animationStep = 0;
      return;
    }

    // Incrementamos paso
    animationStep++;
    
    // Calculamos el progreso (0 a 1)
    const progress = animationStep / totalSteps;
    
    // Animamos cada parte con diferentes patrones
    params.baseY = initialBaseY + Math.sin(progress * Math.PI * 2) * 180;
    params.ejeZ = initialEjeZ + Math.sin(progress * Math.PI * 4) * 30;
    params.rotulaY = initialRotulaY + Math.sin(progress * Math.PI * 3) * 90;
    params.rotulaZ = initialRotulaZ + Math.cos(progress * Math.PI * 3) * 60;
    params.manoZ = initialManoZ + Math.sin(progress * Math.PI * 6) * 120;
    params.pinzaOpen = Math.abs(Math.sin(progress * Math.PI * 8)) * 1.5;
    
    // Continuamos la animación
    requestAnimationFrame(animate);
  }

  // Iniciamos la animación
  animate();
}

function update()
{
  // Actualiza camara
  cameraControls.update();

  var v = params.speed;

  var forward = keymap['arrowup'] || keymap['w'];
  var backward = keymap['arrowdown'] || keymap['s'];
  var left = keymap['arrowleft'] || keymap['a'];
  var right = keymap['arrowright'] || keymap['d'];

  // Movimiento independiente de la orientación de la base (movimiento global)
  if (forward) {
    robot.position.z -= v;
  }
  if (backward) {
    robot.position.z += v;
  }
  if (left) {
    robot.position.x -= v;
  }
  if (right) {
    robot.position.x += v;
  }

  base.rotation.y = degToRad(params.baseY);

  eje.rotation.z = degToRad(params.ejeZ);

  rotula.rotation.y = degToRad(params.rotulaY);
  rotula.rotation.z = degToRad(params.rotulaZ);

  antebrazo.rotation.y = degToRad(params.rotulaY);
  antebrazo.rotation.z = degToRad(params.rotulaZ);

  mano.rotation.z = degToRad(params.manoZ);

  var open = params.pinzaOpen;
  pinzaIzq.position.z = - open * 0.5;
  pinzaDer.position.z = open * 0.5;
}

function render()
{
    requestAnimationFrame( render );
    update();
    renderer.render( scene, camera );
}
