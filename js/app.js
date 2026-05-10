const DATA_FILES = {
  users: 'data/users.json',
  products: 'data/products.json',
  locations: 'data/locations.json',
  inbound: 'data/inbound.json',
  outbound: 'data/outbound.json',
  inventory: 'data/inventory.json'
};

const menus = [
  ['dashboard.html', '대시보드', '🏠'],
  ['inbound.html', '입고 관리', '📥'],
  ['outbound.html', '출고 관리', '📤'],
  ['inventory.html', '재고 현황', '📦'],
  ['history.html', '입출고 이력', '🧾'],
  ['products.html', '품목 관리', '🏷️'],
  ['locations.html', '창고 위치 관리', '📍'],
  ['users.html', '사용자 관리', '👥']
];

const pageState = {};

async function fetchJson(key) {
  const local = localStorage.getItem(`wms_${key}`);
  if (local) return JSON.parse(local);
  const res = await fetch(DATA_FILES[key]);
  const data = await res.json();
  localStorage.setItem(`wms_${key}`, JSON.stringify(data));
  return data;
}

function saveData(key, data) {
  localStorage.setItem(`wms_${key}`, JSON.stringify(data));
}

function currentUser() {
  return JSON.parse(localStorage.getItem('wms_login_user') || 'null');
}

function requireLogin() {
  if (!currentUser()) location.href = 'index.html';
}

function logout() {
  localStorage.removeItem('wms_login_user');
  location.href = 'index.html';
}

function resetLocalData() {
  if (!confirm('브라우저에 저장된 실습 데이터를 초기화하고 JSON 기본 데이터로 되돌립니다. 계속할까요?')) return;
  Object.keys(DATA_FILES).forEach(key => localStorage.removeItem(`wms_${key}`));
  alert('초기화되었습니다. 페이지를 다시 불러옵니다.');
  location.reload();
}

function layout(pageTitle, activeFile) {
  const user = currentUser() || { name: '게스트', role: '-' };
  const menuHtml = menus.map(([href, label, icon]) => {
    const active = href === activeFile ? 'active' : '';
    return `<a class="${active}" href="${href}"><span class="menu-icon">${icon}</span><span>${label}</span></a>`;
  }).join('');

  document.querySelector('#app').innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">📦</span><span>WMS</span></div>
      <nav class="menu">${menuHtml}</nav>
      <div class="sidebar-footer">
        JSON 기반 교육용 플랫폼<br>
        GitHub Pages 배포 가능
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <div class="page-title">${pageTitle}</div>
          <div class="page-subtitle">GitHub 저장소의 JSON 파일을 기준 데이터로 사용하는 정적 WMS 실습 화면</div>
        </div>
        <div class="user-chip">
          <span class="avatar">👤</span>
          <span>${escapeHtml(user.name)} · ${escapeHtml(user.role)}</span>
          <button class="btn small" onclick="resetLocalData()">데이터 초기화</button>
          <button class="btn small" onclick="logout()">로그아웃</button>
        </div>
      </header>
      <section class="content" id="content"></section>
    </main>
    <div class="modal-backdrop" id="modalBackdrop"></div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusBadge(status) {
  const color = {
    '입고완료': 'green', '검수중': 'blue', '입고대기': 'orange', '반려': 'red',
    '출고완료': 'green', '피킹중': 'blue', '출고요청': 'orange', '취소': 'red',
    '정상': 'green', '부족': 'orange', '품절': 'red', '대기': 'gray',
    '사용': 'green', '미사용': 'red', '사용 가능': 'green', '사용 중지': 'red'
  }[status] || 'gray';
  return `<span class="badge ${color}">${escapeHtml(status)}</span>`;
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function nextId(prefix, rows, field) {
  const date = todayText().replaceAll('-', '');
  const count = rows.filter(row => String(row[field] || '').startsWith(`${prefix}${date}`)).length + 1;
  return `${prefix}${date}${String(count).padStart(4, '0')}`;
}

function table(headers, rows) {
  const body = rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty-cell">조회 결과가 없습니다.</td></tr>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function selectOptions(items, selected = '') {
  return items.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map(v => v[field]).filter(Boolean))].sort();
}

function paginateRows(pageKey, rows) {
  const state = pageState[pageKey] || (pageState[pageKey] = { page: 1, pageSize: 10 });
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  return { pageRows: rows.slice(start, start + state.pageSize), total, totalPages, state };
}

