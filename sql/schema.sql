CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  mobile VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  user_image VARCHAR(255) NULL,
  instagram_link VARCHAR(255) NULL,
  instagram_username VARCHAR(255) NULL,
  bio TEXT NULL,

  business_name VARCHAR(255) NULL,
  business_fullname VARCHAR(255) NULL,
  business_email VARCHAR(255) NULL,
  business_mobile VARCHAR(20) NULL,
  business_address VARCHAR(255) NULL,
  business_area VARCHAR(255) NULL,
  business_site_url VARCHAR(255) NULL,
  business_designation VARCHAR(255) NULL,
  gst_number VARCHAR(32) NULL,
  business_type_id INT NULL,
  business_image VARCHAR(255) NULL,

  device_id VARCHAR(255) NULL,
  profile_image VARCHAR(255) NULL,
  is_insta_verified ENUM('0','1') NULL,
  verification_note VARCHAR(255) NULL,

  platform_fee_percent DECIMAL(10,2) NULL,
  gateway_charges DECIMAL(10,2) NULL,
  reverse_gateway_charges DECIMAL(10,2) NULL,
  min_threshold DECIMAL(10,2) NULL,

  role_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  remember_token VARCHAR(255) NULL,

  created_at DATETIME NULL,
  updated_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS otps (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(20) NULL,
  business_mobile VARCHAR(20) NULL,
  otp VARCHAR(6) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform_fee_percent DECIMAL(10,2) NULL,
  gateway_charges DECIMAL(10,2) NULL,
  reverse_gateway_charges DECIMAL(10,2) NULL,
  min_threshold DECIMAL(10,2) NULL
);
