const STORAGE_KEY = "college-memory-demo-v1";

const yearLabels = {
  freshman: "大一",
  sophomore: "大二",
  junior: "大三",
  senior: "大四",
};

const yearIntros = {
  freshman: "刚抵达校园，一切都新得发亮。",
  sophomore: "熟悉了路线，也开始有了自己的节奏。",
  junior: "课程、项目、朋友和远行，把生活塞得很满。",
  senior: "一些告别慢慢靠近，于是普通日子也开始发光。",
};

const monthOrder = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

const samplePalette = [
  ["#ffd400", "#ff3d86", "#111111"],
  ["#00c86b", "#fff9df", "#111111"],
  ["#2f80ed", "#ffd400", "#111111"],
  ["#ff8a2a", "#fff9df", "#111111"],
  ["#111111", "#ffd400", "#ff3d86"],
  ["#fff9df", "#2f80ed", "#111111"],
];

const sampleTitles = [
  ["freshman", 9, "第一次走进校门", "2022-09-03", "南门广场", ["开学", "校园", "新鲜"]],
  ["freshman", 9, "宿舍夜聊到很晚", "2022-09-18", "宿舍楼", ["宿舍", "朋友", "夜晚"]],
  ["freshman", 10, "军训后的冰汽水", "2022-10-02", "操场", ["操场", "夏天", "朋友"]],
  ["freshman", 11, "图书馆靠窗的位置", "2022-11-16", "图书馆", ["学习", "安静", "窗边"]],
  ["freshman", 12, "冬天的第一杯热奶茶", "2022-12-04", "商业街", ["冬天", "奶茶", "日常"]],
  ["freshman", 3, "社团第一次上台", "2023-03-21", "活动中心", ["社团", "紧张", "舞台"]],
  ["freshman", 5, "操场边的晚霞", "2023-05-12", "东操场", ["晚霞", "操场", "散步"]],
  ["sophomore", 9, "新学期的第一张合照", "2023-09-07", "教学楼前", ["合照", "朋友", "开学"]],
  ["sophomore", 10, "凌晨赶完的小组作业", "2023-10-18", "自习室", ["作业", "小组", "凌晨"]],
  ["sophomore", 11, "秋游路上的风", "2023-11-04", "近郊公园", ["秋天", "旅行", "朋友"]],
  ["sophomore", 12, "期末周的便利贴", "2023-12-20", "图书馆", ["期末", "学习", "便利贴"]],
  ["sophomore", 4, "一场突然的大雨", "2024-04-09", "教学楼连廊", ["下雨", "偶遇", "校园"]],
  ["sophomore", 6, "考试结束后的夜宵", "2024-06-25", "校外小店", ["夜宵", "放松", "夏天"]],
  ["junior", 9, "项目启动会", "2024-09-11", "实验室", ["项目", "实验室", "认真"]],
  ["junior", 10, "城市边缘的展览", "2024-10-26", "美术馆", ["展览", "周末", "城市"]],
  ["junior", 12, "跨年前的倒数", "2024-12-31", "宿舍楼下", ["跨年", "朋友", "夜晚"]],
  ["junior", 3, "春天重新开始", "2025-03-08", "湖边", ["春天", "湖边", "散步"]],
  ["junior", 5, "答辩前的小练习", "2025-05-17", "教学楼", ["汇报", "紧张", "成长"]],
  ["junior", 7, "暑假前的车票", "2025-07-02", "车站", ["暑假", "离校", "车票"]],
  ["senior", 9, "最后一次开学", "2025-09-01", "校门口", ["大四", "开学", "告别"]],
  ["senior", 10, "毕业照试拍", "2025-10-19", "主楼前", ["毕业照", "朋友", "阳光"]],
  ["senior", 11, "简历改到深夜", "2025-11-13", "宿舍", ["求职", "深夜", "成长"]],
  ["senior", 12, "冬天里的拥抱", "2025-12-22", "食堂门口", ["冬天", "朋友", "温暖"]],
  ["senior", 3, "论文文件夹", "2026-03-15", "图书馆", ["论文", "学习", "大四"]],
  ["senior", 5, "毕业前的草坪", "2026-05-08", "中心草坪", ["毕业", "草坪", "合照"]],
];

const homeView = document.querySelector("#homeView");
const pageView = document.querySelector("#pageView");
const sphereStage = document.querySelector("#sphereStage");
const enterButton = document.querySelector("#enterButton");
const detailModal = document.querySelector("#detailModal");
const detailCard = detailModal.querySelector(".detail-card");
const addModal = document.querySelector("#addModal");
const addForm = document.querySelector("#addForm");
const photoMonthSelect = document.querySelector("#photoMonth");
const photoFormKicker = document.querySelector("#photoFormKicker");
const photoFormTitle = document.querySelector("#photoFormTitle");
const photoSubmitButton = document.querySelector("#photoSubmitButton");
const selectedTagList = document.querySelector("#selectedTagList");
const tagPickList = document.querySelector("#tagPickList");
const tagManageList = document.querySelector("#tagManageList");
const newTagInput = document.querySelector("#newTagInput");
const addTagButton = document.querySelector("#addTagButton");
const deleteModal = document.querySelector("#deleteModal");
const deleteMessage = document.querySelector("#deleteMessage");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const imageViewer = document.querySelector("#imageViewer");
const viewerImage = document.querySelector("#viewerImage");

let memories = loadMemories();
let currentScreen = { type: "home" };
let activeFilter = "全部";
let lastDetailSource = null;
let detailOpen = false;
let pendingDeleteId = null;
let editingMemoryId = null;
let pendingTagDelete = null;
let selectedFormTags = new Set();
let viewerScale = 1;

const sphere = {
  scene: null,
  camera: null,
  renderer: null,
  group: null,
  raycaster: null,
  pointer: null,
  clock: null,
  items: [],
  hovered: null,
  exploding: false,
  explodeStart: 0,
  rotationSpeed: (Math.PI * 2) / 24,
  velocityX: 0,
  velocityY: 0,
  dragging: false,
  exploded: false,
  moved: false,
  lastX: 0,
  lastY: 0,
  frameId: 0,
  resizeObserver: null,
};