function pagination(pageKey, rows) {
  const { total, totalPages, state } = paginateRows(pageKey, rows);
  const pages = [];
  const start = Math.max(1, state.page - 2);
  const end = Math.min(totalPages, state.page + 2);
  for (let i = start; i <= end; i++) {
    pages.push(`<button class="page-btn ${i === state.page ? 'active' : ''}" onclick="setPage('${pageKey}', ${i})">${i}</button>`);
  }
  return `
    <div class="pagination">
      <div class="page-summary">전체 ${formatNumber(total)}건 · ${state.page}/${totalPages} 페이지</div>
      <div class="page-actions">
        <button class="page-btn" onclick="setPage('${pageKey}', 1)">처음</button>
        <button class="page-btn" onclick="setPage('${pageKey}', ${Math.max(1, state.page - 1)})">이전</button>
        ${pages.join('')}
        <button class="page-btn" onclick="setPage('${pageKey}', ${Math.min(totalPages, state.page + 1)})">다음</button>
        <button class="page-btn" onclick="setPage('${pageKey}', ${totalPages})">끝</button>
      </div>
      <div class="page-size">
        <span>표시</span>
        <select onchange="setPageSize('${pageKey}', this.value)">
          ${[10, 20, 30, 50].map(n => `<option value="${n}" ${Number(state.pageSize) === n ? 'selected' : ''}>${n}개씩</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

function setPage(pageKey, page) {
  pageState[pageKey].page = Number(page);
  rerenderPage(pageKey);
}

function setPageSize(pageKey, pageSize) {
  pageState[pageKey].pageSize = Number(pageSize);
  pageState[pageKey].page = 1;
  rerenderPage(pageKey);
}

function rerenderPage(pageKey) {
  const renderers = {
    inbound: renderInbound,
    outbound: renderOutbound,
    inventory: renderInventory,
    history: renderHistory,
    products: renderProducts,
    locations: renderLocations,
    users: renderUsers
  };
  renderers[pageKey]?.();
}

function formValue(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function openModal(html) {
  const modal = document.querySelector('#modalBackdrop');
  modal.innerHTML = `<div class="modal">${html}</div>`;
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.querySelector('#modalBackdrop');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

function downloadCSV(filename, rows, columns) {
  if (!rows.length) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(row => columns.map(c => {
    const value = String(row[c.key] ?? '').replaceAll('"', '""');
    return `"${value}"`;
  }).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function getProducts() { return await fetchJson('products'); }
async function getLocations() { return await fetchJson('locations'); }

function productSelect(products, id, selected = '') {
  return `<select id="${id}" required>${products.map(p => `<option value="${p.productCode}" ${p.productCode === selected ? 'selected' : ''}>${p.productCode} · ${escapeHtml(p.productName)}</option>`).join('')}</select>`;
}

function locationSelect(locations, id, selected = '') {
  const codes = locations.map(v => `${v.zone}-${v.rack}-${v.cell}`);
  return `<select id="${id}" required>${codes.map(code => `<option value="${code}" ${code === selected ? 'selected' : ''}>${escapeHtml(code)}</option>`).join('')}</select>`;
}

function recalcInventoryStatus(row) {
  if (Number(row.currentStock) === 0) row.status = '품절';
  else if (Number(row.currentStock) < Number(row.safeStock)) row.status = '부족';
  else row.status = '정상';
}

function applyInventory(productCode, productName, qty, direction, location) {
  const inventory = JSON.parse(localStorage.getItem('wms_inventory') || '[]');
  let row = inventory.find(v => v.productCode === productCode);
  if (!row) {
    row = { productCode, productName, category: '-', location, currentStock: 0, safeStock: 0, status: '정상' };
    inventory.push(row);
  }
  const nextStock = Number(row.currentStock) + (direction === 'in' ? Number(qty) : -Number(qty));
  if (nextStock < 0) return false;
  row.currentStock = nextStock;
  row.location = location || row.location;
  recalcInventoryStatus(row);
  saveData('inventory', inventory);
  return true;
}

async function initLogin() {
  const form = document.querySelector('#loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const users = await fetchJson('users');
    const email = formValue('email');
    const password = formValue('password');
    const user = users.find(u => u.email === email && u.password === password && u.status === '정상');
    if (!user) {
      alert('이메일 또는 비밀번호가 올바르지 않거나 비활성 계정입니다. 샘플 계정 admin@wms.com / 1234');
      return;
    }
    user.lastLogin = new Date().toLocaleString('ko-KR');
    saveData('users', users);
    localStorage.setItem('wms_login_user', JSON.stringify(user));
    location.href = 'dashboard.html';
  });
}

async function initSignup() {
  const form = document.querySelector('#signupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const users = await fetchJson('users');
    const email = formValue('email');
    if (users.some(u => u.email === email)) {
      alert('이미 등록된 이메일입니다.');
      return;
    }
    const user = {
      id: `U${String(users.length + 1).padStart(3, '0')}`,
      name: formValue('name'),
      email,
      password: formValue('password'),
      role: formValue('role'),
      department: formValue('department'),
      status: '정상',
      lastLogin: '-'
    };
    users.unshift(user);
    saveData('users', users);
    alert('회원가입 정보가 브라우저 localStorage에 저장되었습니다.');
    location.href = 'index.html';
  });
}

async function initDashboard() {
  requireLogin();
  layout('대시보드', 'dashboard.html');
  const inbound = await fetchJson('inbound');
  const outbound = await fetchJson('outbound');
  const inventory = await fetchJson('inventory');
  const products = await fetchJson('products');
  const latestInDate = inbound[0]?.date || todayText();
  const latestOutDate = outbound[0]?.date || todayText();
  const todayIn = inbound.filter(v => v.date === latestInDate).length;
  const todayOut = outbound.filter(v => v.date === latestOutDate).length;
  const totalStock = inventory.reduce((sum, v) => sum + Number(v.currentStock), 0);
  const low = inventory.filter(v => ['부족', '품절'].includes(v.status)).length;
  document.querySelector('#content').innerHTML = `
    <section class="process-wrap card">
      <div class="panel-head"><div class="panel-title">WMS 업무 프로세스</div><button class="btn" onclick="downloadProcessGuide()">프로세스 CSV 다운로드</button></div>
      <div class="process-flow">
        ${[
          ['📥', '입고 등록', '입고 예정 또는 실제 입고 정보를 등록합니다.'], ['🔎', '입고 검수', '입고 상품의 수량과 상태를 확인합니다.'],
          ['📦', '재고 증가', '검수 완료 후 현재 재고를 증가시킵니다.'], ['📝', '출고 요청', '거래처 출고 요청 정보를 등록합니다.'],
          ['🛒', '피킹', '창고 위치에서 출고 대상 상품을 피킹합니다.'], ['🚚', '출고 확정', '실제 출고 완료 상태로 확정합니다.'],
          ['📉', '재고 차감', '출고 수량만큼 현재 재고를 차감합니다.'], ['🧾', '이력 조회', '입고와 출고의 전체 이력을 추적합니다.']
        ].map((s) => `<div class="step"><div class="step-icon">${s[0]}</div><div class="step-title">${s[1]}</div><div class="step-desc">${s[2]}</div></div>`).join('')}
      </div>
    </section>
    <div class="kpi-grid">
      <div class="card kpi"><div class="kpi-label">최근 입고일 입고 건수</div><div class="kpi-value">${todayIn} 건</div><div class="kpi-note">기준일 ${latestInDate}</div></div>
      <div class="card kpi"><div class="kpi-label">최근 출고일 출고 건수</div><div class="kpi-value">${todayOut} 건</div><div class="kpi-note">기준일 ${latestOutDate}</div></div>
      <div class="card kpi"><div class="kpi-label">현재 총 재고 수량</div><div class="kpi-value">${formatNumber(totalStock)} EA</div><div class="kpi-note">품목 ${products.length}개 기준</div></div>
      <div class="card kpi"><div class="kpi-label">재고 부족 품목</div><div class="kpi-value">${low} 개</div><div class="kpi-note danger-text">안전재고 미만 관리 필요</div></div>
    </div>
    <div class="grid-2">
      <div class="card panel">
        <div class="panel-head"><div class="panel-title">최근 입고 내역</div><a href="inbound.html">더보기</a></div>
        ${table(['입고번호','품목명','수량','입고일','상태'], inbound.slice(0,6).map(v => `<tr><td>${escapeHtml(v.inboundNo)}</td><td>${escapeHtml(v.productName)}</td><td>${formatNumber(v.qty)}</td><td>${v.date}</td><td>${statusBadge(v.status)}</td></tr>`))}
      </div>
      <div class="card panel">
        <div class="panel-head"><div class="panel-title">최근 출고 내역</div><a href="outbound.html">더보기</a></div>
        ${table(['출고번호','품목명','수량','출고일','상태'], outbound.slice(0,6).map(v => `<tr><td>${escapeHtml(v.outboundNo)}</td><td>${escapeHtml(v.productName)}</td><td>${formatNumber(v.qty)}</td><td>${v.date}</td><td>${statusBadge(v.status)}</td></tr>`))}
      </div>
    </div>
  `;
}

function downloadProcessGuide() {
  const rows = [
    { step: '1', name: '입고 등록', desc: '입고 예정 또는 실제 입고 정보를 등록' },
    { step: '2', name: '입고 검수', desc: '수량과 상태 확인' },
    { step: '3', name: '재고 증가', desc: '입고완료 시 재고 증가' },
    { step: '4', name: '출고 요청', desc: '거래처 출고 요청 등록' },
    { step: '5', name: '피킹', desc: '위치 기준 상품 피킹' },
    { step: '6', name: '출고 확정', desc: '출고완료 처리' },
    { step: '7', name: '재고 차감', desc: '출고완료 시 재고 차감' },
    { step: '8', name: '이력 조회', desc: '입출고 추적' }
  ];
  downloadCSV('wms_process.csv', rows, [{ key: 'step', label: '단계' }, { key: 'name', label: '업무' }, { key: 'desc', label: '설명' }]);
}

async function initInbound() {
  requireLogin();
  layout('입고 관리', 'inbound.html');
  pageState.inbound = { page: 1, pageSize: 10, filters: { keyword: '', status: '', supplier: '' } };
  await fetchJson('inbound');
  await fetchJson('inventory');
  renderInbound();
}

function filteredInbound(data) {
  const f = pageState.inbound.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.inboundNo, v.productName, v.productCode].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.status || v.status === f.status) && (!f.supplier || v.supplier === f.supplier);
  });
}

