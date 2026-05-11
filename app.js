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
const sphereLayer = document.querySelector("#sphereLayer");
const enterButton = document.querySelector("#enterButton");
const detailModal = document.querySelector("#detailModal");
const detailCard = detailModal.querySelector(".detail-card");
const addModal = document.querySelector("#addModal");
const addForm = document.querySelector("#addForm");
const photoMonthSelect = document.querySelector("#photoMonth");

let memories = loadMemories();
let currentScreen = { type: "home" };
let activeFilter = "全部";
let lastDetailSource = null;
let detailOpen = false;

const sphere = {
  items: [],
  rotationX: -0.16,
  rotationY: 0.45,
  velocityX: 0,
  velocityY: 0,
  dragging: false,
  hoverPaused: false,
  exploded: false,
  moved: false,
  lastX: 0,
  lastY: 0,
  frameId: 0,
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

function getMonthMemories(year, month) {
  return memories.filter((memory) => memory.year === year && Number(memory.month) === Number(month));
}

function getTagsFor(list) {
  const tags = new Set();
  list.forEach((memory) => memory.tags.forEach((tag) => tags.add(tag)));
  return ["全部", ...Array.from(tags)];
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
    <button class="memory-card" type="button" data-memory-id="${memory.id}" style="--tilt:${tilt}deg" aria-label="查看${escapeHtml(memory.title)}">
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" draggable="false" />
      <span class="card-body">
        <h3>${escapeHtml(memory.title)}</h3>
        <p class="card-meta">${escapeHtml(memory.date || "未填写日期")} · ${escapeHtml(memory.place || "未填写地点")}</p>
        <p class="card-feeling">${escapeHtml(memory.feeling || "还没有写下感想。")}</p>
        ${renderTagPills(memory.tags)}
      </span>
    </button>
  `;
}

function initSphere() {
  cancelAnimationFrame(sphere.frameId);
  sphere.exploded = false;
  sphereLayer.innerHTML = "";
  const points = fibonacciPoints(memories.length);
  sphere.items = memories.map((memory, index) => {
    const slot = document.createElement("div");
    slot.className = "sphere-slot";
    slot.dataset.memoryId = memory.id;
    slot.innerHTML = renderSphereCard(memory, index);
    sphereLayer.appendChild(slot);

    slot.addEventListener("pointerenter", () => {
      sphere.hoverPaused = true;
      slot.classList.add("is-hovered");
    });

    slot.addEventListener("pointerleave", () => {
      sphere.hoverPaused = false;
      slot.classList.remove("is-hovered");
    });

    slot.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      if (sphere.moved) return;
      openDetail(memory, slot.querySelector(".memory-tile"));
    });

    return { memory, slot, point: points[index] };
  });
  renderSphere();
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

function rotatePoint(point, rotationX, rotationY) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);

  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return { x: x2, y: y1, z: z2 };
}

function renderSphere() {
  if (sphere.exploded) return;
  const rect = sphereStage.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) * (rect.width < 720 ? 0.3 : 0.34);

  if (!sphere.dragging && !detailOpen) {
    if (!sphere.hoverPaused) sphere.rotationY += 0.0018;
    sphere.rotationX += sphere.velocityX;
    sphere.rotationY += sphere.velocityY;
    sphere.velocityX *= 0.95;
    sphere.velocityY *= 0.95;
  }

  sphere.items.forEach(({ slot, point }) => {
    const rotated = rotatePoint(point, sphere.rotationX, sphere.rotationY);
    const depth = (rotated.z + 1) / 2;
    const scale = 0.58 + depth * 0.58;
    const x = rotated.x * radius;
    const y = rotated.y * radius;

    slot.dataset.x = String(x);
    slot.dataset.y = String(y);
    slot.dataset.scale = String(scale);
    slot.style.opacity = String(0.38 + depth * 0.62);
    slot.style.zIndex = String(Math.round(depth * 1200));
    slot.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
  });

  sphere.frameId = requestAnimationFrame(renderSphere);
}

function onSpherePointerDown(event) {
  if (detailOpen || sphere.exploded) return;
  sphere.dragging = true;
  sphere.moved = false;
  sphere.lastX = event.clientX;
  sphere.lastY = event.clientY;
  sphere.velocityX = 0;
  sphere.velocityY = 0;
  sphereStage.setPointerCapture(event.pointerId);
}

function onSpherePointerMove(event) {
  if (!sphere.dragging) return;
  const dx = event.clientX - sphere.lastX;
  const dy = event.clientY - sphere.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 4) sphere.moved = true;
  sphere.rotationY += dx * 0.006;
  sphere.rotationX -= dy * 0.005;
  sphere.velocityY = dx * 0.0009;
  sphere.velocityX = -dy * 0.00075;
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
  window.setTimeout(() => {
    sphere.moved = false;
  }, 80);
}

function explodeToMain() {
  if (sphere.exploded) return;
  sphere.exploded = true;
  homeView.classList.add("home-exiting");
  cancelAnimationFrame(sphere.frameId);

  sphere.items.forEach(({ slot }, index) => {
    const x = Number(slot.dataset.x || 0);
    const y = Number(slot.dataset.y || 0);
    const scale = Number(slot.dataset.scale || 0.8);
    const angle = (Math.PI * 2 * index) / Math.max(sphere.items.length, 1) + Math.random() * 0.8;
    const distance = Math.max(window.innerWidth, window.innerHeight) * (0.72 + Math.random() * 0.45);
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    slot.style.transition = "transform 820ms cubic-bezier(.12,.8,.18,1), opacity 620ms ease";
    slot.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
    requestAnimationFrame(() => {
      slot.style.opacity = "0";
      slot.style.transform = `translate3d(calc(-50% + ${x + tx}px), calc(-50% + ${y + ty}px), 0) rotate(${index * 17}deg) scale(0.14)`;
    });
  });

  window.setTimeout(() => {
    showMain();
    homeView.classList.remove("home-exiting");
    initSphere();
  }, 850);
}

function setView(view) {
  const isHome = view === "home";
  homeView.classList.toggle("is-active", isHome);
  pageView.classList.toggle("is-active", !isHome);
}

function showHome() {
  currentScreen = { type: "home" };
  setView("home");
  sphere.exploded = false;
  initSphere();
}

function showMain() {
  currentScreen = { type: "main" };
  setView("page");
  pageView.innerHTML = `
    <div class="page-inner">
      <section class="hero-panel">
        <div class="top-badge">已收录 ${memories.length} 段大学记忆</div>
        <h1>大学四年生活纪念场</h1>
        <p class="hero-copy">
          把合照、晚风、作业、旅行和告别，全部收进这座明亮的记忆发射场。
        </p>
        <div class="sub-actions">
          <button class="plain-button" type="button" data-action="home">返回首页</button>
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
      </section>
    </div>
  `;
}

function renderYearButton(year, subtitle, className) {
  const count = memories.filter((memory) => memory.year === year).length;
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
          <button class="solid-button" type="button" data-action="add">新增照片模块</button>
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

function openDetail(memory, sourceElement = null) {
  lastDetailSource = sourceElement;
  detailOpen = true;
  detailCard.innerHTML = `
    <div class="detail-media">
      <img src="${memory.image}" alt="${escapeHtml(memory.title)}" />
    </div>
    <div class="detail-content">
      <h2>${escapeHtml(memory.title)}</h2>
      <p class="detail-meta">
        ${yearLabels[memory.year]} · ${formatMonth(memory.month)}<br />
        ${escapeHtml(memory.date || "未填写日期")} · ${escapeHtml(memory.place || "未填写地点")}
      </p>
      ${renderTagPills(memory.tags)}
      <p class="detail-feeling">${escapeHtml(memory.feeling || "还没有写下感想。")}</p>
      <p class="detail-hint">点击暗色区域回到原来的位置</p>
    </div>
  `;

  detailModal.classList.add("is-active");
  detailModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!sourceElement) {
    detailCard.animate(
      [
        { transform: "translateY(28px) scale(0.94) rotate(-0.5deg)", opacity: 0 },
        { transform: "translateY(0) scale(1) rotate(-0.5deg)", opacity: 1 },
      ],
      { duration: 320, easing: "cubic-bezier(.18,.8,.24,1)", fill: "both" },
    );
    return;
  }

  requestAnimationFrame(() => {
    const from = sourceElement.getBoundingClientRect();
    const to = detailCard.getBoundingClientRect();
    detailCard.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height}) rotate(-0.5deg)`,
          opacity: 0.92,
        },
        { transform: "translate(0, 0) scale(1) rotate(-0.5deg)", opacity: 1 },
      ],
      { duration: 430, easing: "cubic-bezier(.12,.86,.2,1)", fill: "both" },
    );
  });
}