function makeSampleImage(title, index) {
  const colors = samplePalette[index % samplePalette.length];
  const safeTitle = escapeHtml(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${colors[0]}"/>
          <stop offset="0.54" stop-color="${colors[1]}"/>
          <stop offset="1" stop-color="${colors[2]}"/>
        </linearGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.16"/>
          </feComponentTransfer>
          <feBlend mode="multiply" in2="SourceGraphic"/>
        </filter>
      </defs>
      <rect width="640" height="480" fill="url(#g)"/>
      <circle cx="${130 + (index % 5) * 78}" cy="${92 + (index % 4) * 56}" r="${82 + (index % 3) * 28}" fill="#fff9df" opacity="0.22"/>
      <rect x="${60 + (index % 4) * 42}" y="${245 - (index % 3) * 30}" width="380" height="110" fill="#fff9df" opacity="0.2" transform="rotate(${index % 2 ? 4 : -5} 260 300)"/>
      <path d="M0 390 C160 310 250 430 390 350 C510 280 580 330 640 285 L640 480 L0 480 Z" fill="#111111" opacity="0.2"/>
      <rect width="640" height="480" filter="url(#grain)" opacity="0.5"/>
      <text x="42" y="74" font-size="34" font-weight="900" fill="#111111" font-family="Microsoft YaHei, Arial">${safeTitle}</text>
      <text x="44" y="420" font-size="22" font-weight="900" fill="#fff9df" font-family="Microsoft YaHei, Arial">DEMO PHOTO ${String(index + 1).padStart(2, "0")}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildSamples() {
  return sampleTitles.map((item, index) => {
    const [year, month, title, date, place, tags] = item;
    return {
      id: `sample-${index + 1}`,
      year,
      month,
      title,
      date,
      place,
      feeling: makeFeeling(title, year, month),
      tags,
      image: makeSampleImage(title, index),
      source: "sample",
    };
  });
}

function makeFeeling(title, year, month) {
  const lines = [
    `这张照片叫《${title}》，它像一个被按下暂停键的普通下午。`,
    `那时候我还不知道，${yearLabels[year]}的${month}月会在很久以后变成一枚清楚的坐标。`,
    "现在再看，里面不只是照片，还有风、声音、朋友的笑和当时笨拙但真实的自己。",
  ];
  return lines.join("");
}

function loadMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (error) {
    console.warn("无法读取本地记忆数据", error);
  }
  return buildSamples();
}

function saveMemories() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (error) {
    console.warn("无法保存到本地，图片可能过大", error);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMonth(month) {
  return `${month}月`;
}

function getActiveMemories() {
  return memories.filter((memory) => !memory.deletedAt);
}

function getTrashedMemories() {
  return memories.filter((memory) => memory.deletedAt);
}

function getMonthMemories(year, month) {
  return getActiveMemories().filter((memory) => memory.year === year && Number(memory.month) === Number(month));
}

function getTagsFor(list) {
  const tags = new Set();
  list.forEach((memory) => memory.tags.forEach((tag) => tags.add(tag)));
  return ["全部", ...Array.from(tags)];
}

function getAllTags() {
  const tags = new Set();
  memories.forEach((memory) => {
    (memory.tags || []).forEach((tag) => {
      if (tag) tags.add(tag);
    });
  });
  return Array.from(tags).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderTagPills(tags) {
  return `
    <div class="tag-row">
      ${tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderSphereCard(memory, index) {
  const tilt = (index % 5) - 2;
  return `
    <button class="memory-tile" type="button" style="--tilt:${tilt}deg" aria-label="查看${escapeHtml(memory.title)}">
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" draggable="false" />
      <span class="tile-title">${escapeHtml(memory.title)}</span>
      <span class="tile-meta">${yearLabels[memory.year]} · ${formatMonth(memory.month)}</span>
    </button>
  `;
}

function renderMemoryCard(memory, index) {
  const tilt = ((index % 7) - 3) * 0.45;
  return `
    <article class="memory-card" data-memory-id="${memory.id}" style="--tilt:${tilt}deg" tabindex="0" role="button" aria-label="查看${escapeHtml(memory.title)}">
      <button class="delete-memory-button" type="button" data-action="delete" data-memory-id="${memory.id}" aria-label="删除${escapeHtml(memory.title)}" title="移到回收箱">×</button>
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" draggable="false" />
      <span class="card-body">
        <h3>${escapeHtml(memory.title)}</h3>
        <p class="card-meta">${escapeHtml(memory.date || "未填写日期")} · ${escapeHtml(memory.place || "未填写地点")}</p>
        <details class="card-feeling-panel">
          <summary>我的感想</summary>
          <p>${escapeHtml(memory.feeling || "还没有写下感想。")}</p>
        </details>
        ${renderTagPills(memory.tags)}
      </span>
    </article>
  `;
}

function renderTrashCard(memory, index) {
  const tilt = ((index % 5) - 2) * 0.45;
  return `
    <article class="memory-card trash-card" data-memory-id="${memory.id}" style="--tilt:${tilt}deg">
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" draggable="false" />
      <span class="card-body">
        <h3>${escapeHtml(memory.title)}</h3>
        <p class="card-meta">已放入回收箱 · ${escapeHtml(memory.deletedAt || "")}</p>
        <div class="trash-actions">
          <button class="small-button" type="button" data-action="restore" data-memory-id="${memory.id}">恢复</button>
          <button class="small-button danger-button" type="button" data-action="purge" data-memory-id="${memory.id}">彻底删除</button>
        </div>
      </span>
    </article>
  `;
}

function renderPurePhoto(memory, index) {
  return `
    <button class="pure-photo-tile" type="button" data-memory-id="${memory.id}" aria-label="查看${escapeHtml(memory.title)}" style="--delay:${index % 12}">
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" draggable="false" />
    </button>
  `;
}

function initSphere() {
  cancelAnimationFrame(sphere.frameId);
  sphere.exploded = false;
  sphere.exploding = false;
  sphere.hovered = null;

  if (!window.THREE) {
    initFallbackSphere();
    return;
  }

  if (!sphere.renderer) setupThreeSphere();
  rebuildSphereMeshes();
  resizeSphere();
  renderSphere();
}

function setupThreeSphere() {
  sphere.scene = new THREE.Scene();
  sphere.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  sphere.camera.position.set(0, 0, 8.8);
  sphere.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  sphere.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  sphere.renderer.setClearColor(0x000000, 0);
  sphereStage.appendChild(sphere.renderer.domElement);

  sphere.group = new THREE.Group();
  sphere.group.rotation.set(-0.08, 0.16, 0.02);
  sphere.group.position.y = -0.32;
  sphere.scene.add(sphere.group);
  sphere.raycaster = new THREE.Raycaster();
  sphere.pointer = new THREE.Vector2(-10, -10);
  sphere.clock = new THREE.Clock();
  sphere.resizeObserver = new ResizeObserver(resizeSphere);
  sphere.resizeObserver.observe(sphereStage);

  const ambient = new THREE.AmbientLight(0xffffff, 0.82);
  sphere.scene.add(ambient);
}

function rebuildSphereMeshes() {
  while (sphere.group.children.length) {
    const child = sphere.group.children.pop();
    child.geometry?.dispose();
    child.material?.map?.dispose();
    child.material?.dispose();
  }

  const sphereMemories = getActiveMemories();
  const targetCount = sphereMemories.length;
  const points = fibonacciPoints(targetCount);
  sphere.items = points.map((point, index) => {
    const memory = sphereMemories[index];
    const texture = makeCardTexture(memory, index);
    const size = getSphereTileSize(targetCount);
    const geometry = new THREE.PlaneGeometry(size.width, size.height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const position = new THREE.Vector3(point.x, point.y, point.z).multiplyScalar(2.18);
    mesh.position.copy(position);
    mesh.lookAt(0, 0, 0);
    mesh.userData = {
      memory,
      basePosition: position.clone(),
      index,
      explodeVector: new THREE.Vector3(),
      explodeSpin: new THREE.Vector3(),
    };
    sphere.group.add(mesh);
    return mesh;
  });
}

function getSphereTileSize(count) {
  if (count <= 1) return { width: 1.18, height: 1.48 };
  if (count <= 6) return { width: 0.82, height: 1.04 };
  if (count <= 14) return { width: 0.58, height: 0.72 };
  if (count <= 32) return { width: 0.43, height: 0.54 };
  if (count <= 80) return { width: 0.34, height: 0.42 };
  return { width: 0.28, height: 0.35 };
}

function fibonacciPoints(count) {
  if (count === 1) return [{ x: 0, y: 0, z: 1 }];
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return points;
}

function makeCardTexture(memory, index) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 394;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  drawCardTexture(context, memory, index);
  const image = new Image();
  image.onload = () => {
    drawCardTexture(context, memory, index, image);
    texture.needsUpdate = true;
  };
  image.src = memory.image;
  return texture;
}

function drawCardTexture(context, memory, index, image = null) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  context.clearRect(0, 0, width, height);
  if (image) {
    const ratio = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    const gradient = context.createLinearGradient(0, 0, width, height);
    const palette = samplePalette[index % samplePalette.length];
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.58, palette[1]);
    gradient.addColorStop(1, palette[2]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function resizeSphere() {
  if (!sphere.renderer || !sphere.camera) return;
  const rect = sphereStage.getBoundingClientRect();
  sphere.renderer.setSize(rect.width, rect.height, false);
  sphere.camera.aspect = rect.width / Math.max(rect.height, 1);
  sphere.camera.updateProjectionMatrix();
}

function renderSphere() {
  if (!sphere.renderer || sphere.exploded) return;
  const delta = Math.min(sphere.clock.getDelta(), 0.04);

  if (!sphere.dragging && !detailOpen && !sphere.exploding) {
    const speed = sphere.hovered ? sphere.rotationSpeed * 0.22 : sphere.rotationSpeed;
    sphere.group.rotation.y -= delta * speed;
    sphere.group.rotation.x += sphere.velocityX;
    sphere.group.rotation.y += sphere.velocityY;
    sphere.velocityX *= 0.92;
    sphere.velocityY *= 0.92;
  }

  updateRaycastHover();
  updateSphereMeshes();
  sphere.renderer.render(sphere.scene, sphere.camera);
  sphere.frameId = requestAnimationFrame(renderSphere);
}

function updateSphereMeshes() {
  const worldPosition = new THREE.Vector3();

  sphere.items.forEach((mesh) => {
    mesh.getWorldPosition(worldPosition);
    mesh.visible = true;

    const depth = Math.max(0, Math.min(1, (worldPosition.z + 2.18) / 4.36));
    const hoverBoost = mesh === sphere.hovered ? 1.34 : 1;
    const edgeDim = 0.32 + depth * 0.68;
    mesh.scale.setScalar((0.76 + depth * 0.34) * hoverBoost);
    mesh.material.opacity = sphere.exploding ? mesh.material.opacity : 0.24 + depth * 0.72;
    mesh.material.color.setRGB(edgeDim, edgeDim, edgeDim);
    mesh.renderOrder = Math.round(depth * 1000) + (mesh === sphere.hovered ? 1000 : 0);
  });
}

function updateRaycastHover() {
  if (sphere.dragging || detailOpen || sphere.exploding) return;
  sphere.raycaster.setFromCamera(sphere.pointer, sphere.camera);
  const hits = sphere.raycaster.intersectObjects(sphere.items.filter((mesh) => mesh.visible), false);
  sphere.hovered = hits[0]?.object || null;
  sphereStage.style.cursor = sphere.hovered ? "pointer" : "grab";
}

function projectMeshToScreen(mesh) {
  const rect = sphereStage.getBoundingClientRect();
  const vector = new THREE.Vector3();
  mesh.getWorldPosition(vector);
  vector.project(sphere.camera);
  return {
    x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top,
  };
}

function getSphereScreenCenter() {
  const rect = sphereStage.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height * 0.53,
  };
}

function onSpherePointerDown(event) {
  if (detailOpen || sphere.exploded || sphere.exploding) return;
  sphere.dragging = true;
  sphere.moved = false;
  sphere.lastX = event.clientX;
  sphere.lastY = event.clientY;
  sphere.velocityX = 0;
  sphere.velocityY = 0;
  updatePointer(event);
  sphereStage.setPointerCapture(event.pointerId);
}

function onSpherePointerMove(event) {
  updatePointer(event);
  if (!sphere.dragging || !sphere.group) return;
  const dx = event.clientX - sphere.lastX;
  const dy = event.clientY - sphere.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 4) sphere.moved = true;
  sphere.group.rotation.y += dx * 0.006;
  sphere.group.rotation.x += dy * 0.0048;
  sphere.velocityY = dx * 0.0008;
  sphere.velocityX = dy * 0.0006;
  sphere.lastX = event.clientX;
  sphere.lastY = event.clientY;
}

function onSpherePointerUp(event) {
  if (!sphere.dragging) return;
  sphere.dragging = false;
  try {
    sphereStage.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.warn("释放拖拽失败", error);
  }
  if (!sphere.moved && sphere.hovered) {
    openDetail(sphere.hovered.userData.memory, makeSphereDetailMarker(sphere.hovered));
  }
  window.setTimeout(() => {
    sphere.moved = false;
  }, 80);
}

function onSpherePointerLeave() {
  if (!sphere.pointer) return;
  sphere.pointer.set(-10, -10);
  sphere.hovered = null;
}

function updatePointer(event) {
  if (!sphere.pointer) return;
  const rect = sphereStage.getBoundingClientRect();
  sphere.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  sphere.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function makeSphereDetailMarker(mesh) {
  const screen = projectMeshToScreen(mesh);
  const marker = document.createElement("span");
  marker.className = "detail-source-marker";
  marker.style.left = `${screen.x - 42}px`;
  marker.style.top = `${screen.y - 54}px`;
  marker.style.width = "84px";
  marker.style.height = "108px";
  document.body.appendChild(marker);
  return marker;
}

function explodeToMain() {
  if (sphere.exploded || sphere.exploding) return;
  sphere.exploded = true;

  if (!sphere.renderer) {
    homeView.classList.add("home-exiting");
    window.setTimeout(showMainAfterExplosion, 1280);
    return;
  }

  sphere.exploding = true;
  sphere.explodeStart = performance.now();
  prepareExplosionVectors();
  homeView.classList.add("home-exiting");
  animateExplosion();
}

function prepareExplosionVectors() {
  sphere.group.updateMatrixWorld(true);
  sphere.items.forEach((mesh, index) => {
    const radial = mesh.userData.basePosition.clone().normalize();
    if (!Number.isFinite(radial.x)) radial.set(0, 0, 1);
    const jitter = seededUnit(index);
    mesh.userData.explodeVector.copy(radial);
    mesh.userData.explodeDistance = 3.8 + jitter.z * 0.7;
    mesh.userData.explodeSpin.set(0.45 + Math.abs(jitter.y) * 1.1, 0.45 + Math.abs(jitter.z) * 1.1, 0.6 + Math.abs(jitter.x) * 1.4);
  });
}

function seededUnit(index) {
  const a = Math.sin(index * 12.9898) * 43758.5453;
  const b = Math.sin(index * 78.233) * 19341.1123;
  const c = Math.sin(index * 39.425) * 12799.6671;
  return {
    x: (a - Math.floor(a)) * 2 - 1,
    y: (b - Math.floor(b)) * 2 - 1,
    z: c - Math.floor(c),
  };
}

function animateExplosion(now = performance.now()) {
  const phase = Math.min((now - sphere.explodeStart) / 1250, 1);
  sphere.items.forEach((mesh) => {
    const vector = mesh.userData.explodeVector;
    const spin = mesh.userData.explodeSpin;
    mesh.position.copy(mesh.userData.basePosition).addScaledVector(vector, phase * mesh.userData.explodeDistance);
    mesh.rotation.x += spin.x * 0.014;
    mesh.rotation.y += spin.y * 0.014;
    mesh.rotation.z += spin.z * 0.014;
    mesh.material.opacity = 1 - phase;
    mesh.visible = true;
  });
  sphere.renderer.render(sphere.scene, sphere.camera);

  if (phase < 1) {
    requestAnimationFrame(animateExplosion);
  } else {
    showMainAfterExplosion();
  }
}

function showMainAfterExplosion() {
  cancelAnimationFrame(sphere.frameId);
  homeView.classList.add("home-hidden");
  showMain();
  window.setTimeout(() => {
    homeView.classList.remove("home-exiting", "home-hidden");
  }, 120);
}

function initFallbackSphere() {
  sphereStage.innerHTML = "";
  const fallback = document.createElement("div");
  fallback.className = "fallback-sphere";
  const list = memories.slice(0, 48);
  list.forEach((memory, index) => {
    const item = document.createElement("button");
    item.className = "memory-tile";
    item.type = "button";
    item.style.setProperty("--tilt", `${(index % 5) - 2}deg`);
    item.innerHTML = `<img src="${memory.image}" alt="${escapeHtml(memory.title)}" /><span class="tile-title">${escapeHtml(memory.title)}</span>`;
    item.addEventListener("click", () => openDetail(memory, item));
    fallback.appendChild(item);
  });
  sphereStage.appendChild(fallback);
}

function setView(view) {
  const isHome = view === "home";
  homeView.classList.toggle("is-active", isHome);
  pageView.classList.toggle("is-active", !isHome);
}

function showHome() {
  currentScreen = { type: "home" };
  homeView.classList.remove("home-exiting", "home-hidden");
  setView("home");
  sphere.exploded = false;
  initSphere();
}

function showMain() {
  currentScreen = { type: "main" };
  setView("page");
  const activeCount = getActiveMemories().length;
  const trashCount = getTrashedMemories().length;
  pageView.innerHTML = `
    <div class="page-inner">
      <section class="hero-panel">
        <div class="top-badge">已收录 ${activeCount} 段大学记忆</div>
        <h1>大学四年生活纪念场</h1>
        <p class="hero-copy">
          把合照、晚风、作业、旅行和告别，全部收进这座明亮的记忆发射场。
        </p>
        <div class="sub-actions">
          <button class="plain-button" type="button" data-action="home">返回首页</button>
          <button class="plain-button" type="button" data-action="trash">回收箱 ${trashCount}</button>
        </div>
      </section>
      <section class="year-grid" aria-label="年级入口">
        ${renderYearButton("freshman", "刚认识世界，也刚认识自己", "nav-freshman")}
        ${renderYearButton("sophomore", "熟门熟路地制造很多日常", "nav-sophomore")}
        ${renderYearButton("junior", "项目、远行和成长挤在一起", "nav-junior")}
        ${renderYearButton("senior", "离开之前，把校园再看一遍", "nav-senior")}
        <button class="nav-card nav-random" type="button" data-action="random">
          <strong>随机记忆抽取</strong>
          <span>让今天自己遇见一张过去的照片</span>
        </button>
        <button class="nav-card nav-pure" type="button" data-action="pure">
          <strong>照片纯享</strong>
          <span>把所有照片排成一面干净的墙</span>
        </button>
      </section>
    </div>
  `;
}

function renderYearButton(year, subtitle, className) {
  const count = getActiveMemories().filter((memory) => memory.year === year).length;
  return `
    <button class="nav-card ${className}" type="button" data-action="year" data-year="${year}">
      <strong>${yearLabels[year]}</strong>
      <span>${subtitle} · ${count}张</span>
    </button>
  `;
}

function showYear(year) {
  currentScreen = { type: "year", year };
  setView("page");
  const months = monthOrder
    .map((month, index) => {
      const list = getMonthMemories(year, month);
      const firstTag = list[0]?.tags?.[0] || "等待新记忆";
      return `
        <button class="month-card ${list.length ? "has-items" : ""}" type="button" data-action="month" data-year="${year}" data-month="${month}" style="--tilt:${((index % 5) - 2) * 0.7}deg">
          <span class="month-number">${month}</span>
          <span class="month-count">${list.length} 张照片</span>
          <span class="month-note">${escapeHtml(firstTag)}</span>
        </button>
      `;
    })
    .join("");

  pageView.innerHTML = `
    <div class="page-inner">
      <section class="page-heading">
        <div class="top-badge">${yearLabels[year]}记忆档案</div>
        <h1>${yearLabels[year]}的十二个月</h1>
        <p class="page-copy">${yearIntros[year]} 月份按大学学年排列，从9月开始，到第二年8月结束。</p>
        <div class="heading-actions">
          <button class="plain-button" type="button" data-action="main">返回上一级</button>
        </div>
      </section>
      <section class="month-grid" aria-label="${yearLabels[year]}月份列表">
        ${months}
      </section>
    </div>
  `;
}

function showMonth(year, month, filter = "全部") {
  currentScreen = { type: "month", year, month };
  activeFilter = filter;
  setView("page");

  const all = getMonthMemories(year, month);
  const tags = getTagsFor(all);
  if (!tags.includes(activeFilter)) activeFilter = "全部";
  const visible = activeFilter === "全部" ? all : all.filter((memory) => memory.tags.includes(activeFilter));
  const cards = visible.map((memory, index) => renderMemoryCard(memory, index)).join("");

  pageView.innerHTML = `
    <div class="page-inner">
      <section class="page-heading">
        <div class="top-badge">${yearLabels[year]} · ${formatMonth(month)}</div>
        <h1>${formatMonth(month)}记忆盒</h1>
        <p class="page-copy">这里陈列这个月份的照片模块。照片多的时候，可以先按 tag 快速筛选。</p>
        <div class="heading-actions">
          <button class="plain-button" type="button" data-action="year" data-year="${year}">返回上一级</button>
        </div>
      </section>
      <nav class="month-toolbar" aria-label="Tag筛选">
        ${tags
          .map(
            (tag) => `
              <button class="chip-button ${tag === activeFilter ? "is-active" : ""}" type="button" data-action="filter" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
              </button>
            `,
          )
          .join("")}
      </nav>
      ${
        visible.length
          ? `<section class="photo-grid" aria-label="照片模块列表">${cards}</section>`
          : `<section class="empty-state"><h2>这个筛选下还没有照片</h2><p>可以点右下角的加号，把新的记忆放进这个月份。</p></section>`
      }
      <button class="fab-add" type="button" data-action="add" aria-label="新增照片模块" title="新增照片模块">+</button>
    </div>
  `;
}

function showTrash() {
  currentScreen = { type: "trash" };
  setView("page");
  const trashed = getTrashedMemories();
  const cards = trashed.map((memory, index) => renderTrashCard(memory, index)).join("");

  pageView.innerHTML = `
    <div class="page-inner">
      <section class="page-heading">
        <div class="top-badge">回收箱 · ${trashed.length} 张</div>
        <h1>暂存的记忆</h1>
        <p class="page-copy">删除后的照片会先放在这里。恢复后，它会回到原来的年级和月份。</p>
        <div class="heading-actions">
          <button class="plain-button" type="button" data-action="main">返回上一级</button>
        </div>
      </section>
      ${
        trashed.length
          ? `<section class="photo-grid" aria-label="回收箱照片列表">${cards}</section>`
          : `<section class="empty-state"><h2>回收箱是空的</h2><p>还没有被删除的照片。</p></section>`
      }
    </div>
  `;
}

function showPurePhotos() {
  currentScreen = { type: "pure" };
  setView("page");
  const active = getActiveMemories();
  const tiles = active.map((memory, index) => renderPurePhoto(memory, index)).join("");

  pageView.innerHTML = `
    <div class="page-inner">
      <section class="page-heading pure-heading">
        <div class="top-badge">照片纯享 · ${active.length} 张</div>
        <h1>Photo Wall</h1>
        <div class="heading-actions">
          <button class="plain-button" type="button" data-action="main">返回上一级</button>
        </div>
      </section>
      ${
        active.length
          ? `<section class="pure-photo-grid" aria-label="照片纯享墙">${tiles}</section>`
          : `<section class="empty-state"><h2>还没有照片</h2><p>可以先进某个月份，点右下角加号新增。</p></section>`
      }
    </div>
  `;
}

function openDetail(memory, sourceElement = null) {
  lastDetailSource = sourceElement;
  detailOpen = true;
  detailCard.innerHTML = `
    <div class="detail-media">
      <button class="detail-image-button" type="button" data-view-image="${memory.id}" aria-label="全屏查看${escapeHtml(memory.title)}">
        <img src="${memory.image}" alt="${escapeHtml(memory.title)}" />
      </button>
    </div>
    <div class="detail-content">
      <h2>${escapeHtml(memory.title)}</h2>
      <p class="detail-meta">
        ${yearLabels[memory.year]} · ${formatMonth(memory.month)}<br />
        ${escapeHtml(memory.date || "未填写日期")} · ${escapeHtml(memory.place || "未填写地点")}
      </p>
      ${renderTagPills(memory.tags)}
      <p class="detail-feeling">${escapeHtml(memory.feeling || "还没有写下感想。")}</p>
      <div class="detail-actions">
        <button class="small-button detail-edit-button" type="button" data-detail-action="edit" data-memory-id="${memory.id}">编辑</button>
      </div>
      <p class="detail-hint">点击暗色区域回到原来的位置</p>
    </div>
  `;

  detailModal.classList.add("is-active");
  detailModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!sourceElement) {
    detailCard.animate(
      [
        { transform: "translateY(28px) scale(0.94)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 300, easing: "cubic-bezier(.18,.8,.24,1)", fill: "both" },
    );
    return;
  }

  requestAnimationFrame(() => {
    const from = sourceElement.getBoundingClientRect();
    const to = detailCard.getBoundingClientRect();
    detailCard.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          opacity: 0.92,
        },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 360, easing: "cubic-bezier(.18,.8,.24,1)", fill: "both" },
    );
  });
}

function closeDetail() {
  if (!detailOpen) return;

  const finish = () => {
    detailOpen = false;
    detailModal.classList.remove("is-active");
    detailModal.setAttribute("aria-hidden", "true");
    if (!addModal.classList.contains("is-active") && !deleteModal.classList.contains("is-active") && !imageViewer.classList.contains("is-active")) {
      document.body.style.overflow = "";
    }
    detailCard.innerHTML = "";
    detailCard.style.transformOrigin = "";
    if (lastDetailSource?.classList?.contains("detail-source-marker")) {
      lastDetailSource.remove();
    }
    lastDetailSource = null;
  };

  if (!lastDetailSource || !document.body.contains(lastDetailSource)) {
    const animation = detailCard.animate(
      [
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { transform: "translateY(18px) scale(0.96)", opacity: 0 },
      ],
      { duration: 220, easing: "ease", fill: "forwards" },
    );
    animation.onfinish = finish;
    return;
  }

  const from = detailCard.getBoundingClientRect();
  const to = lastDetailSource.getBoundingClientRect();
  detailCard.style.transformOrigin = "top left";
  const animation = detailCard.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`,
        opacity: 0.18,
      },
    ],
    { duration: 360, easing: "cubic-bezier(.22,.9,.22,1)", fill: "forwards" },
  );
  animation.onfinish = finish;
}