async function renderInbound() {
  const data = await fetchJson('inbound');
  const filtered = filteredInbound(data);
  const { pageRows } = paginateRows('inbound', filtered);
  const statuses = ['입고완료', '검수중', '입고대기', '반려'];
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head">
        <div class="panel-title">입고 관리</div>
        <div class="toolbar"><button class="btn" onclick="exportInbound()">엑셀 다운로드</button><button class="btn primary" onclick="showInboundForm()">+ 입고 등록</button></div>
      </div>
      <div class="filters">
        <input id="inKeyword" value="${escapeHtml(pageState.inbound.filters.keyword)}" placeholder="입고번호·품목 검색">
        <select id="inStatus"><option value="">상태 전체</option>${selectOptions(statuses, pageState.inbound.filters.status)}</select>
        <select id="inSupplier"><option value="">공급사 전체</option>${selectOptions(uniqueValues(data, 'supplier'), pageState.inbound.filters.supplier)}</select>
        <button class="btn primary small" onclick="searchInbound()">검색</button><button class="btn small" onclick="resetInbound()">초기화</button>
      </div>
      ${table(['입고번호','입고일','공급사','품목명','수량','창고 위치','상태','담당자','작업'], pageRows.map(v => `<tr><td>${escapeHtml(v.inboundNo)}</td><td>${v.date}</td><td>${escapeHtml(v.supplier)}</td><td>${escapeHtml(v.productName)}</td><td>${formatNumber(v.qty)}</td><td>${escapeHtml(v.location)}</td><td>${statusBadge(v.status)}</td><td>${escapeHtml(v.manager)}</td><td><button class="btn small" onclick="viewRow('inbound','${v.inboundNo}')">상세</button><button class="btn small danger" onclick="deleteInbound('${v.inboundNo}')">삭제</button></td></tr>`))}
      ${pagination('inbound', filtered)}
    </div>
  `;
}

function searchInbound() {
  pageState.inbound.filters = { keyword: formValue('inKeyword'), status: formValue('inStatus'), supplier: formValue('inSupplier') };
  pageState.inbound.page = 1;
  renderInbound();
}

function resetInbound() {
  pageState.inbound.filters = { keyword: '', status: '', supplier: '' };
  pageState.inbound.page = 1;
  renderInbound();
}

async function showInboundForm() {
  const products = await getProducts();
  const locations = await getLocations();
  openModal(`
    <div class="modal-head"><div class="modal-title">입고 등록</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <form class="form-grid" id="inboundForm">
      <div class="form-row"><label>공급사</label><input id="supplier" required placeholder="공급사 입력"></div>
      <div class="form-row"><label>품목</label>${productSelect(products, 'inProductCode')}</div>
      <div class="form-row"><label>수량</label><input id="qty" required type="number" min="1" placeholder="수량 입력"></div>
      <div class="form-row"><label>창고 위치</label>${locationSelect(locations, 'location')}</div>
      <div class="form-row"><label>상태</label><select id="status"><option>입고대기</option><option>검수중</option><option>입고완료</option><option>반려</option></select></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">저장</button></div>
    </form>
  `);
  document.querySelector('#inboundForm').addEventListener('submit', saveInbound);
}

async function saveInbound(e) {
  e.preventDefault();
  const data = await fetchJson('inbound');
  await fetchJson('inventory');
  const products = await getProducts();
  const p = products.find(v => v.productCode === formValue('inProductCode'));
  const row = {
    inboundNo: nextId('IN', data, 'inboundNo'),
    date: todayText(), supplier: formValue('supplier'), productCode: p.productCode, productName: p.productName,
    qty: Number(formValue('qty')), location: formValue('location'), status: formValue('status'), manager: currentUser().name
  };
  if (row.status === '입고완료') applyInventory(row.productCode, row.productName, row.qty, 'in', row.location);
  data.unshift(row);
  saveData('inbound', data);
  closeModal();
  renderInbound();
}

async function deleteInbound(no) {
  if (!confirm('선택한 입고 데이터를 삭제할까요?')) return;
  const data = await fetchJson('inbound');
  saveData('inbound', data.filter(v => v.inboundNo !== no));
  renderInbound();
}

async function exportInbound() {
  const rows = filteredInbound(await fetchJson('inbound'));
  downloadCSV('wms_inbound.csv', rows, [
    { key: 'inboundNo', label: '입고번호' }, { key: 'date', label: '입고일' }, { key: 'supplier', label: '공급사' },
    { key: 'productCode', label: '품목코드' }, { key: 'productName', label: '품목명' }, { key: 'qty', label: '수량' },
    { key: 'location', label: '창고위치' }, { key: 'status', label: '상태' }, { key: 'manager', label: '담당자' }
  ]);
}

async function initOutbound() {
  requireLogin();
  layout('출고 관리', 'outbound.html');
  pageState.outbound = { page: 1, pageSize: 10, filters: { keyword: '', status: '', customer: '' } };
  await fetchJson('outbound');
  await fetchJson('inventory');
  renderOutbound();
}

function filteredOutbound(data) {
  const f = pageState.outbound.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.outboundNo, v.productName, v.productCode].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.status || v.status === f.status) && (!f.customer || v.customer === f.customer);
  });
}

async function renderOutbound() {
  const data = await fetchJson('outbound');
  const filtered = filteredOutbound(data);
  const { pageRows } = paginateRows('outbound', filtered);
  const statuses = ['출고완료', '피킹중', '출고요청', '취소'];
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">출고 관리</div><div class="toolbar"><button class="btn" onclick="exportOutbound()">엑셀 다운로드</button><button class="btn primary" onclick="showOutboundForm()">+ 출고 등록</button></div></div>
      <div class="filters">
        <input id="outKeyword" value="${escapeHtml(pageState.outbound.filters.keyword)}" placeholder="출고번호·품목 검색">
        <select id="outStatus"><option value="">상태 전체</option>${selectOptions(statuses, pageState.outbound.filters.status)}</select>
        <select id="outCustomer"><option value="">출고처 전체</option>${selectOptions(uniqueValues(data, 'customer'), pageState.outbound.filters.customer)}</select>
        <button class="btn primary small" onclick="searchOutbound()">검색</button><button class="btn small" onclick="resetOutbound()">초기화</button>
      </div>
      ${table(['출고번호','출고일','출고처','품목명','수량','창고 위치','상태','담당자','작업'], pageRows.map(v => `<tr><td>${escapeHtml(v.outboundNo)}</td><td>${v.date}</td><td>${escapeHtml(v.customer)}</td><td>${escapeHtml(v.productName)}</td><td>${formatNumber(v.qty)}</td><td>${escapeHtml(v.location)}</td><td>${statusBadge(v.status)}</td><td>${escapeHtml(v.manager)}</td><td><button class="btn small" onclick="viewRow('outbound','${v.outboundNo}')">상세</button><button class="btn small danger" onclick="deleteOutbound('${v.outboundNo}')">삭제</button></td></tr>`))}
      ${pagination('outbound', filtered)}
    </div>
  `;
}