function closeDetail() {
  if (!detailOpen) return;

  const finish = () => {
    detailOpen = false;
    detailModal.classList.remove("is-active");
    detailModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    detailCard.innerHTML = "";
    lastDetailSource = null;
  };

  if (!lastDetailSource || !document.body.contains(lastDetailSource)) {
    const animation = detailCard.animate(
      [
        { transform: "translateY(0) scale(1) rotate(-0.5deg)", opacity: 1 },
        { transform: "translateY(18px) scale(0.96) rotate(-0.5deg)", opacity: 0 },
      ],
      { duration: 220, easing: "ease", fill: "forwards" },
    );
    animation.onfinish = finish;
    return;
  }

  const from = detailCard.getBoundingClientRect();
  const to = lastDetailSource.getBoundingClientRect();
  const animation = detailCard.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(-0.5deg)", opacity: 1 },
      {
        transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height}) rotate(-0.5deg)`,
        opacity: 0.18,
      },
    ],
    { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
  animation.onfinish = finish;
}

function openAddModal() {
  addModal.classList.add("is-active");
  addModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  addForm.reset();
  const year = currentScreen.year || "freshman";
  const month = currentScreen.month || 9;
  addForm.photoYear.value = year;
  addForm.photoMonth.value = String(month);
  addForm.photoTitle.focus();
}

function closeAddModal() {
  addModal.classList.remove("is-active");
  addModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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
  const image =
    file && file.size
      ? await readFileAsDataUrl(file)
      : makeSampleImage(title, memories.length + 1);

  const year = String(formData.get("photoYear") || "freshman");
  const month = Number(formData.get("photoMonth") || 9);
  const tags = String(formData.get("photoTags") || "")
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

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
  saveMemories();
  closeAddModal();
  initSphere();
  showMonth(year, month);
}

function handlePageClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "home") showHome();
    if (action === "main") showMain();
    if (action === "year") showYear(actionTarget.dataset.year);
    if (action === "month") showMonth(actionTarget.dataset.year, Number(actionTarget.dataset.month));
    if (action === "filter") showMonth(currentScreen.year, currentScreen.month, actionTarget.dataset.tag);
    if (action === "add") openAddModal();
    if (action === "random") {
      const memory = memories[Math.floor(Math.random() * memories.length)];
      openDetail(memory);
    }
    return;
  }

  const card = event.target.closest(".memory-card");
  if (card) {
    const memory = memories.find((item) => item.id === card.dataset.memoryId);
    if (memory) openDetail(memory, card);
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
pageView.addEventListener("click", handlePageClick);
detailModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-detail]")) closeDetail();
});
addModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-add]")) closeAddModal();
});
addForm.addEventListener("submit", handleAddSubmit);
addForm.photoDate.addEventListener("change", handleDateChange);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetail();
    closeAddModal();
  }
});

populateMonthSelect();
initSphere();
