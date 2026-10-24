cat > README.md <<'EOF'
# TechShop – Website Thương mại điện tử (Đề 9)

> Đồ án môn **Triển khai và Quản trị Hệ thống Phần mềm**
> Sinh viên: **NONG_THI_PHUONG_THAO** – MSSV: **DTC245200034** – Lớp: **CNTT_K23H**
> GVHD: **LE_kHANH_DUONG**

## 1. Giới thiệu

TechShop là website bán hàng online (sản phẩm, giỏ hàng, đặt hàng) được triển khai hoàn toàn bằng **Docker Compose** trên Ubuntu, kèm đầy đủ hệ thống giám sát, log tập trung và các biện pháp hardening.

| Thành phần | Công nghệ |
|---|---|
| Ứng dụng web | Node.js 20 (Express + EJS), Bootstrap 5 |
| Cơ sở dữ liệu | MySQL 8.0 |
| Công cụ quản lý DB | phpMyAdmin 5 |
| Reverse proxy | Nginx (HTTPS tự ký + security headers) |
| Giám sát | Prometheus, Grafana, cAdvisor, nginx-exporter, mysqld-exporter |
| Log tập trung | Loki + Promtail (truy vấn bằng LogQL) |

## 2. Kiến trúc hệ thống

```
Người dùng --HTTPS 443--> Nginx --> App Node.js --> MySQL <-- phpMyAdmin (127.0.0.1:8081)
                            |           |              |
 [frontend]                 |        /metrics     mysqld-exporter
 [backend, internal]        |           |              |
 [monitoring]          nginx-exporter   +---> Prometheus <--- cAdvisor
                                                   |
                                                Grafana (127.0.0.1:3000)
                                                   ^
              Promtail (đọc log Docker) --> Loki --+
```

**3 mạng Docker (network isolation):**

| Network | Thành viên | Ghi chú |
|---|---|---|
| `frontend` | nginx, app, phpmyadmin | Mạng tiếp xúc người dùng |
| `backend` | app, db, phpmyadmin, mysqld-exporter | `internal: true`, DB không ra được Internet |
| `monitoring` | prometheus, grafana, loki, promtail, exporters, app, nginx | Mạng giám sát |

## 3. Cấu trúc thư mục

```
.
├── app/                         # Mã nguồn Node.js (Dockerfile, app.js, views, public)
├── db/init/                     # Schema, dữ liệu mẫu, phân quyền DB
├── nginx/conf.d/default.conf    # Cấu hình reverse proxy + security headers
├── prometheus/prometheus.yml
├── grafana/provisioning/        # Datasource Prometheus + Loki
├── loki/loki.yml
├── promtail/promtail.yml
├── scripts/                     # gen-env.sh (mật khẩu), gen-cert.sh (HTTPS)
├── docs/images/                 # Ảnh minh chứng
├── docker-compose.yml           # Core: app, db, phpmyadmin, nginx
├── docker-compose.monitoring.yml
├── docker-compose.logging.yml
├── docker-compose.hardening.yml
├── .env.example                 # File mẫu (file .env thật KHÔNG commit)
└── README.md
```

## 4. Yêu cầu

- Ubuntu 22.04/24.04 (hoặc VM Ubuntu)
- Docker Engine và Docker Compose v2
- RAM tối thiểu 4 GB, trống ổ cứng 10 GB
- Internet (tải image và Bootstrap CDN)
- Cổng 80, 443 chưa bị chiếm (tắt apache2/nginx cài sẵn trên máy nếu có)

Cài Docker:

```bash
sudo apt update && sudo apt install -y git curl openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

## 5. Hướng dẫn chạy

```bash
# 1. Clone repo
git clone https://github.com/dtc245200034-cpu/DTC245200034.git
cd DTC245200034

# 2. Sinh file .env với mật khẩu mạnh ngẫu nhiên + chứng chỉ HTTPS tự ký
./scripts/gen-env.sh
./scripts/gen-cert.sh

# 3. Kiểm tra biến COMPOSE_FILE trong .env có đủ 4 file compose
grep COMPOSE_FILE .env
# Kết quả mong đợi:
# COMPOSE_FILE=docker-compose.yml:docker-compose.monitoring.yml:docker-compose.logging.yml:docker-compose.hardening.yml

# 4. Khởi động toàn bộ hệ thống
docker compose up -d --build