function searchOutbound() {
  pageState.outbound.filters = { keyword: formValue('outKeyword'), status: formValue('outStatus'), customer: formValue('outCustomer') };
  pageState.outbound.page = 1;
  renderOutbound();
}

function resetOutbound() {
  pageState.outbound.filters = { keyword: '', status: '', customer: '' };
  pageState.outbound.page = 1;
  renderOutbound();
}

async function showOutboundForm() {
  const products = await getProducts();
  const locations = await getLocations();
  openModal(`
    <div class="modal-head"><div class="modal-title">출고 등록</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <form class="form-grid" id="outboundForm">
      <div class="form-row"><label>출고처</label><input id="customer" required placeholder="출고처 입력"></div>
      <div class="form-row"><label>품목</label>${productSelect(products, 'outProductCode')}</div>
      <div class="form-row"><label>수량</label><input id="outQty" required type="number" min="1" placeholder="수량 입력"></div>
      <div class="form-row"><label>창고 위치</label>${locationSelect(locations, 'outLocation')}</div>
      <div class="form-row"><label>상태</label><select id="outStatusForm"><option>출고요청</option><option>피킹중</option><option>출고완료</option><option>취소</option></select></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">저장</button></div>
    </form>
  `);
  document.querySelector('#outboundForm').addEventListener('submit', saveOutbound);
}

