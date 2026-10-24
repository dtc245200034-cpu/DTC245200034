const express = require('express'), session = require('express-session');
const mysql = require('mysql2/promise'), client = require('prom-client');
const app = express();
app.set('view engine', 'ejs'); app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax' } }));

const pool = mysql.createPool({ host: 'db', user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 10 });

// ---- Prometheus metrics ----
client.collectDefaultMetrics();
const httpDur = new client.Histogram({ name: 'http_request_duration_seconds', help: 'Latency',
  labelNames: ['method', 'route', 'status'] });
const ordersTotal = new client.Counter({ name: 'shop_orders_total', help: 'Số đơn hàng' });
app.use((req, res, next) => { const end = httpDur.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode }));
  next(); });

const vnd = n => Number(n).toLocaleString('vi-VN') + ' ₫';
app.use((req, res, next) => { req.session.cart ||= {};
  res.locals.vnd = vnd;
  res.locals.cartCount = Object.values(req.session.cart).reduce((a, b) => a + b, 0); next(); });

async function cartItems(cart) {
  const ids = Object.keys(cart); if (!ids.length) return [];
  const [rows] = await pool.query('SELECT * FROM products WHERE id IN (?)', [ids]);
  return rows.map(p => ({ ...p, qty: cart[p.id], sub: p.price * cart[p.id] }));
}

app.get('/', async (req, res) => {
  const cat = req.query.cat;
  const [products] = await pool.query(cat ? 'SELECT * FROM products WHERE category=?' : 'SELECT * FROM products', [cat]);
  const [c] = await pool.query('SELECT DISTINCT category FROM products');
  res.render('index', { products, cats: c.map(x => x.category), cat });
});
app.post('/cart/add/:id', (req, res) => { const id = parseInt(req.params.id);
  if (id) req.session.cart[id] = (req.session.cart[id] || 0) + 1; res.redirect(req.get('referer') || '/'); });
app.post('/cart/remove/:id', (req, res) => { delete req.session.cart[req.params.id]; res.redirect('/cart'); });
app.get('/cart', async (req, res) => { const items = await cartItems(req.session.cart);
  res.render('cart', { items, total: items.reduce((a, i) => a + i.sub, 0) }); });

app.post('/checkout', async (req, res) => {
  const items = await cartItems(req.session.cart);
  if (!items.length) return res.redirect('/cart');
  const total = items.reduce((a, i) => a + i.sub, 0), { name, phone, address } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO orders (customer_name,phone,address,total) VALUES (?,?,?,?)',
      [name, phone, address, total]);
    await conn.query('INSERT INTO order_items (order_id,product_id,qty,price) VALUES ?',
      [items.map(i => [r.insertId, i.id, i.qty, i.price])]);
    await conn.commit(); ordersTotal.inc(); req.session.cart = {};
    console.log(`ORDER created id=${r.insertId} total=${total}`);
    res.render('success', { id: r.insertId });
  } catch (e) { await conn.rollback(); console.error('ERROR checkout', e.message); res.status(500).send('Lỗi đặt hàng'); }
  finally { conn.release(); }
});

app.get('/health', (q, r) => r.send('ok'));
app.get('/metrics', async (q, r) => { r.set('Content-Type', client.register.contentType); r.end(await client.register.metrics()); });
app.listen(3000, () => console.log('TechShop listening on 3000'));
