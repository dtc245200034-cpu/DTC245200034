SET NAMES utf8mb4;
USE shop;
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL, category VARCHAR(50),
  price INT NOT NULL, emoji VARCHAR(8), description VARCHAR(255)
) CHARSET=utf8mb4;
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100), phone VARCHAR(20), address VARCHAR(255),
  total INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARSET=utf8mb4;
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_id INT, qty INT, price INT,
  FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id)
) CHARSET=utf8mb4;
INSERT INTO products (name,category,price,emoji,description) VALUES
('iPhone 15 Pro 256GB','Điện thoại',28990000,'📱','Titan, chip A17 Pro, camera 48MP'),
('Samsung Galaxy S24','Điện thoại',19990000,'📱','Galaxy AI, màn hình 120Hz'),
('MacBook Air M3','Laptop',27490000,'💻','Mỏng nhẹ, pin 18 giờ'),
('Dell XPS 13','Laptop',31990000,'💻','Màn OLED 3.5K, siêu di động'),
('AirPods Pro 2','Phụ kiện',5990000,'🎧','Chống ồn chủ động, USB-C'),
('Sạc nhanh 65W GaN','Phụ kiện',690000,'🔌','Sạc 3 cổng, nhỏ gọn'),
('Apple Watch S9','Đồng hồ',9990000,'⌚','Theo dõi sức khỏe, GPS'),
('Galaxy Watch 6','Đồng hồ',6490000,'⌚','Đo huyết áp, pin 2 ngày');