async function saveOutbound(e) {
  e.preventDefault();
  const data = await fetchJson('outbound');
  await fetchJson('inventory');
  const products = await getProducts();
  const p = products.find(v => v.productCode === formValue('outProductCode'));
  const row = {
    outboundNo: nextId('OUT', data, 'outboundNo'),
    date: todayText(), customer: formValue('customer'), productCode: p.productCode, productName: p.productName,
    qty: Number(formValue('outQty')), location: formValue('outLocation'), status: formValue('outStatusForm'), manager: currentUser().name
  };
  if (row.status === '출고완료') {
    const ok = applyInventory(row.productCode, row.productName, row.qty, 'out', row.location);
    if (!ok) {
      alert('현재 재고보다 출고 수량이 많아 출고완료로 등록할 수 없습니다.');
      return;
    }
  }
  data.unshift(row);
  saveData('outbound', data);
  closeModal();
  renderOutbound();
}

async function deleteOutbound(no) {
  if (!confirm('선택한 출고 데이터를 삭제할까요?')) return;
  const data = await fetchJson('outbound');
  saveData('outbound', data.filter(v => v.outboundNo !== no));
  renderOutbound();
}

async function exportOutbound() {
  const rows = filteredOutbound(await fetchJson('outbound'));
  downloadCSV('wms_outbound.csv', rows, [
    { key: 'outboundNo', label: '출고번호' }, { key: 'date', label: '출고일' }, { key: 'customer', label: '출고처' },
    { key: 'productCode', label: '품목코드' }, { key: 'productName', label: '품목명' }, { key: 'qty', label: '수량' },
    { key: 'location', label: '창고위치' }, { key: 'status', label: '상태' }, { key: 'manager', label: '담당자' }
  ]);
}

async function initInventory() {
  requireLogin();
  layout('재고 현황', 'inventory.html');
  pageState.inventory = { page: 1, pageSize: 10, filters: { keyword: '', category: '', status: '' } };
  await fetchJson('inventory');
  renderInventory();
}

function filteredInventory(data) {
  const f = pageState.inventory.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.productCode, v.productName].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.category || v.category === f.category) && (!f.status || v.status === f.status);
  });
}

async function renderInventory() {
  const data = await fetchJson('inventory');
  const filtered = filteredInventory(data);
  const { pageRows } = paginateRows('inventory', filtered);
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">재고 현황</div><button class="btn" onclick="exportInventory()">엑셀 다운로드</button></div>
      <div class="filters">
        <input id="invKeyword" value="${escapeHtml(pageState.inventory.filters.keyword)}" placeholder="품목코드·품목명 검색">
        <select id="invCategory"><option value="">카테고리 전체</option>${selectOptions(uniqueValues(data, 'category'), pageState.inventory.filters.category)}</select>
        <select id="invStatus"><option value="">상태 전체</option>${selectOptions(['정상','부족','품절'], pageState.inventory.filters.status)}</select>
        <button class="btn primary small" onclick="searchInventory()">검색</button><button class="btn small" onclick="resetInventory()">초기화</button>
      </div>
      ${table(['품목코드','품목명','카테고리','창고 위치','현재 재고','안전 재고','상태'], pageRows.map(v => `<tr><td>${escapeHtml(v.productCode)}</td><td>${escapeHtml(v.productName)}</td><td>${escapeHtml(v.category)}</td><td>${escapeHtml(v.location)}</td><td>${formatNumber(v.currentStock)}</td><td>${formatNumber(v.safeStock)}</td><td>${statusBadge(v.status)}</td></tr>`))}
      ${pagination('inventory', filtered)}
    </div>
  `;
}

function searchInventory() {
  pageState.inventory.filters = { keyword: formValue('invKeyword'), category: formValue('invCategory'), status: formValue('invStatus') };
  pageState.inventory.page = 1;
  renderInventory();
}

function resetInventory() {
  pageState.inventory.filters = { keyword: '', category: '', status: '' };
  pageState.inventory.page = 1;
  renderInventory();
}

async function exportInventory() {
  const rows = filteredInventory(await fetchJson('inventory'));
  downloadCSV('wms_inventory.csv', rows, [
    { key: 'productCode', label: '품목코드' }, { key: 'productName', label: '품목명' }, { key: 'category', label: '카테고리' },
    { key: 'location', label: '창고위치' }, { key: 'currentStock', label: '현재재고' }, { key: 'safeStock', label: '안전재고' }, { key: 'status', label: '상태' }
  ]);
}

async function initHistory() {
  requireLogin();
  layout('입출고 이력', 'history.html');
  pageState.history = { page: 1, pageSize: 10, filters: { keyword: '', type: '', status: '' } };
  renderHistory();
}

async function historyRows() {
  const inbound = (await fetchJson('inbound')).map(v => ({ type: '입고', no: v.inboundNo, date: v.date, partner: v.supplier, productName: v.productName, qty: v.qty, manager: v.manager, status: v.status }));
  const outbound = (await fetchJson('outbound')).map(v => ({ type: '출고', no: v.outboundNo, date: v.date, partner: v.customer, productName: v.productName, qty: v.qty, manager: v.manager, status: v.status }));
  return [...inbound, ...outbound].sort((a, b) => b.date.localeCompare(a.date));
}

function filteredHistory(data) {
  const f = pageState.history.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.no, v.productName, v.partner, v.manager].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.type || v.type === f.type) && (!f.status || v.status === f.status);
  });
}

async function renderHistory() {
  const data = await historyRows();
  const filtered = filteredHistory(data);
  const { pageRows } = paginateRows('history', filtered);
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">입출고 이력</div><button class="btn" onclick="exportHistory()">엑셀 다운로드</button></div>
      <div class="filters">
        <input id="histKeyword" value="${escapeHtml(pageState.history.filters.keyword)}" placeholder="번호·품목·거래처 검색">
        <select id="histType"><option value="">거래 유형 전체</option>${selectOptions(['입고','출고'], pageState.history.filters.type)}</select>
        <select id="histStatus"><option value="">상태 전체</option>${selectOptions(['입고완료','검수중','입고대기','반려','출고완료','피킹중','출고요청','취소'], pageState.history.filters.status)}</select>
        <button class="btn primary small" onclick="searchHistory()">검색</button><button class="btn small" onclick="resetHistory()">초기화</button>
      </div>
      ${table(['일자','구분','번호','품목명','수량','거래처','담당자','상태'], pageRows.map(v => `<tr><td>${v.date}</td><td>${v.type}</td><td>${escapeHtml(v.no)}</td><td>${escapeHtml(v.productName)}</td><td>${formatNumber(v.qty)}</td><td>${escapeHtml(v.partner)}</td><td>${escapeHtml(v.manager)}</td><td>${statusBadge(v.status)}</td></tr>`))}
      ${pagination('history', filtered)}
    </div>
  `;
}