function openAddModal(memoryId = null) {
  editingMemoryId = memoryId;
  const editing = memoryId ? memories.find((memory) => memory.id === memoryId) : null;
  addModal.classList.add("is-active");
  addModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  addForm.reset();
  photoFormKicker.textContent = editing ? "编辑照片模块" : "新增照片模块";
  photoFormTitle.textContent = editing ? "修改这段记忆" : "把一段新记忆放进来";
  photoSubmitButton.textContent = editing ? "保存修改" : "保存记忆";
  const year = editing?.year || currentScreen.year || "freshman";
  const month = editing?.month || currentScreen.month || 9;
  addForm.photoYear.value = year;
  addForm.photoMonth.value = String(month);
  addForm.photoTitle.value = editing?.title || "";
  addForm.photoDate.value = editing?.date || "";
  addForm.photoPlace.value = editing?.place || "";
  addForm.photoFeeling.value = editing?.feeling || "";
  selectedFormTags = new Set(editing?.tags || []);
  newTagInput.value = "";
  renderTagEditor();
  addForm.photoTitle.focus();
}

function closeAddModal() {
  editingMemoryId = null;
  selectedFormTags = new Set();
  addModal.classList.remove("is-active");
  addModal.setAttribute("aria-hidden", "true");
  if (!detailOpen && !deleteModal.classList.contains("is-active") && !imageViewer.classList.contains("is-active")) {
    document.body.style.overflow = "";
  }
}