# 5. Kiểm tra trạng thái (tất cả phải Up, db phải healthy)
docker compose ps
```

Dừng hệ thống: `docker compose down`
Xóa cả dữ liệu (reset từ đầu): `docker compose down -v`

## 6. Địa chỉ truy cập

| Dịch vụ | URL | Tài khoản |
|---|---|---|
| Website | https://localhost | – (bỏ qua cảnh báo chứng chỉ tự ký) |
| phpMyAdmin | http://localhost:8081 | `root` / `MYSQL_ROOT_PASSWORD` trong `.env` |
| Grafana | http://localhost:3000 | `admin` / `GF_ADMIN_PASSWORD` trong `.env` |
| Prometheus | http://localhost:9090 | – |

Xem mật khẩu: `grep PASSWORD .env`

> phpMyAdmin, Grafana, Prometheus chỉ bind vào `127.0.0.1`, không mở ra mạng ngoài. Khi chạy trên server từ xa, dùng SSH tunnel:
> `ssh -L 3000:127.0.0.1:3000 -L 8081:127.0.0.1:8081 user@server`

## 7. Demo các thành phần

### 7.1. Website và Database
1. Mở https://localhost, thêm sản phẩm vào giỏ, điền thông tin và bấm **Đặt hàng**.
2. Mở phpMyAdmin, chọn database `shop`, bảng `orders` và `order_items` sẽ có đơn vừa đặt.

### 7.2. Nginx reverse proxy
```bash
curl -kI https://localhost          # xem các security headers
curl -I http://localhost            # 301 chuyển hướng sang HTTPS
curl -k https://localhost/metrics   # 404, không lộ metrics ra ngoài
```

### 7.3. Prometheus + Grafana
1. Vào http://localhost:9090/targets: tất cả target ở trạng thái **UP** (prometheus, cadvisor, nginx, mysql, app).
2. Vào Grafana, **Dashboards → New → Import**, nhập ID rồi chọn datasource Prometheus:

| ID | Dashboard |
|---|---|
| 14282 | Docker containers (cAdvisor) |
| 14057 | MySQL Overview |
| 12708 | NGINX exporter |

3. Dashboard riêng "TechShop" gồm các query:
   - Container CPU: `rate(container_cpu_usage_seconds_total{name!=""}[1m])`
   - Nginx: `rate(nginx_http_requests_total[1m])`
   - MySQL: `mysql_global_status_threads_connected`
   - Đơn hàng: `shop_orders_total`

### 7.4. Loki + LogQL
Vào Grafana → **Explore** → chọn datasource **Loki**:

| # | Query | Ý nghĩa |
|---|---|---|
| 1 | `{service="nginx"}` | Log truy cập Nginx |
| 2 | `{service="app"} \|= "ORDER"` | Log các đơn hàng được tạo |
| 3 | `sum by (service) (rate({job="docker"}[1m]))` | Tốc độ log theo từng service |
| 4 | `count_over_time({service="nginx"} \|~ " 404 " [5m])` | Số lỗi 404 trong 5 phút |

Mẹo sinh log: truy cập `https://localhost/abc` vài lần để tạo lỗi 404, đặt vài đơn hàng để có log `ORDER`.

## 8. Hardening

| # | Biện pháp | Cách kiểm chứng |
|---|---|---|
| 1 | Container chạy non-root (app: `node`, nginx: `nginx-unprivileged`) | `docker compose exec app id` |
| 2 | Network isolation: mạng `backend` là `internal` | `docker compose exec db ping -c1 8.8.8.8` (thất bại) |
| 3 | Mật khẩu mạnh ngẫu nhiên, `.env` chmod 600, không đưa lên Git | `ls -l .env`, xem `.gitignore` |
| 4 | Nginx: HTTPS, ẩn version, rate limit, security headers (HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | `curl -kI https://localhost` |
| 5 | Giới hạn quyền DB: user ứng dụng chỉ có SELECT/INSERT/UPDATE/DELETE; user exporter chỉ đọc | `SHOW GRANTS FOR 'shop_user'@'%';` |
| 6 | `read_only`, `cap_drop: ALL`, `no-new-privileges`, giới hạn CPU/RAM | `docker inspect techshop-app-1` |
| 7 | Chỉ publish cổng 80/443; công cụ quản trị bind `127.0.0.1`; chặn `/metrics` | `ss -tlnp` |

**Lưu ý:** Promtail cần mount `docker.sock` (read-only) để đọc log container nên chạy bằng root. Đây là đánh đổi có chủ đích, có thể thay bằng Docker logging driver trong môi trường production.

## 9. Lịch sử commit

| Commit | Nội dung |
|---|---|
| 1 | Ứng dụng Node.js + MySQL + phpMyAdmin + Nginx reverse proxy HTTPS |
| 2 | Giám sát: Prometheus, Grafana, cAdvisor, nginx-exporter, mysqld-exporter |
| 3 | Log tập trung: Loki + Promtail, truy vấn LogQL |
| 4 | Hardening, README, tài liệu |

## 10. Ảnh minh chứng

| Nội dung | Ảnh |
|---|---|
| Trang chủ website | ![home](docs/images/01-home.png) |
| Giỏ hàng và đặt hàng | ![cart](docs/images/02-cart.png) |
| phpMyAdmin (bảng orders) | ![pma](docs/images/03-phpmyadmin.png) |
| Nginx security headers | ![headers](docs/images/04-headers.png) |
| Prometheus targets | ![targets](docs/images/05-targets.png) |
| Grafana dashboard | ![grafana](docs/images/06-grafana.png) |
| Loki LogQL | ![loki](docs/images/07-loki.png) |
| Hardening | ![hardening](docs/images/08-hardening.png) |

## 11. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| `permission denied` khi chạy docker | Chạy `sudo usermod -aG docker $USER`, đăng xuất rồi đăng nhập lại |
| `port is already allocated` | `sudo systemctl stop apache2 nginx` |
| `app` restart liên tục | `docker compose logs app`; thử `docker compose down -v` rồi `up -d --build` |
| `nginx` thoát ngay | Chạy lại `./scripts/gen-cert.sh` |
| Quên mật khẩu Grafana | `docker compose exec grafana grafana cli admin reset-admin-password "<mật_khẩu_mới>"` |
| Service crash sau khi bật hardening | `docker compose logs <service>`, nới `cap_drop` hoặc `read_only` cho riêng service đó |

## 12. Hướng phát triển

CSRF token và đăng nhập khách hàng, trang quản trị sản phẩm, Alertmanager cảnh báo qua email/Telegram, CI/CD với GitHub Actions, chứng chỉ Let's Encrypt.
EOF# DTC245200034