function searchHistory() {
  pageState.history.filters = { keyword: formValue('histKeyword'), type: formValue('histType'), status: formValue('histStatus') };
  pageState.history.page = 1;
  renderHistory();
}

function resetHistory() {
  pageState.history.filters = { keyword: '', type: '', status: '' };
  pageState.history.page = 1;
  renderHistory();
}

async function exportHistory() {
  const rows = filteredHistory(await historyRows());
  downloadCSV('wms_history.csv', rows, [
    { key: 'date', label: '일자' }, { key: 'type', label: '구분' }, { key: 'no', label: '번호' }, { key: 'productName', label: '품목명' },
    { key: 'qty', label: '수량' }, { key: 'partner', label: '거래처' }, { key: 'manager', label: '담당자' }, { key: 'status', label: '상태' }
  ]);
}

async function initProducts() {
  requireLogin();
  layout('품목 관리', 'products.html');
  pageState.products = { page: 1, pageSize: 10, filters: { keyword: '', category: '', useYn: '' } };
  renderProducts();
}

function filteredProducts(data) {
  const f = pageState.products.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.productCode, v.productName].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.category || v.category === f.category) && (!f.useYn || v.useYn === f.useYn);
  });
}

async function renderProducts() {
  const data = await fetchJson('products');
  const filtered = filteredProducts(data);
  const { pageRows } = paginateRows('products', filtered);
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">품목 관리</div><div class="toolbar"><button class="btn" onclick="exportProducts()">엑셀 다운로드</button><button class="btn primary" onclick="showProductForm()">+ 품목 등록</button></div></div>
      <div class="filters">
        <input id="prodKeyword" value="${escapeHtml(pageState.products.filters.keyword)}" placeholder="품목코드·품목명 검색">
        <select id="prodCategory"><option value="">카테고리 전체</option>${selectOptions(uniqueValues(data, 'category'), pageState.products.filters.category)}</select>
        <select id="prodUseYn"><option value="">사용 여부 전체</option>${selectOptions(['사용','미사용'], pageState.products.filters.useYn)}</select>
        <button class="btn primary small" onclick="searchProducts()">검색</button><button class="btn small" onclick="resetProducts()">초기화</button>
      </div>
      ${table(['품목코드','품목명','카테고리','단위','안전 재고','사용 여부','작업'], pageRows.map(v => `<tr><td>${escapeHtml(v.productCode)}</td><td>${escapeHtml(v.productName)}</td><td>${escapeHtml(v.category)}</td><td>${escapeHtml(v.unit)}</td><td>${formatNumber(v.safeStock)}</td><td>${statusBadge(v.useYn)}</td><td><button class="btn small" onclick="showProductForm('${v.productCode}')">수정</button><button class="btn small danger" onclick="deleteProduct('${v.productCode}')">삭제</button></td></tr>`))}
      ${pagination('products', filtered)}
    </div>
  `;
}

function searchProducts() {
  pageState.products.filters = { keyword: formValue('prodKeyword'), category: formValue('prodCategory'), useYn: formValue('prodUseYn') };
  pageState.products.page = 1;
  renderProducts();
}

function resetProducts() {
  pageState.products.filters = { keyword: '', category: '', useYn: '' };
  pageState.products.page = 1;
  renderProducts();
}

async function showProductForm(code = '') {
  const data = await fetchJson('products');
  const row = data.find(v => v.productCode === code) || { productCode: `P${String(data.length + 1).padStart(3, '0')}`, productName: '', category: '', unit: 'EA', safeStock: 50, useYn: '사용' };
  openModal(`
    <div class="modal-head"><div class="modal-title">${code ? '품목 수정' : '품목 등록'}</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <form class="form-grid" id="productForm">
      <div class="form-row"><label>품목코드</label><input id="productCode" value="${escapeHtml(row.productCode)}" ${code ? 'readonly' : ''} required></div>
      <div class="form-row"><label>품목명</label><input id="productName" value="${escapeHtml(row.productName)}" required></div>
      <div class="form-row"><label>카테고리</label><input id="category" value="${escapeHtml(row.category)}" required></div>
      <div class="form-row"><label>단위</label><input id="unit" value="${escapeHtml(row.unit)}" required></div>
      <div class="form-row"><label>안전 재고</label><input id="safeStock" type="number" min="0" value="${row.safeStock}" required></div>
      <div class="form-row"><label>사용 여부</label><select id="useYn">${selectOptions(['사용','미사용'], row.useYn)}</select></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">저장</button></div>
    </form>
  `);
  document.querySelector('#productForm').addEventListener('submit', e => saveProduct(e, code));
}

async function saveProduct(e, editCode) {
  e.preventDefault();
  const data = await fetchJson('products');
  const row = { productCode: formValue('productCode'), productName: formValue('productName'), category: formValue('category'), unit: formValue('unit'), safeStock: Number(formValue('safeStock')), useYn: formValue('useYn') };
  const idx = data.findIndex(v => v.productCode === editCode);
  if (idx >= 0) data[idx] = row; else data.unshift(row);
  saveData('products', data);
  closeModal();
  renderProducts();
}

async function deleteProduct(code) {
  if (!confirm('품목을 삭제할까요? 입출고 이력은 삭제되지 않습니다.')) return;
  const data = await fetchJson('products');
  saveData('products', data.filter(v => v.productCode !== code));
  renderProducts();
}

async function exportProducts() {
  const rows = filteredProducts(await fetchJson('products'));
  downloadCSV('wms_products.csv', rows, [
    { key: 'productCode', label: '품목코드' }, { key: 'productName', label: '품목명' }, { key: 'category', label: '카테고리' },
    { key: 'unit', label: '단위' }, { key: 'safeStock', label: '안전재고' }, { key: 'useYn', label: '사용여부' }
  ]);
}

async function initLocations() {
  requireLogin();
  layout('창고 위치 관리', 'locations.html');
  pageState.locations = { page: 1, pageSize: 10, filters: { warehouse: '', zone: '', status: '' } };
  renderLocations();
}

function filteredLocations(data) {
  const f = pageState.locations.filters;
  return data.filter(v => (!f.warehouse || v.warehouse === f.warehouse) && (!f.zone || v.zone === f.zone) && (!f.status || v.status === f.status));
}

async function renderLocations() {
  const data = await fetchJson('locations');
  const filtered = filteredLocations(data);
  const { pageRows } = paginateRows('locations', filtered);
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">창고 위치 관리</div><div class="toolbar"><button class="btn" onclick="exportLocations()">엑셀 다운로드</button><button class="btn primary" onclick="showLocationForm()">+ 위치 등록</button></div></div>
      <div class="filters">
        <select id="locWarehouse"><option value="">창고 전체</option>${selectOptions(uniqueValues(data, 'warehouse'), pageState.locations.filters.warehouse)}</select>
        <select id="locZone"><option value="">구역 전체</option>${selectOptions(uniqueValues(data, 'zone'), pageState.locations.filters.zone)}</select>
        <select id="locStatus"><option value="">사용 여부 전체</option>${selectOptions(['사용 가능','사용 중지'], pageState.locations.filters.status)}</select>
        <button class="btn primary small" onclick="searchLocations()">검색</button><button class="btn small" onclick="resetLocations()">초기화</button>
      </div>
      ${table(['창고명','구역','랙','셀','사용 여부','보관 품목 수','작업'], pageRows.map((v, idx) => `<tr><td>${escapeHtml(v.warehouse)}</td><td>${escapeHtml(v.zone)}</td><td>${escapeHtml(v.rack)}</td><td>${escapeHtml(v.cell)}</td><td>${statusBadge(v.status)}</td><td>${formatNumber(v.capacity)}</td><td><button class="btn small" onclick="showLocationForm('${v.warehouse}|${v.zone}|${v.rack}|${v.cell}')">수정</button><button class="btn small danger" onclick="deleteLocation('${v.warehouse}|${v.zone}|${v.rack}|${v.cell}')">삭제</button></td></tr>`))}
      ${pagination('locations', filtered)}
    </div>
  `;
}

