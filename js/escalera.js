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
  camera.position.set( 1, 1.5, 2 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}

function loadScene(){
    var floorGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
    var floorMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA });
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2);
    scene.add(floor);

    for(let i = 0; i < 5; i++){
        var stepGeometry = new THREE.BoxGeometry(1, 0.2, 0.2);
        var stepMaterial = new THREE.MeshNormalMaterial();
        var step = new THREE.Mesh(stepGeometry, stepMaterial);

        var step2 = new THREE.Mesh(stepGeometry, stepMaterial);

        step.position.set(0, i * 0.2, i * 0.2);
        step2.position.set(0, i * 0.2, i * 0.2 + 0.2);
        scene.add(step);
        scene.add(step2);
    }
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