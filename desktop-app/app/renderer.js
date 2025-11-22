import * as THREE from '../node_modules/three/build/three.module.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';

const canvasHost = document.getElementById('canvas-host');
const startBtn = document.getElementById('start-btn');
const uiContainer = document.getElementById('ui-container');
const controlsHint = document.getElementById('controls-hint');
const breadcrumb = document.getElementById('breadcrumb');
const backBtn = document.getElementById('back-btn');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const closeBtn = document.getElementById('close-btn');
const loadingContainer = document.getElementById('loading-container');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');

let renderer;
let camera;
let scene;
let controls;
let raycaster;
let mouse;
let animationFrame;

let currentGroup;
let activeTextures = [];
let navigationStack = [];
let albumTree = null;

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#050505');

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  canvasHost.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambient);

  const light = new THREE.PointLight(0x0080ff, 0.6);
  light.position.set(20, 20, 30);
  scene.add(light);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  if (controls) controls.update();
  renderer.render(scene, camera);
}

function fibonacciSphere(samples, radius) {
  const points = [];
  const offset = 2 / samples;
  const increment = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < samples; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;

    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;

    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }

  return points;
}

function disposeMaterial(material) {
  if (!material) return;
  if (material.map) {
    material.map.dispose();
  }
  material.dispose();
}

function cleanupLevel() {
  if (currentGroup) {
    currentGroup.traverse((child) => {
      if (child.isMesh) {
        disposeMaterial(child.material);
        if (child.geometry) child.geometry.dispose();
      }
    });
    scene.remove(currentGroup);
    currentGroup = null;
  }

  activeTextures.forEach((tex) => tex.dispose());
  activeTextures = [];
}

function updateBreadcrumb() {
  if (!navigationStack.length) {
    breadcrumb.style.opacity = '0';
    breadcrumb.textContent = '';
    backBtn.style.display = 'none';
    return;
  }

  const parts = navigationStack.map((node) => node.name);
  breadcrumb.textContent = parts.join(' / ');
  breadcrumb.style.opacity = '1';
  backBtn.style.display = navigationStack.length > 1 ? 'block' : 'none';
}

function showControlsHint() {
  controlsHint.style.opacity = '1';
  setTimeout(() => {
    controlsHint.style.opacity = '0';
  }, 4000);
}

function buildLevel(node) {
  cleanupLevel();

  const children = node.children || [];
  if (children.length === 0) {
    return;
  }

  const radius = 18;
  const positions = fibonacciSphere(children.length, radius);
  currentGroup = new THREE.Group();

  const folderGeometry = new THREE.SphereGeometry(1.3, 32, 32);
  const imageGeometry = new THREE.PlaneGeometry(3, 3);

  children.forEach((item, index) => {
    const position = positions[index];
    let mesh;

    if (item.type === 'folder') {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#00b4ff'),
        emissive: new THREE.Color('#003049'),
        roughness: 0.35,
        metalness: 0.1,
      });
      mesh = new THREE.Mesh(folderGeometry.clone(), material);
    } else {
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(item.path);
      texture.encoding = THREE.sRGBEncoding;
      activeTextures.push(texture);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      });

      mesh = new THREE.Mesh(imageGeometry.clone(), material);
    }

    mesh.position.copy(position);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    mesh.userData.item = item;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.scale.setScalar(1.1);

    currentGroup.add(mesh);
  });

  scene.add(currentGroup);
  updateBreadcrumb();
  showControlsHint();
}

function onPointerDown(event) {
  if (navigationStack.length === 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(currentGroup?.children || []);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const item = mesh.userData.item;
    if (item.type === 'folder') {
      navigationStack.push(item);
      buildLevel(item);
    } else if (item.type === 'image') {
      openModal(item.path);
    }
  }
}

function openModal(path) {
  modalImg.src = `file://${path}`;
  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
  modalImg.src = '';
}

function goBack() {
  if (navigationStack.length > 1) {
    navigationStack.pop();
    const node = navigationStack[navigationStack.length - 1];
    buildLevel(node);
  }
}

async function startAlbum() {
  const root = await window.albumApi.chooseRoot();
  if (!root) return;

  loadingContainer.style.display = 'block';
  loadingBar.style.width = '25%';
  loadingText.textContent = '正在扫描相册…';

  const tree = await window.albumApi.readTree(root);
  albumTree = tree;
  navigationStack = [albumTree];

  loadingBar.style.width = '100%';
  loadingText.textContent = '完成';

  setTimeout(() => {
    uiContainer.style.opacity = '0';
    setTimeout(() => {
      uiContainer.style.display = 'none';
    }, 400);
  }, 300);

  buildLevel(albumTree);
}

startBtn.addEventListener('click', startAlbum);
backBtn.addEventListener('click', goBack);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal.classList.contains('active')) {
      closeModal();
    }
  }
});

initThree();
