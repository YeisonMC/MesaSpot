import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const rid = '111111111111111111111111', bid = '222222222222222222222222', pid = '333333333333333333333333', mid = '444444444444444444444444';
const user = role => ({ _id: '999999999999999999999999', firstName: 'Usuario', lastName: 'Prueba', email: 'demo@example.com', role });
function fixtures() {
  const restaurant = { _id: rid, name: 'Restaurante API', slug: 'restaurante-api', shortDescription: 'Información desde MongoDB', description: ['Descripción del restaurante'], foundedYear: 2020, cuisineTypes: ['CARNES'], status: 'PUBLISHED', featured: true, mainBranchId: bid, contact: {}, ratingSummary: { reviewCount: 3, overall: 4.67 } };
  const branch = { _id: bid, restaurantId: rid, name: 'Sede Surco', status: 'ACTIVE', address: { street: 'Dirección de prueba', district: 'Santiago de Surco', province: 'Lima' }, contact: {}, averagePricePerPersonCents: 8500, openingHours: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, closed: false, periods: [{ opens: '13:00', closes: '23:00' }] })), specialHours: [], services: ['FREE_WIFI'] };
  restaurant.displayBranch = branch;
  const photos = [{ _id: pid, restaurantId: rid, branchId: bid, type: 'DISH', title: 'Asado', url: 'https://example.com/photo.png', status: 'PUBLISHED' }];
  const menu = [{ _id: mid, restaurantId: rid, name: 'Asado de prueba', category: 'MAIN', photoId: pid, branchOffers: [{ branchId: bid, priceCents: 6500, available: true }], status: 'ACTIVE', recommendation: { featured: true, label: 'CHEF_FAVORITE' }, allergens: [], allergenInformationConfirmed: false }];
  const reviews = [1, 2, 3].map(i => ({ _id: String(i).repeat(24), restaurantId: rid, branchId: bid, user: { _id: 'a'.repeat(24), firstName: 'Cliente ' + i, lastName: 'Demo' }, title: 'Reseña ' + i, comment: 'Una experiencia de prueba excelente.', ratings: { overall: 5, food: 5, service: 5, ambience: 4, valueForMoney: 4 }, visitedAt: '2026-10-20T15:00:00Z', verifiedVisit: false }));
  return { restaurant, restaurants: [restaurant], branches: [branch], photos, 'menu-items': menu, reviews, mine: [], promotions: [], requests: [], fail: false, logged: user('CLIENT') };
}
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 10)); }
  assert.fail('La interfaz no alcanzó el estado esperado');
}
async function open(file, { role, data = fixtures() } = {}) {
  const html = await readFile(path.join(root, file), 'utf8');
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:5500/' + file + (file.includes('restaurante.html') ? '?id=' + rid : ''), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const errors = [];
  w.addEventListener('error', event => errors.push(event.error));
  w.matchMedia = () => ({ matches: true }); w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.confirm = () => true; w.AbortSignal = globalThis.AbortSignal; w.AbortController = globalThis.AbortController;
  w.URL.createObjectURL = () => 'blob:http://127.0.0.1:5500/profile-preview'; w.URL.revokeObjectURL = () => {};
  if (role) { data.logged = user(role); w.sessionStorage.setItem('mesaspot.session', JSON.stringify({ token: 'test', user: data.logged })); }
  w.fetch = async (url, options = {}) => {
    if (data.fail) throw new TypeError('offline');
    const endpoint = new URL(url); const route = endpoint.pathname.replace('/api', ''); const method = options.method || 'GET';
    const body = options.body instanceof w.FormData ? options.body : options.body ? JSON.parse(options.body) : undefined; data.requests.push({ route, method, body, headers: options.headers, query: Object.fromEntries(endpoint.searchParams) });
    const response = (content, status = 200, meta) => ({ ok: status < 400, status, json: async () => status < 400 ? { success: true, data: content, meta } : { success: false, message: content } });
    const list = records => response(records, 200, { page: 1, limit: 100, total: records.length, totalPages: records.length ? 1 : 0 });
    if (endpoint.hostname === 'api.cloudinary.com') {
      if (data.failPhoto) return { ok:false, json:async()=>({error:{message:'Upload failed'}}) };
      return { ok:true, json:async()=>({ public_id:'mesaspot/avatars/'+data.logged._id+'/test-photo' }) };
    }
    if (route === '/users/me/avatar/signature') {
      if (data.noCloudinary) return response('La subida de fotos todavía no está configurada.',503);
      return response({ uploadUrl:'https://api.cloudinary.com/v1_1/test/image/upload', apiKey:'public-test-key', signature:'signed-test', maxBytes:5*1024*1024, params:{public_id:'mesaspot/avatars/'+data.logged._id+'/test-photo',timestamp:1,overwrite:false} });
    }
    if (route === '/auth/login' || route === '/auth/register') {
      if (body.password === 'incorrecta') return response('Correo o contraseña incorrectos', 401);
      return response({ token: 'test', user: data.logged, tokenType: 'Bearer' }, route.endsWith('register') ? 201 : 200);
    }
    if (route === '/users/me') { if (method === 'PATCH') { Object.assign(data.logged, body); if(body.avatarPublicId) data.logged.avatarUrl='https://res.cloudinary.com/test/image/upload/profile.png'; } return response(data.logged); }
    if (route === '/users/me/reviews') return list(data.mine);
    if (route === '/metadata') return response({ cuisines: ['CARNES'], services: ['FREE_WIFI'], photoTypes: ['AMBIENCE', 'DISH'], menuCategories: ['STARTER', 'MAIN'], recommendations: ['CHEF_FAVORITE', 'RECOMMENDED'] });
    if (route === '/restaurants') return list(data.restaurants.filter(r => (!endpoint.searchParams.get('q') || r.name.includes(endpoint.searchParams.get('q'))) && r.displayBranch.averagePricePerPersonCents >= Number(endpoint.searchParams.get('minPriceCents') || 0) && (endpoint.searchParams.get('maxPriceCents') === null || r.displayBranch.averagePricePerPersonCents <= Number(endpoint.searchParams.get('maxPriceCents')))));
    if (route === '/promotions') return list(data.promotions);
    if (route === '/admin/restaurants' && method === 'GET') return list(data.restaurants);
    if (route === '/admin/restaurants' && method === 'POST') { const item = { ...data.restaurant, ...body, _id: 'b'.repeat(24) }; data.restaurants.push(item); return response(item, 201); }
    if (route === '/admin/restaurants/' + rid && method === 'PATCH') { Object.assign(data.restaurant, body); return response(data.restaurant); }
    if (route === '/restaurants/' + rid || route.startsWith('/restaurants/slug/')) return response(data.restaurant);
    if (route.includes('/reviews')) {
      if (route.endsWith('/reviews') && method === 'GET') {
        const page = Number(endpoint.searchParams.get('page') || 1), limit = Number(endpoint.searchParams.get('limit') || 3);
        const sorted = [...data.reviews].sort((a,b) => endpoint.searchParams.get('sort') === 'highest' ? b.ratings.overall - a.ratings.overall : endpoint.searchParams.get('sort') === 'lowest' ? a.ratings.overall - b.ratings.overall : 0);
        return response(sorted.slice((page-1)*limit,page*limit), 200, { page, limit, total:sorted.length, totalPages:Math.ceil(sorted.length/limit) });
      }
      if (method === 'POST') { if (data.rejectReview) return response('No se pudo publicar la reseña', 422); const item = { ...body, ratings: { ...body.ratings, overall: Math.round((body.ratings.food + body.ratings.service + body.ratings.ambience) / 3 * 100) / 100 }, _id: 'e'.repeat(24), restaurantId: rid, user: data.logged }; data.mine = [item]; data.reviews.push(item); data.restaurant.ratingSummary.reviewCount++; return response(item, 201); }
      if (method === 'PATCH') { Object.assign(data.mine[0], body); return response(data.mine[0]); }
      if (method === 'DELETE') { data.reviews = data.reviews.filter(r => r._id !== data.mine[0]?._id); data.mine = []; return response({}); }
      if (method === 'PUT') return response({});
    }
    const type = ['branches', 'photos', 'menu-items', 'promotions'].find(t => route.includes('/' + t));
    if (type) {
      if (method === 'GET') return list(data[type]);
      if (method === 'PATCH') { Object.assign(data[type][0], body); return response(data[type][0]); }
      if (method === 'POST') { const item = { ...body, _id: 'f'.repeat(24), restaurantId: rid }; data[type].push(item); return response(item, 201); }
      if (method === 'DELETE') return response({});
    }
    throw new Error('Endpoint no contemplado: ' + method + ' ' + route);
  };
  for (const script of w.document.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src'); if (/^https?:/.test(src)) continue;
    w.eval(await readFile(path.resolve(path.dirname(path.join(root, file)), src), 'utf8'));
  }
  const $ = selector => w.document.querySelector(selector);
  const submit = selector => $(selector).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  return { dom, w, data, $, submit, errors };
}
test('inicio obtiene datos, enlaza IDs reales y evita interpretar contenido del servidor como HTML', async t => {
  const data = fixtures(); data.restaurant.name = '<img src=x onerror=alert(1)>';
  const page = await open('index.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.restaurant-card'));
  assert.equal(page.$('.restaurant-card h3').textContent, data.restaurant.name);
  assert.equal(page.$('.restaurant-card h3 img'), null);
  assert.ok(page.$('.reserve').href.includes('?id=' + rid));
  assert.equal(page.errors.length, 0);
});
test('catálogo conserva filtros, vacíos, paginación y recuperación de fallos', async t => {
  const page = await open('pages/restaurantes.html'); t.after(() => page.dom.window.close());
  await until(() => page.$('.restaurant-card'));
  page.$('[name=query]').value = 'inexistente'; page.submit('#filters-form');
  await until(() => !page.$('#empty-state').hidden);
  assert.equal(page.$('.restaurant-card'), null);
  page.$('#reset-filters').click(); await until(() => page.$('.restaurant-card'));
  page.data.fail = true; page.submit('#filters-form'); await until(() => page.$('.api-state')?.textContent.includes('CORS_ORIGINS'));
  page.data.fail = false; page.$('.api-state button').click(); await until(() => page.$('.restaurant-card'));
});
test('login real, errores, perfil y cierre de sesión', async t => {
  const page = await open('index.html'); t.after(() => page.dom.window.close());
  page.$('[data-account=login]').click();
  page.$('[name=email]').value = 'demo@example.com'; page.$('[name=password]').value = 'incorrecta'; page.submit('#modal form');
  await until(() => page.$('.auth-feedback').textContent.includes('incorrectos'));
  page.$('[name=password]').value = 'Password123'; page.submit('#modal form');
  await until(() => page.$('[data-session-action=profile]'));
  assert.equal(page.$('#modal').open, false);
  assert.equal(page.$('[data-account=login]').hidden, true);
  assert.ok(page.$('[data-session-action=profile]').href.endsWith('/pages/perfil.html'));
  page.$('#account-trigger').click();
  assert.equal(page.$('#account-dropdown').hidden,false);
  page.w.document.dispatchEvent(new page.w.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(page.$('#account-dropdown').hidden,true);
  page.$('#account-trigger').click(); page.$('[data-session-action=logout]').click();
  assert.equal(page.w.MesaAPI.session, null);
});
test('registro separa nombres y apellidos y no envía rol ni confirmación', async t => {
  const page = await open('index.html'); t.after(() => page.dom.window.close());
  page.$('[data-account=register]').click();
  for (const [name, value] of Object.entries({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', password: 'Password123', confirm: 'Password123' })) page.$('[name=' + name + ']').value = value;
  page.submit('#modal form'); await until(() => page.data.requests.some(r => r.route === '/auth/register'));
  const body = page.data.requests.find(r => r.route === '/auth/register').body;
  assert.deepEqual(Object.keys(body).sort(), ['email', 'firstName', 'lastName', 'password']);
  await until(() => page.$('[data-session-action=profile]') && !page.$('#modal').open);
});
test('detalle muestra carta, galería, reseñas y permite publicar y editar una reseña propia', async t => {
  const page = await open('pages/restaurante.html', { role: 'CLIENT' }); t.after(() => page.dom.window.close());
  await until(() => page.$('.review-write'));
  assert.equal(page.$('#restaurant-title').textContent, 'Restaurante API');
  assert.equal(page.$('#panel-photos figure').textContent, 'Plato estrella');
  assert.equal(page.$('#panel-photos .gallery-photo-button').getAttribute('aria-label'), 'Ampliar Asado');
  assert.ok(page.$('#panel-menu').textContent.includes('Asado de prueba'));
  assert.equal(page.w.document.querySelectorAll('.review-card').length, 3);
  assert.ok(page.$('#panel-location iframe').src.includes('output=embed'));
  assert.ok(page.$('#panel-location').textContent.includes('Mapa de referencia'));
  page.$('.review-write').click();
  page.$('.review-form [name=comment]').value = 'Una visita excelente de prueba.'; page.$('[name=visitedAt]').value = '2026-10-20';
  for (const criterion of ['food','service','ambience']) page.$('.review-form [name='+criterion+'][value="5"]').click();
  page.submit('.review-form');
  await until(() => page.data.mine.length === 1 && page.$('.review-write')?.textContent.includes('Editar'));
  assert.equal(page.$('#modal-title').textContent, '¡Reseña publicada!');
  const body = page.data.requests.find(r => r.route.endsWith('/reviews') && r.method === 'POST').body;
  assert.equal(body.visitedAt, '2026-10-20T05:00:00.000Z');
  assert.equal(body.userId, undefined); assert.equal(body.verifiedVisit, undefined);
  assert.deepEqual(Object.keys(body.ratings).sort(), ['ambience','food','service']);
  page.$('#modal').close(); page.$('.review-write').click();
  page.$('.review-form [name=comment]').value = 'Opinión actualizada de nuestra visita.'; page.submit('.review-form');
  await until(() => page.data.mine[0].comment === 'Opinión actualizada de nuestra visita.');
  assert.equal(page.errors.length, 0);
});
test('administración restringe clientes y admite crear un restaurante con formulario', async t => {
  const client = await open('pages/administracion.html', { role: 'CLIENT' }); t.after(() => client.dom.window.close());
  await until(() => client.$('#admin-workspace').textContent.includes('disponible para administradores'));
  assert.ok(!client.data.requests.some(r => r.route.startsWith('/admin')));
  const page = await open('pages/administracion.html', { role: 'RESTAURANT_ADMIN' }); t.after(() => page.dom.window.close());
  await until(() => page.$('.admin-toolbar'));
  [...page.w.document.querySelectorAll('button')].find(b => b.textContent === 'Crear restaurante').click();
  for (const [key, value] of Object.entries({ name: 'Nuevo restaurante', slug: 'nuevo-restaurante', shortDescription: 'Restaurante nuevo de prueba' })) page.$('[name=' + key + ']').value = value;
  page.$('[name=cuisine]').checked = true; page.submit('#modal form');
  await until(() => page.data.requests.some(r => r.route === '/admin/restaurants' && r.method === 'POST'));
  const body = page.data.requests.find(r => r.route === '/admin/restaurants' && r.method === 'POST').body;
  assert.equal(body.name, 'Nuevo restaurante'); assert.deepEqual(body.cuisineTypes, ['CARNES']);
  await until(() => !page.$('#modal').open && page.$('.admin-toolbar') && page.$('[name=restaurant]').value === 'b'.repeat(24));
});
test('edición de plato convierte soles a céntimos y usa su endpoint administrativo', async t => {
  const page = await open('pages/administracion.html', { role: 'RESTAURANT_ADMIN' }); t.after(() => page.dom.window.close());
  await until(() => page.$('.admin-toolbar'));
  [...page.w.document.querySelectorAll('.category')].find(b => b.textContent === 'Carta').click(); page.$('.admin-resource .text-link').click();
  page.$('[name=price_' + bid + ']').value = '70.50'; page.submit('#modal form');
  await until(() => page.data.requests.some(r => r.route.endsWith('/menu-items/' + mid) && r.method === 'PATCH'));
  const body = page.data.requests.find(r => r.route.endsWith('/menu-items/' + mid) && r.method === 'PATCH').body;
  assert.equal(body.branchOffers[0].priceCents, 7050); assert.equal(body.branchOffers[0].branchId, bid);
  await until(() => !page.$('#modal').open && page.$('.admin-toolbar'));
  assert.equal(page.errors.length, 0);
});
test('paginación del catálogo y filtro de cocina múltiple', async t => {
  const data = fixtures(); data.restaurants = Array.from({ length: 13 }, (_, i) => ({ ...data.restaurant, _id: i.toString(16).padStart(24, '0'), name: 'Restaurante ' + i }));
  const page = await open('pages/restaurantes.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.restaurant-card'));
  assert.equal(page.w.document.querySelectorAll('.restaurant-card').length, 6);
  page.$('#pagination button[aria-label="Página siguiente"]').click();
  assert.equal(page.$('#pagination [aria-current=page]').textContent, '2');
  page.$('#pagination button[aria-label="Página siguiente"]').click();
  assert.equal(page.w.document.querySelectorAll('.restaurant-card').length, 1);
  page.$('[name=cuisine][value=Carnes]').checked = true; page.submit('#filters-form');
  await until(() => page.$('#pagination [aria-current=page]')?.textContent === '1');
  assert.equal(page.w.document.querySelectorAll('.restaurant-card').length, 6);
});
test('administrador crea local y conserva los dos periodos de cada día', async t => {
  const page = await open('pages/administracion.html', { role: 'RESTAURANT_ADMIN' }); t.after(() => page.dom.window.close());
  await until(() => page.$('.admin-toolbar'));
  [...page.w.document.querySelectorAll('.category')].find(b => b.textContent === 'Locales').click();
  [...page.w.document.querySelectorAll('button')].find(b => b.textContent === 'Agregar local').click();
  for (const [key, value] of Object.entries({ name: 'Nueva sede', street: 'Dirección de prueba', district: 'Miraflores', averagePrice: '35.50', day1: '13:00-16:30,20:00-23:00' })) page.$('[name=' + key + ']').value = value;
  page.submit('#modal form');
  await until(() => !page.$('#modal').open && page.$('.admin-toolbar'));
  const body = page.data.requests.find(r => r.route.endsWith('/branches') && r.method === 'POST').body;
  assert.equal(body.openingHours[0].periods.length, 2);
  assert.equal(body.averagePricePerPersonCents, 3550);
  assert.equal(body.location, null);
});


test('slider consulta céntimos, impide cruzar extremos y restablece sin límite', async t => {
  const page = await open('pages/restaurantes.html'); t.after(() => page.dom.window.close());
  await until(() => page.$('.restaurant-card'));
  const min = page.$('#price-min'), max = page.$('#price-max');
  assert.equal(max.type, 'range');
  assert.equal(page.w.MesaPriceRange.params().maxPriceCents, undefined);
  max.value = '60'; max.dispatchEvent(new page.w.Event('input')); max.dispatchEvent(new page.w.Event('change'));
  await until(() => !page.$('#empty-state').hidden);
  assert.equal(page.data.requests.filter(r => r.route === '/restaurants').at(-1).query.maxPriceCents, '6000');
  assert.ok(page.$('#price-max-label').textContent.includes('60'));
  min.value = '90'; min.dispatchEvent(new page.w.Event('input'));
  assert.equal(min.value, '60');
  page.$('#reset-price').click();
  await until(() => page.$('.restaurant-card'));
  assert.equal(min.value, '0');
  assert.equal(page.$('#price-max-label').textContent, 'Sin límite');
  assert.equal(page.data.requests.filter(r => r.route === '/restaurants').at(-1).query.maxPriceCents, undefined);
});

test('Lucide renderiza iconos estáticos y tarjetas creadas por la API', async t => {
  const page = await open('index.html'); t.after(() => page.dom.window.close());
  await until(() => page.$('.restaurant-card'));
  assert.equal(page.$('svg.svg-library'), null);
  assert.equal(page.$('use'), null);
  assert.equal(page.$('i[data-lucide]'), null);
  assert.ok(page.$('.brand-icon svg.lucide-chef-hat'));
  assert.ok(page.$('.restaurant-card .rating svg.lucide-star'));
  assert.ok(page.$('.restaurant-card .card-location svg.lucide-map-pin'));
  assert.ok(page.$('.restaurant-card a.reserve svg.lucide-arrow-right'));
  page.$('.menu-toggle').click();
  assert.ok(page.$('.menu-toggle svg.lucide-x'));
  assert.equal(page.$('.menu-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(page.errors.length, 0);
});


test('galería filtra por categoría y abre el visor en la foto pulsada', async t => {
  const data = fixtures();
  data.photos.push(
    { _id:'5'.repeat(24), type:'AMBIENCE', title:'Salón principal', url:'https://example.com/salon.jpg', sortOrder:1 },
    { _id:'6'.repeat(24), type:'DESSERT', title:'Postre de la casa', url:'https://example.com/postre.jpg', sortOrder:2 }
  );
  const page = await open('pages/restaurante.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.gallery-mosaic'));
  assert.equal(page.w.document.querySelectorAll('.gallery-tile').length, 3);
  assert.ok(page.$('.gallery-summary').textContent.includes('3 fotos'));
  page.w.document.querySelectorAll('.gallery-photo-button')[1].click();
  assert.equal(page.$('.photo-viewer').open, true);
  assert.equal(page.$('.viewer-counter').textContent, '2 / 3');
  assert.equal(page.$('.viewer-thumb[aria-current=true]').getAttribute('aria-label'), 'Ver foto 2: Salón principal');
  page.$('.viewer-next').click();
  assert.equal(page.$('.viewer-counter').textContent, '3 / 3');
  page.$('.viewer-prev').click();
  assert.equal(page.$('.viewer-counter').textContent, '2 / 3');
  page.$('.viewer-close').click();
  assert.equal(page.$('.photo-viewer'), null);
  [...page.w.document.querySelectorAll('.gallery-filter')].find(b=>b.textContent.includes('Postres')).click();
  assert.equal(page.w.document.querySelectorAll('.gallery-tile').length, 1);
  page.$('.gallery-photo-button').click();
  assert.equal(page.$('.viewer-counter').textContent, '1 / 1');
  assert.equal(page.$('.viewer-next').disabled, true);
  page.$('.viewer-close').click();
  assert.equal(page.errors.length, 0);
});

test('el mosaico muestra ocho fotos y permite ver las restantes', async t => {
  const data = fixtures();
  data.photos = Array.from({length:10}, (_,i)=>({ _id:String(i).repeat(24), title:'Foto '+i, type:'AMBIENCE', url:'https://example.com/'+i+'.jpg', sortOrder:i }));
  const page = await open('pages/restaurante.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.gallery-mosaic'));
  assert.equal(page.w.document.querySelectorAll('.gallery-tile').length, 8);
  assert.ok(page.$('.gallery-show-more').textContent.includes('10'));
  page.$('.gallery-show-more').click();
  assert.equal(page.w.document.querySelectorAll('.gallery-tile').length, 10);
  assert.equal(page.$('.gallery-show-more'), null);
});

test('Platos reserva los detalles a promociones destacadas vigentes y filtra la carta', async t => {
  const data = fixtures();
  data['menu-items'].push({ ...data['menu-items'][0], _id: '7'.repeat(24), name: 'Postre de prueba', category: 'DESSERT', recommendation: { featured: false } });
  const promo = { _id: '8'.repeat(24), title: 'Cena para dos', description: 'Selección especial', photoId: pid, branchIds: [bid], featured: true, startsAt: '2020-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z', priceCents: 11900, pricingUnit: 'COUPLE', peopleCount: 2, items: [{ menuItemId: mid, quantity: 2 }] };
  data.promotions = [promo, { ...promo, _id: 'a'.repeat(24), title: 'No destacada', featured: false }, { ...promo, title: 'Caducada', endsAt: '2020-01-02T00:00:00Z' }];
  const page = await open('pages/restaurante.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.dish-item'));
  assert.equal(page.$('#tab-menu').textContent.trim(), 'Platos');
  assert.equal(page.w.document.querySelectorAll('.promo-details').length, 1);
  assert.equal(page.$('.dish-item button'), null);
  assert.equal(page.w.document.querySelectorAll('.suggested-dish').length, 1);
  assert.ok(page.$('.promo-price').textContent.includes('119.00'));
  page.$('.promo-details').click();
  assert.equal(page.$('#toast').hidden, false);
  assert.ok(page.$('#toast').textContent.includes('próximamente'));
  page.$('.dish-filter[data-category=DESSERT]').click();
  assert.equal(page.w.document.querySelectorAll('.dish-item').length, 1);
  assert.ok(page.$('.dish-item').textContent.includes('Postre de prueba'));
  assert.equal(page.$('.dish-filter[data-category=DESSERT]').getAttribute('aria-pressed'), 'true');
  assert.equal(page.errors.length, 0);
});

test('Ubicación cambia local, carta y contacto conservando el orden de coordenadas', async t => {
  const data = fixtures();
  const secondId = '5'.repeat(24);
  data.branches.push({ ...data.branches[0], _id: secondId, name: 'Sede Miraflores', address: { street: 'Av. de Prueba 200', district: 'Miraflores', province: 'Lima' }, location: { type: 'Point', coordinates: [-77.03, -12.12] }, contact: { phone: '+5110000001', email: 'sede@example.com' } });
  data['menu-items'].push({ ...data['menu-items'][0], _id: '6'.repeat(24), name: 'Exclusivo Miraflores', branchOffers: [{ branchId: secondId, priceCents: 9900, available: true }] });
  const page = await open('pages/restaurante.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.map-branch-select select'));
  const select = page.$('.map-branch-select select'); select.value = secondId; select.dispatchEvent(new page.w.Event('change'));
  assert.ok(decodeURIComponent(page.$('#panel-location iframe').src).includes('-12.12,-77.03'));
  assert.equal(page.$('#panel-location a[href^="tel:"]').textContent, '+5110000001');
  assert.ok(page.$('.location-directions').href.includes('destination=-12.12%2C-77.03'));
  assert.equal(page.$('#panel-location #hours-list'), null);
  assert.ok(page.$('#hours-list'));
  assert.equal(page.w.document.querySelectorAll('.dish-item').length, 1);
  assert.ok(page.$('.dish-item').textContent.includes('Exclusivo Miraflores'));
  assert.equal(page.$('.location-card.selected strong').textContent, 'Sede Miraflores');
  assert.equal(page.errors.length, 0);
});

test('platos y ubicación presentan estados vacíos sin inventar datos', async t => {
  const data = fixtures(); data.branches = []; data['menu-items'] = []; data.photos = [];
  const page = await open('pages/restaurante.html', { data }); t.after(() => page.dom.window.close());
  await until(() => page.$('#panel-location .api-state'));
  assert.equal(page.$('#panel-location iframe'), null);
  assert.equal(page.$('.promo-details'), null);
  assert.ok(page.$('#panel-menu').textContent.includes('No hay platos disponibles'));
  assert.equal(page.errors.length, 0);
});

test('Reseñas ofrece login al visitante y bloquea la publicación del administrador', async t => {
  const visitor = await open('pages/restaurante.html'); t.after(() => visitor.dom.window.close());
  await until(() => visitor.$('.review-login'));
  assert.equal(visitor.$('.review-write'), null);
  assert.equal(visitor.$('.review-person-name .lucide-badge-check'), null);
  visitor.$('.review-login').click();
  assert.equal(visitor.$('#modal-title').textContent, 'Iniciar sesión');
  const admin = await open('pages/restaurante.html', { role:'RESTAURANT_ADMIN' }); t.after(() => admin.dom.window.close());
  await until(() => admin.$('.review-action-card'));
  assert.equal(admin.$('.review-write'), null);
  assert.equal(admin.$('.review-form'), null);
  assert.ok(admin.$('.review-action-card').textContent.includes('no pueden publicar reseñas'));
});

test('modal exige tres puntuaciones, visita válida y máximo 500 palabras antes de enviar', async t => {
  const page = await open('pages/restaurante.html', { role:'CLIENT' }); t.after(() => page.dom.window.close());
  await until(() => page.$('.review-write')); page.$('.review-write').click();
  assert.equal(page.w.document.querySelectorAll('.review-rating-group').length, 3);
  page.$('[name=comment]').value = 'Una experiencia muy agradable.'; page.$('[name=comment]').dispatchEvent(new page.w.Event('input'));
  page.$('[name=visitedAt]').value = '2026-10-20'; page.submit('.review-form');
  assert.ok(!page.data.requests.some(r=>r.route.endsWith('/reviews')&&r.method==='POST'));
  for (const criterion of ['food','service','ambience']) page.$('.review-form [name='+criterion+'][value="4"]').click();
  page.$('[name=comment]').value = 'palabra '.repeat(501); page.$('[name=comment]').dispatchEvent(new page.w.Event('input')); page.submit('.review-form');
  assert.ok(page.$('.review-word-count').textContent.includes('501/500'));
  assert.ok(!page.data.requests.some(r=>r.route.endsWith('/reviews')&&r.method==='POST'));
  page.$('[name=comment]').value = 'Buen restaurante para compartir.'; page.$('[name=comment]').dispatchEvent(new page.w.Event('input'));
  page.$('[name=visitedAt]').value = '2099-01-01'; page.submit('.review-form');
  assert.ok(!page.data.requests.some(r=>r.route.endsWith('/reviews')&&r.method==='POST'));
});

test('un fallo de publicación conserva el comentario y no muestra una confirmación falsa', async t => {
  const data = fixtures(); data.rejectReview = true;
  const page = await open('pages/restaurante.html', { role:'CLIENT', data }); t.after(() => page.dom.window.close());
  await until(() => page.$('.review-write')); page.$('.review-write').click();
  page.$('[name=comment]').value = 'Comentario que debe mantenerse al fallar.'; page.$('[name=visitedAt]').value = '2026-10-20';
  for (const criterion of ['food','service','ambience']) page.$('.review-form [name='+criterion+'][value="5"]').click();
  page.submit('.review-form'); await until(()=>page.$('.review-form .auth-feedback')?.textContent.includes('No se pudo'));
  assert.equal(page.$('#modal-title').textContent, 'Escribir una reseña');
  assert.equal(page.$('[name=comment]').value, 'Comentario que debe mantenerse al fallar.');
  assert.equal(page.$('.review-form button[type=submit]').disabled, false);
});

test('Ver más reseñas agrega la siguiente página y cambiar el orden reinicia el listado', async t => {
  const data=fixtures(); data.reviews.push(...data.reviews.map((r,i)=>({...r,_id:'p'+i,title:'Otra opinión '+i,ratings:{...r.ratings,overall:i+1}})));
  const page=await open('pages/restaurante.html',{data}); t.after(()=>page.dom.window.close());
  await until(()=>page.w.document.querySelectorAll('.customer-review').length===3);
  page.$('.reviews-load-more').click(); await until(()=>page.w.document.querySelectorAll('.customer-review').length===6);
  assert.equal(page.$('.reviews-load-more').hidden,true);
  page.$('.reviews-toolbar select').value='lowest'; page.$('.reviews-toolbar select').dispatchEvent(new page.w.Event('change'));
  await until(()=>page.w.document.querySelectorAll('.customer-review').length===3);
  assert.equal(page.$('.customer-review h3').textContent,'Otra opinión 0');
  assert.equal(page.data.requests.filter(r=>r.route.endsWith('/reviews')&&r.method==='GET').at(-1).query.sort,'lowest');
});

test('perfil guarda datos personales, normaliza celular y actualiza el header y la sesión', async t => {
  const page=await open('pages/perfil.html',{role:'CLIENT'}); t.after(()=>page.dom.window.close());
  await until(()=>page.$('.profile-form'));
  assert.equal(page.$('[name=email]').readOnly,true);
  page.$('[name=firstName]').value='Ana'; page.$('[name=lastName]').value='Pérez'; page.$('[name=phone]').value='987654321';
  page.submit('.profile-form'); await until(()=>page.$('#modal-title')?.textContent==='¡Cambios guardados!');
  const body=page.data.requests.find(r=>r.route==='/users/me'&&r.method==='PATCH').body;
  assert.equal(body.phone,'+51987654321'); assert.equal(body.email,undefined);
  assert.equal(page.$('.account-name').textContent,'Ana');
  assert.equal(page.w.MesaAPI.session.user.lastName,'Pérez');
  assert.equal(page.$('.profile-identity strong').textContent,'Ana Pérez');
});

test('foto se previsualiza, firma y sube sin token; se vincula al guardar el perfil', async t => {
  const page=await open('pages/perfil.html',{role:'CLIENT'}); t.after(()=>page.dom.window.close());
  await until(()=>page.$('.profile-form'));
  const file=new page.w.File(['png'],'avatar.png',{type:'image/png'});
  Object.defineProperty(page.$('#profile-photo-input'),'files',{configurable:true,value:[file]});
  page.$('#profile-photo-input').dispatchEvent(new page.w.Event('change'));
  assert.ok(page.$('.profile-portrait > img').src.startsWith('blob:'));
  assert.ok(!page.data.requests.some(r=>r.route.includes('signature')));
  page.submit('.profile-form'); await until(()=>page.$('#modal-title')?.textContent==='¡Cambios guardados!');
  const uploaded=page.data.requests.find(r=>r.route.includes('/v1_1/'));
  assert.equal(uploaded.headers,undefined);
  assert.equal(uploaded.body.get('signature'),'signed-test');
  const patch=page.data.requests.find(r=>r.route==='/users/me'&&r.method==='PATCH').body;
  assert.ok(patch.avatarPublicId.startsWith('mesaspot/avatars/'));
  assert.equal(patch.avatarUrl,undefined);
  assert.ok(page.$('.account-avatar img').src.includes('res.cloudinary.com'));
});

test('perfil rechaza tamaño y formato inválidos y conserva datos si Cloudinary no está configurado', async t => {
  const data=fixtures(); data.noCloudinary=true;
  const page=await open('pages/perfil.html',{role:'CLIENT',data}); t.after(()=>page.dom.window.close());
  await until(()=>page.$('.profile-form'));
  function choose(file) { Object.defineProperty(page.$('#profile-photo-input'),'files',{configurable:true,value:[file]}); page.$('#profile-photo-input').dispatchEvent(new page.w.Event('change')); }
  choose(new page.w.File(['<svg/>'],'avatar.svg',{type:'image/svg+xml'}));
  assert.ok(page.$('.profile-photo-status').classList.contains('is-error'));
  choose(new page.w.File([new Uint8Array(5*1024*1024+1)],'grande.png',{type:'image/png'}));
  assert.ok(page.$('.profile-photo-status').textContent.includes('5 MB'));
  choose(new page.w.File(['png'],'avatar.png',{type:'image/png'}));
  page.$('[name=firstName]').value='Nombre sin guardar'; page.submit('.profile-form');
  await until(()=>page.$('.profile-save-status').textContent.includes('no está configurada'));
  assert.equal(page.$('[name=firstName]').value,'Nombre sin guardar');
  assert.ok(!page.data.requests.some(r=>r.route==='/users/me'&&r.method==='PATCH'));
  assert.equal(page.$('#modal').open,false);
});

test('Mis reseñas solo consulta al autor autenticado y enlaza el restaurante correcto', async t => {
  const data=fixtures(); data.mine=[data.reviews[0]];
  const page=await open('pages/perfil.html',{role:'CLIENT',data}); t.after(()=>page.dom.window.close());
  await until(()=>page.$('.profile-form')); page.w.location.hash='#reviews';
  await until(()=>page.$('.profile-review-card'));
  assert.ok(page.$('.profile-review-card a').href.includes('?id='+rid+'#reviews'));
  assert.ok(page.data.requests.some(r=>r.route==='/users/me/reviews'));
  page.w.location.hash='#help'; await until(()=>page.$('.profile-help-item'));
  assert.equal(page.w.document.querySelectorAll('.profile-help-item').length,4);
});

test('perfil privado solicita sesión y no muestra formulario a administradores', async t => {
  const visitor=await open('pages/perfil.html'); t.after(()=>visitor.dom.window.close());
  await until(()=>visitor.$('#profile-status').textContent.includes('Inicia sesión'));
  assert.equal(visitor.$('.profile-form'),null);
  const admin=await open('pages/perfil.html',{role:'RESTAURANT_ADMIN'}); t.after(()=>admin.dom.window.close());
  await until(()=>admin.$('#profile-status').textContent.includes('cuentas de cliente'));
  assert.equal(admin.$('.profile-form'),null);
  assert.ok(admin.$('.account-admin-option').href.endsWith('/pages/administracion.html'));
});

test('Cancelar revierte campos y celular inválido impide guardar', async t => {
  const page=await open('pages/perfil.html',{role:'CLIENT'}); t.after(()=>page.dom.window.close());
  await until(()=>page.$('.profile-form'));
  page.$('[name=firstName]').value='Cambio descartado';
  [...page.w.document.querySelectorAll('button')].find(button=>button.textContent==='Cancelar').click();
  assert.equal(page.$('[name=firstName]').value,'Usuario');
  page.$('[name=phone]').value='123'; page.submit('.profile-form');
  assert.ok(!page.data.requests.some(r=>r.route==='/users/me'&&r.method==='PATCH'));
  assert.equal(page.errors.length,0);
});