function searchLocations() {
  pageState.locations.filters = { warehouse: formValue('locWarehouse'), zone: formValue('locZone'), status: formValue('locStatus') };
  pageState.locations.page = 1;
  renderLocations();
}

function resetLocations() {
  pageState.locations.filters = { warehouse: '', zone: '', status: '' };
  pageState.locations.page = 1;
  renderLocations();
}

async function showLocationForm(key = '') {
  const data = await fetchJson('locations');
  const row = data.find(v => `${v.warehouse}|${v.zone}|${v.rack}|${v.cell}` === key) || { warehouse: 'A창고', zone: 'A', rack: '01', cell: '01', status: '사용 가능', capacity: 0 };
  openModal(`
    <div class="modal-head"><div class="modal-title">${key ? '위치 수정' : '위치 등록'}</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <form class="form-grid" id="locationForm">
      <div class="form-row"><label>창고명</label><input id="warehouse" value="${escapeHtml(row.warehouse)}" required></div>
      <div class="form-row"><label>구역</label><input id="zone" value="${escapeHtml(row.zone)}" required></div>
      <div class="form-row"><label>랙</label><input id="rack" value="${escapeHtml(row.rack)}" required></div>
      <div class="form-row"><label>셀</label><input id="cell" value="${escapeHtml(row.cell)}" required></div>
      <div class="form-row"><label>사용 여부</label><select id="locUseStatus">${selectOptions(['사용 가능','사용 중지'], row.status)}</select></div>
      <div class="form-row"><label>보관 품목 수</label><input id="capacity" type="number" min="0" value="${row.capacity}" required></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">저장</button></div>
    </form>
  `);
  document.querySelector('#locationForm').addEventListener('submit', e => saveLocation(e, key));
}

async function saveLocation(e, editKey) {
  e.preventDefault();
  const data = await fetchJson('locations');
  const row = { warehouse: formValue('warehouse'), zone: formValue('zone'), rack: formValue('rack'), cell: formValue('cell'), status: formValue('locUseStatus'), capacity: Number(formValue('capacity')) };
  const idx = data.findIndex(v => `${v.warehouse}|${v.zone}|${v.rack}|${v.cell}` === editKey);
  if (idx >= 0) data[idx] = row; else data.unshift(row);
  saveData('locations', data);
  closeModal();
  renderLocations();
}

async function deleteLocation(key) {
  if (!confirm('창고 위치를 삭제할까요?')) return;
  const data = await fetchJson('locations');
  saveData('locations', data.filter(v => `${v.warehouse}|${v.zone}|${v.rack}|${v.cell}` !== key));
  renderLocations();
}

async function exportLocations() {
  const rows = filteredLocations(await fetchJson('locations'));
  downloadCSV('wms_locations.csv', rows, [
    { key: 'warehouse', label: '창고명' }, { key: 'zone', label: '구역' }, { key: 'rack', label: '랙' }, { key: 'cell', label: '셀' },
    { key: 'status', label: '사용여부' }, { key: 'capacity', label: '보관품목수' }
  ]);
}