function openDeleteModal(memoryId) {
  const memory = memories.find((item) => item.id === memoryId);
  if (!memory) return;
  pendingDeleteId = memoryId;
  pendingTagDelete = null;
  deleteModal.querySelector("h2").textContent = "确定删除这张照片吗？";
  confirmDeleteButton.textContent = "移到回收箱";
  deleteMessage.textContent = `《${memory.title}》会先放进回收箱，可以稍后恢复。`;
  deleteModal.classList.add("is-active");
  deleteModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDeleteModal() {
  pendingDeleteId = null;
  pendingTagDelete = null;
  deleteModal.querySelector("h2").textContent = "确定删除这张照片吗？";
  confirmDeleteButton.textContent = "移到回收箱";
  deleteModal.classList.remove("is-active");
  deleteModal.setAttribute("aria-hidden", "true");
  if (!detailOpen && !addModal.classList.contains("is-active") && !imageViewer.classList.contains("is-active")) {
    document.body.style.overflow = "";
  }
}

function confirmDeleteMemory() {
  if (pendingTagDelete) {
    deleteTag(pendingTagDelete);
    return;
  }
  if (!pendingDeleteId) return;
  const memory = memories.find((item) => item.id === pendingDeleteId);
  if (!memory) {
    closeDeleteModal();
    return;
  }
  memory.deletedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  saveMemories();
  closeDeleteModal();
  initSphere();
  if (currentScreen.type === "month") showMonth(currentScreen.year, currentScreen.month, activeFilter);
  else showMain();
}

function restoreMemory(memoryId) {
  const memory = memories.find((item) => item.id === memoryId);
  if (!memory) return;
  delete memory.deletedAt;
  saveMemories();
  initSphere();
  showTrash();
}

function purgeMemory(memoryId) {
  memories = memories.filter((memory) => memory.id !== memoryId);
  saveMemories();
  initSphere();
  showTrash();
}

function renderTagEditor() {
  const query = newTagInput.value.trim().toLowerCase();
  const allTags = getAllTags();
  const matches = query
    ? allTags.filter((tag) => tag.toLowerCase().includes(query)).slice(0, 8)
    : [];

  selectedTagList.innerHTML = selectedFormTags.size
    ? Array.from(selectedFormTags)
        .map(
          (tag) => `
            <button class="selected-tag-chip" type="button" data-tag-action="unselect" data-tag-old="${escapeHtml(tag)}">
              ${escapeHtml(tag)} <span>×</span>
            </button>
          `,
        )
        .join("")
    : `<p class="tag-empty">还没选择 tag。</p>`;

  tagPickList.innerHTML = query
    ? matches.length
      ? matches
          .map(
            (tag) => `
              <button class="tag-suggestion ${selectedFormTags.has(tag) ? "is-selected" : ""}" type="button" data-tag-action="select" data-tag-old="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
              </button>
            `,
          )
          .join("")
      : `<p class="tag-empty">没有匹配项，点“添加”可新增。</p>`
    : `<p class="tag-empty">输入关键词搜索已有 tag。</p>`;

  tagManageList.innerHTML = matches
    .map(
      (tag) => `
        <div class="tag-manage-row">
          <input type="text" value="${escapeHtml(tag)}" data-tag-old="${escapeHtml(tag)}" aria-label="编辑 tag ${escapeHtml(tag)}" />
          <button class="small-button" type="button" data-tag-action="rename" data-tag-old="${escapeHtml(tag)}">改名</button>
          <button class="small-button danger-button" type="button" data-tag-action="delete" data-tag-old="${escapeHtml(tag)}">删除</button>
        </div>
      `,
    )
    .join("");
}

function addTagFromInput() {
  const tag = newTagInput.value.trim();
  if (!tag) return;
  selectedFormTags.add(tag);
  newTagInput.value = "";
  renderTagEditor();
}

function getSelectedFormTags() {
  return new Set(selectedFormTags);
}

function renameTag(oldTag, newTag) {
  const next = newTag.trim();
  if (!oldTag || !next || oldTag === next) return;
  memories.forEach((memory) => {
    memory.tags = (memory.tags || []).map((tag) => (tag === oldTag ? next : tag));
    memory.tags = Array.from(new Set(memory.tags));
  });
  saveMemories();
  if (selectedFormTags.has(oldTag)) {
    selectedFormTags.delete(oldTag);
    selectedFormTags.add(next);
  }
  newTagInput.value = next;
  renderTagEditor();
  refreshCurrentScreen();
}

function openDeleteTagModal(tag) {
  pendingTagDelete = tag;
  pendingDeleteId = null;
  deleteMessage.textContent = `删除 tag「${tag}」后，所有已上传照片里的这个 tag 都会被移除。`;
  deleteModal.querySelector("h2").textContent = "确定删除这个 tag 吗？";
  confirmDeleteButton.textContent = "删除 tag";
  deleteModal.classList.add("is-active");
  deleteModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function deleteTag(tag) {
  memories.forEach((memory) => {
    memory.tags = (memory.tags || []).filter((item) => item !== tag);
    if (!memory.tags.length) memory.tags = ["新记忆"];
  });
  saveMemories();
  pendingTagDelete = null;
  closeDeleteModal();
  selectedFormTags.delete(tag);
  renderTagEditor();
  refreshCurrentScreen();
}

function refreshCurrentScreen() {
  if (currentScreen.type === "month") showMonth(currentScreen.year, currentScreen.month, activeFilter);
  if (currentScreen.type === "year") showYear(currentScreen.year);
  if (currentScreen.type === "main") showMain();
  if (currentScreen.type === "pure") showPurePhotos();
}

function openImageViewer(memory) {
  if (!memory) return;
  viewerScale = 1;
  viewerImage.src = memory.image;
  viewerImage.alt = memory.title;
  viewerImage.style.transform = "scale(1)";
  imageViewer.classList.add("is-active");
  imageViewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeImageViewer() {
  imageViewer.classList.remove("is-active");
  imageViewer.setAttribute("aria-hidden", "true");
  viewerImage.removeAttribute("src");
  viewerImage.alt = "";
  if (!detailOpen && !addModal.classList.contains("is-active") && !deleteModal.classList.contains("is-active")) {
    document.body.style.overflow = "";
  }
}

function handleViewerWheel(event) {
  if (!imageViewer.classList.contains("is-active")) return;
  event.preventDefault();
  const direction = event.deltaY > 0 ? -0.12 : 0.12;
  viewerScale = Math.min(4, Math.max(0.45, viewerScale + direction));
  viewerImage.style.transform = `scale(${viewerScale})`;
}

function populateMonthSelect() {
  photoMonthSelect.innerHTML = monthOrder
    .map((month) => `<option value="${month}">${formatMonth(month)}</option>`)
    .join("");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleAddSubmit(event) {
  event.preventDefault();
  const formData = new FormData(addForm);
  const title = String(formData.get("photoTitle") || "").trim();
  if (!title) return;

  const file = formData.get("photoFile");
  const editing = editingMemoryId ? memories.find((memory) => memory.id === editingMemoryId) : null;
  const image =
    file && file.size
      ? await readFileAsDataUrl(file)
      : editing?.image || makeSampleImage(title, memories.length + 1);

  const year = String(formData.get("photoYear") || "freshman");
  const month = Number(formData.get("photoMonth") || 9);
  const tags = Array.from(getSelectedFormTags()).map((tag) => tag.trim()).filter(Boolean);

  if (editing) {
    Object.assign(editing, {
      year,
      month,
      title,
      date: String(formData.get("photoDate") || ""),
      place: String(formData.get("photoPlace") || "").trim(),
      feeling: String(formData.get("photoFeeling") || "").trim(),
      tags: tags.length ? tags : ["新记忆"],
      image,
    });
  } else {
    const memory = {
      id: `user-${Date.now()}`,
      year,
      month,
      title,
      date: String(formData.get("photoDate") || ""),
      place: String(formData.get("photoPlace") || "").trim(),
      feeling: String(formData.get("photoFeeling") || "").trim(),
      tags: tags.length ? tags : ["新记忆"],
      image,
      source: "user",
    };
    memories = [memory, ...memories];
  }

  saveMemories();
  closeAddModal();
  closeDetail();
  initSphere();
  showMonth(year, month);
}

function handlePageClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "home") showHome();
    if (action === "main") showMain();
    if (action === "pure") showPurePhotos();
    if (action === "trash") showTrash();
    if (action === "year") showYear(actionTarget.dataset.year);
    if (action === "month") showMonth(actionTarget.dataset.year, Number(actionTarget.dataset.month));
    if (action === "filter") showMonth(currentScreen.year, currentScreen.month, actionTarget.dataset.tag);
    if (action === "add") openAddModal();
    if (action === "delete") openDeleteModal(actionTarget.dataset.memoryId);
    if (action === "restore") restoreMemory(actionTarget.dataset.memoryId);
    if (action === "purge") purgeMemory(actionTarget.dataset.memoryId);
    if (action === "random") {
      const active = getActiveMemories();
      const memory = active[Math.floor(Math.random() * active.length)];
      if (memory) openDetail(memory);
    }
    return;
  }

  if (event.target.closest(".card-feeling-panel")) return;

  const card = event.target.closest(".memory-card");
  if (card) {
    const memory = memories.find((item) => item.id === card.dataset.memoryId && !item.deletedAt);
    if (memory) openDetail(memory, card);
  }

  const pureTile = event.target.closest(".pure-photo-tile");
  if (pureTile) {
    const memory = memories.find((item) => item.id === pureTile.dataset.memoryId && !item.deletedAt);
    if (memory) openDetail(memory, pureTile);
  }
}

function handleDateChange(event) {
  if (!event.target.value) return;
  const month = Number(event.target.value.slice(5, 7));
  if (monthOrder.includes(month)) {
    addForm.photoMonth.value = String(month);
  }
}

enterButton.addEventListener("click", explodeToMain);
sphereStage.addEventListener("pointerdown", onSpherePointerDown);
sphereStage.addEventListener("pointermove", onSpherePointerMove);
sphereStage.addEventListener("pointerup", onSpherePointerUp);
sphereStage.addEventListener("pointercancel", onSpherePointerUp);
sphereStage.addEventListener("pointerleave", onSpherePointerLeave);
pageView.addEventListener("click", handlePageClick);
detailModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-detail]")) closeDetail();
  const editTarget = event.target.closest("[data-detail-action='edit']");
  if (editTarget) openAddModal(editTarget.dataset.memoryId);
  const imageTarget = event.target.closest("[data-view-image]");
  if (imageTarget) {
    const memory = memories.find((item) => item.id === imageTarget.dataset.viewImage);
    openImageViewer(memory);
  }
});
addModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-add]")) closeAddModal();
  const tagTarget = event.target.closest("[data-tag-action]");
  if (tagTarget) {
    const oldTag = tagTarget.dataset.tagOld;
    if (tagTarget.dataset.tagAction === "select") {
      selectedFormTags.add(oldTag);
      renderTagEditor();
    }
    if (tagTarget.dataset.tagAction === "unselect") {
      selectedFormTags.delete(oldTag);
      renderTagEditor();
    }
    if (tagTarget.dataset.tagAction === "rename") {
      const input = tagTarget.parentElement.querySelector("input");
      renameTag(oldTag, input.value);
    }
    if (tagTarget.dataset.tagAction === "delete") openDeleteTagModal(oldTag);
  }
});
addTagButton.addEventListener("click", addTagFromInput);
newTagInput.addEventListener("input", renderTagEditor);
newTagInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTagFromInput();
  }
});
deleteModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-delete]")) closeDeleteModal();
});
confirmDeleteButton.addEventListener("click", confirmDeleteMemory);
imageViewer.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-viewer]")) closeImageViewer();
});
imageViewer.addEventListener("wheel", handleViewerWheel, { passive: false });
addForm.addEventListener("submit", handleAddSubmit);
addForm.photoDate.addEventListener("change", handleDateChange);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetail();
    closeAddModal();
    closeDeleteModal();
    closeImageViewer();
  }
});

populateMonthSelect();
initSphere();
