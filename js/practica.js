var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 100 );
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}

function loadScene(){
    var floorGeometry = new THREE.PlaneGeometry(10000, 10000, 10, 10);
    var floorMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA });
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2);
    scene.add(floor);

    // Base del robot
    var baseGeometry = new THREE.CylinderGeometry(5, 5, 1.5, 32);
    var baseMaterial = new THREE.MeshNormalMaterial();
    var base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, 0.1, 0);

    // Brazo del robot
    let brazo = new THREE.Object3D();
    let esparragoColor = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    let esparrago  = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.8, 32), esparragoColor);
    esparrago.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2);
    esparrago.position.set(0, 1.5, 0);
    brazo.add(esparrago);

    let eje = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), new THREE.MeshBasicMaterial({ color: 0x0000FF }));
    eje.position.set(0, 0.1, 0);
    eje.position.y = 7;
    brazo.add(eje);

    // Bola del robot
    let rotula = new THREE.Mesh(new THREE.SphereGeometry(2, 18, 18), new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
    rotula.position.y = 12;

    // Antebrazo
    let antebrazo = new THREE.Object3D();
    let discoGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.6, 32);
    let discoMaterial = new THREE.MeshNormalMaterial();
    let disco = new THREE.Mesh(discoGeometry, discoMaterial);
    disco.position.y = 12;
    antebrazo.add(disco);

    // Los nervios del antebrazo
    for(let i = 0; i < 4; i++){
        let nervio = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000FF }));
        nervio.position.y = 15.5;
        
        let angle = i * Math.PI/2 + Math.PI/4;
        nervio.position.x = Math.cos(angle) * 1.5;
        nervio.position.z = Math.sin(angle) * 1.5;

        antebrazo.add(nervio);
    }

    // Añadimos el disco de arriba
    let disco2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 5, 32), discoMaterial);
    disco2.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI/2);
    disco2.position.y = 15.5+0.4+1.5*2;
    antebrazo.add(disco2);

    // ahora a crear las malditas pinzas

    var vertices = new Float32Array([
      // Front face vertices
      0, 0, 0, // Punto 1
      1.9, 0, 0, // Punto 2
      0, 2, 0,  // Punto 3
      1.9, 2, 0,  // Punto 4
      3.8, 0.5, -0.1, // Punto 5
      3.8, 1.5, -0.1, // Punto 6
      
      // Back face vertices
      0, 0, -0.4, // Punto 7 (back of 1)
      1.9, 0, -0.4, // Punto 8 (back of 2)
      0, 2, -0.4,  // Punto 9 (back of 3)
      1.9, 2, -0.4,  // Punto 10 (back of 4)
      3.8, 0.5, -0.3, // Punto 11 (back of 5)
      3.8, 1.5, -0.3, // Punto 12 (back of 6)
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    geometry.setIndex([
      // Front face
      0, 1, 2,  // triángulo 1
      2, 1, 3,  // triángulo 2
      1, 4, 3,  // triángulo 3
      3, 4, 5,  // triángulo 4
      
      // Back face
      6, 8, 7,  // triángulo 5 (note reverse order for correct normals)
      7, 8, 9,  // triángulo 6
      7, 9, 10, // triángulo 7
      9, 11, 10, // triángulo 8
      
      // Side faces
      0, 6, 1,  // side 1
      1, 6, 7,  // side 2
      1, 7, 4,  // side 3
      4, 7, 10, // side 4
      4, 10, 5, // side 5
      5, 10, 11, // side 6
      5, 11, 3, // side 7
      3, 11, 9, // side 8
      3, 9, 2,  // side 9
      2, 9, 8,  // side 10
      2, 8, 0,  // side 11
      0, 8, 6,  // side 12
    ]);
    // Calculate face normals for proper lighting
    geometry.computeVertexNormals();

    // Create material for the pinza
    const material = new THREE.MeshNormalMaterial();

    // Create mesh from geometry and material
    const pinzaIzq = new THREE.Mesh(geometry, material);
    pinzaIzq.position.z = -1;
    pinzaIzq.position.y = -1;

    // Create a clone for the right pinza and transform it
    const pinzaDer = pinzaIzq.clone();
    pinzaDer.scale.z = -1; // Mirror on z-axis
    pinzaDer.position.y = -1;
    pinzaDer.position.z = 1;

    // Create a mano object to group the pinzas
    const mano = new THREE.Object3D();
    mano.position.set(0, 19, 0);
    mano.add(pinzaIzq);
    mano.add(pinzaDer);

    // Add mano to antebrazo
    antebrazo.add(mano);



    scene.add(brazo);
    scene.add(base);
    scene.add(rotula);
    scene.add(antebrazo);
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
  // Cambios para actualizar la camara segun mvto del raton
  cameraControls.update();
}

function render()
{
    requestAnimationFrame( render );
    update();
    renderer.render( scene, camera );
}