async function initUsers() {
  requireLogin();
  layout('사용자 관리', 'users.html');
  pageState.users = { page: 1, pageSize: 10, filters: { keyword: '', role: '', status: '' } };
  renderUsers();
}

function filteredUsers(data) {
  const f = pageState.users.filters;
  return data.filter(v => {
    const keyword = f.keyword.toLowerCase();
    const hit = !keyword || [v.name, v.email, v.department].some(x => String(x).toLowerCase().includes(keyword));
    return hit && (!f.role || v.role === f.role) && (!f.status || v.status === f.status);
  });
}

async function renderUsers() {
  const data = await fetchJson('users');
  const filtered = filteredUsers(data);
  const { pageRows } = paginateRows('users', filtered);
  document.querySelector('#content').innerHTML = `
    <div class="card panel">
      <div class="panel-head"><div class="panel-title">사용자 관리</div><div class="toolbar"><button class="btn" onclick="exportUsers()">엑셀 다운로드</button><button class="btn primary" onclick="showUserForm()">+ 사용자 등록</button></div></div>
      <div class="filters">
        <input id="userKeyword" value="${escapeHtml(pageState.users.filters.keyword)}" placeholder="이름·이메일·부서 검색">
        <select id="userRole"><option value="">역할 전체</option>${selectOptions(['관리자','창고담당자','입고담당자','출고담당자'], pageState.users.filters.role)}</select>
        <select id="userStatus"><option value="">상태 전체</option>${selectOptions(['정상','대기'], pageState.users.filters.status)}</select>
        <button class="btn primary small" onclick="searchUsers()">검색</button><button class="btn small" onclick="resetUsers()">초기화</button>
      </div>
      ${table(['사용자명','이메일','역할','부서','상태','최근 로그인','작업'], pageRows.map(v => `<tr><td>${escapeHtml(v.name)}</td><td>${escapeHtml(v.email)}</td><td>${escapeHtml(v.role)}</td><td>${escapeHtml(v.department)}</td><td>${statusBadge(v.status)}</td><td>${escapeHtml(v.lastLogin)}</td><td><button class="btn small" onclick="showUserForm('${v.id}')">수정</button><button class="btn small danger" onclick="deleteUser('${v.id}')">삭제</button></td></tr>`))}
      ${pagination('users', filtered)}
    </div>
  `;
}

function searchUsers() {
  pageState.users.filters = { keyword: formValue('userKeyword'), role: formValue('userRole'), status: formValue('userStatus') };
  pageState.users.page = 1;
  renderUsers();
}

function resetUsers() {
  pageState.users.filters = { keyword: '', role: '', status: '' };
  pageState.users.page = 1;
  renderUsers();
}

async function showUserForm(id = '') {
  const data = await fetchJson('users');
  const row = data.find(v => v.id === id) || { id: `U${String(data.length + 1).padStart(3, '0')}`, name: '', email: '', password: '1234', role: '창고담당자', department: '', status: '정상', lastLogin: '-' };
  openModal(`
    <div class="modal-head"><div class="modal-title">${id ? '사용자 수정' : '사용자 등록'}</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <form class="form-grid" id="userForm">
      <div class="form-row"><label>사용자명</label><input id="userName" value="${escapeHtml(row.name)}" required></div>
      <div class="form-row"><label>이메일</label><input id="userEmail" type="email" value="${escapeHtml(row.email)}" required></div>
      <div class="form-row"><label>비밀번호</label><input id="userPassword" value="${escapeHtml(row.password)}" required></div>
      <div class="form-row"><label>역할</label><select id="role">${selectOptions(['관리자','창고담당자','입고담당자','출고담당자'], row.role)}</select></div>
      <div class="form-row"><label>부서</label><input id="department" value="${escapeHtml(row.department)}" required></div>
      <div class="form-row"><label>상태</label><select id="userStatusForm">${selectOptions(['정상','대기'], row.status)}</select></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">저장</button></div>
    </form>
  `);
  document.querySelector('#userForm').addEventListener('submit', e => saveUser(e, id));
}

async function saveUser(e, editId) {
  e.preventDefault();
  const data = await fetchJson('users');
  const row = { id: editId || `U${String(data.length + 1).padStart(3, '0')}`, name: formValue('userName'), email: formValue('userEmail'), password: formValue('userPassword'), role: formValue('role'), department: formValue('department'), status: formValue('userStatusForm'), lastLogin: editId ? (data.find(v => v.id === editId)?.lastLogin || '-') : '-' };
  const idx = data.findIndex(v => v.id === editId);
  if (idx >= 0) data[idx] = row; else data.unshift(row);
  saveData('users', data);
  closeModal();
  renderUsers();
}

async function deleteUser(id) {
  if (!confirm('사용자를 삭제할까요?')) return;
  const data = await fetchJson('users');
  saveData('users', data.filter(v => v.id !== id));
  renderUsers();
}

async function exportUsers() {
  const rows = filteredUsers(await fetchJson('users'));
  downloadCSV('wms_users.csv', rows, [
    { key: 'id', label: '사용자ID' }, { key: 'name', label: '사용자명' }, { key: 'email', label: '이메일' },
    { key: 'role', label: '역할' }, { key: 'department', label: '부서' }, { key: 'status', label: '상태' }, { key: 'lastLogin', label: '최근로그인' }
  ]);
}

async function viewRow(type, no) {
  const data = await fetchJson(type);
  const field = type === 'inbound' ? 'inboundNo' : 'outboundNo';
  const row = data.find(v => v[field] === no);
  if (!row) return;
  openModal(`
    <div class="modal-head"><div class="modal-title">상세 정보</div><button class="btn small" onclick="closeModal()">닫기</button></div>
    <div class="detail-grid">
      ${Object.entries(row).map(([k, v]) => `<div class="detail-row"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join('')}
    </div>
    <div class="modal-actions"><button class="btn primary" onclick="closeModal()">확인</button></div>
  `);
}
