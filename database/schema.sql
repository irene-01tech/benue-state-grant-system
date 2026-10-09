-- =====================================================================
-- Grant Processing and Management System for Addressing Menstrual
-- Poverty in Secondary Schools
-- Database Schema (MySQL 8.0+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS grant_management_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE grant_management_system;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. ROLES
-- =====================================================================
-- Four roles: one platform overseer (super_admin) and three operational
-- roles (ngo_govt, private_org, school_representative). ngo_govt merges
-- what used to be two separate roles (NGO officer / Government agency)
-- into one, since they share an identical workflow.
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name ENUM('super_admin', 'ngo_govt', 'private_org', 'school_representative') NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. USERS  (central auth table for all roles)
-- =====================================================================
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  must_change_password TINYINT(1) DEFAULT 1,
  status ENUM('pending', 'active', 'suspended', 'rejected') DEFAULT 'pending',
  profile_photo VARCHAR(255) DEFAULT NULL,
  last_login DATETIME DEFAULT NULL,
  password_reset_token VARCHAR(255) DEFAULT NULL,
  password_reset_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
  INDEX idx_users_email (email),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. ORGANISATIONS  (NGO / Government accounts — role: ngo_govt)
-- =====================================================================
-- Merges what used to be two separate tables (ngos, government_agencies)
-- into one, since NGOs and Government accounts now share one role and
-- one identical workflow. `reach_estimate` is an organisation's own
-- stated estimate of how many people/students it expects to support —
-- purely informational, never a hard limit (see application logic).
CREATE TABLE organisations (
  organisation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  org_name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100),
  focus_area VARCHAR(150),
  address VARCHAR(255),
  website VARCHAR(150),
  reach_estimate INT NOT NULL DEFAULT 7000000,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  rejection_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_organisation_status (approval_status)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PRIVATE ORGANISATIONS / INDIVIDUALS  (role: private_org)
-- =====================================================================
-- Same shape and workflow as `organisations`, but a distinct role so
-- permissions (e.g. who can approve schools) and default reach
-- estimates can differ.
CREATE TABLE private_organisations (
  private_org_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  org_name VARCHAR(200) NOT NULL,
  description VARCHAR(255),
  address VARCHAR(255),
  website VARCHAR(150),
  reach_estimate INT NOT NULL DEFAULT 4000,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  rejection_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_private_org_status (approval_status)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. SCHOOLS
-- =====================================================================
CREATE TABLE schools (
  school_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  school_name VARCHAR(200) NOT NULL,
  school_code VARCHAR(50),
  lga VARCHAR(100) NOT NULL COMMENT 'Local Government Area / district',
  address VARCHAR(255),
  school_type ENUM('public', 'private') DEFAULT 'public',
  total_students INT DEFAULT 0,
  total_female_students INT DEFAULT 0,
  principal_name VARCHAR(150),
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  rejection_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_school_status (approval_status),
  INDEX idx_school_lga (lga)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. GRANT CATEGORIES (managed by Super Admin)
-- =====================================================================
CREATE TABLE grant_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 7. GRANT PROGRAMMES (created by an Organisation or Private Org)
-- =====================================================================
CREATE TABLE grant_programmes (
  programme_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  owner_type ENUM('ngo_govt', 'private_org') NOT NULL,
  organisation_id INT DEFAULT NULL,
  private_org_id INT DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  total_budget DECIMAL(14,2) DEFAULT 0,
  budget_utilized DECIMAL(14,2) DEFAULT 0,
  target_lgas VARCHAR(255) COMMENT 'Comma separated list of target LGAs, or ALL',
  start_date DATE,
  end_date DATE,
  status ENUM('draft', 'active', 'closed', 'archived') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES grant_categories(category_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organisation_id) REFERENCES organisations(organisation_id) ON DELETE CASCADE,
  FOREIGN KEY (private_org_id) REFERENCES private_organisations(private_org_id) ON DELETE CASCADE,
  INDEX idx_programme_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. NEEDS ASSESSMENT SURVEYS
-- =====================================================================
-- Every survey is addressed TO a specific organisation or private org
-- (whichever the school is requesting support from) and goes through
-- its own approve/reject review by that org — it is never routed to
-- the Super Admin.
CREATE TABLE needs_assessment_surveys (
  survey_id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  target_org_type ENUM('ngo_govt', 'private_org') NOT NULL,
  target_organisation_id INT DEFAULT NULL,
  target_private_org_id INT DEFAULT NULL,
  total_female_students INT DEFAULT 0,
  girls_needing_support INT DEFAULT 0,
  existing_toilet_facilities ENUM('none', 'poor', 'adequate', 'good') DEFAULT 'poor',
  water_availability ENUM('none', 'irregular', 'regular') DEFAULT 'irregular',
  menstrual_education_programme TINYINT(1) DEFAULT 0,
  previous_interventions TEXT,
  estimated_pad_requirement INT DEFAULT 0,
  hygiene_kit_requirement INT DEFAULT 0,
  other_challenges TEXT,
  submitted_by INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  review_comment VARCHAR(255) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (target_organisation_id) REFERENCES organisations(organisation_id) ON DELETE CASCADE,
  FOREIGN KEY (target_private_org_id) REFERENCES private_organisations(private_org_id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_survey_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 9. GRANT APPLICATIONS
-- =====================================================================
CREATE TABLE grant_applications (
  application_id INT AUTO_INCREMENT PRIMARY KEY,
  programme_id INT NOT NULL,
  school_id INT NOT NULL,
  survey_id INT DEFAULT NULL,
  number_of_beneficiaries INT NOT NULL DEFAULT 0,
  items_requested TEXT NOT NULL COMMENT 'JSON array of requested items',
  reason_for_request TEXT NOT NULL,
  status ENUM('submitted', 'under_review', 'approved', 'rejected') DEFAULT 'submitted',
  reviewed_by INT DEFAULT NULL,
  review_comment VARCHAR(255) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES grant_programmes(programme_id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (survey_id) REFERENCES needs_assessment_surveys(survey_id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_application_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 10. APPLICATION SUPPORTING DOCUMENTS
-- =====================================================================
CREATE TABLE application_documents (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES grant_applications(application_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 11. RESOURCE ALLOCATIONS
-- =====================================================================
CREATE TABLE resource_allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  allocated_by INT NOT NULL,
  sanitary_pads_qty INT DEFAULT 0,
  reusable_pads_qty INT DEFAULT 0,
  soap_qty INT DEFAULT 0,
  underwear_qty INT DEFAULT 0,
  buckets_qty INT DEFAULT 0,
  educational_materials_qty INT DEFAULT 0,
  other_hygiene_kits_qty INT DEFAULT 0,
  other_items_description VARCHAR(255),
  budget_allocated DECIMAL(12,2) DEFAULT 0,
  expected_delivery_date DATE,
  status ENUM('allocated', 'delivered', 'cancelled') DEFAULT 'allocated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES grant_applications(application_id) ON DELETE CASCADE,
  FOREIGN KEY (allocated_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 12. DISTRIBUTION RECORDS
-- =====================================================================
CREATE TABLE distribution_records (
  distribution_id INT AUTO_INCREMENT PRIMARY KEY,
  allocation_id INT NOT NULL,
  school_id INT NOT NULL,
  recorded_by INT NOT NULL,
  distribution_date DATE NOT NULL,
  items_received TEXT NOT NULL COMMENT 'JSON object of item:quantity pairs',
  students_served INT DEFAULT 0,
  balance_remaining TEXT COMMENT 'JSON object of item:quantity remaining',
  remarks VARCHAR(255),
  gps_latitude DECIMAL(10,7) DEFAULT NULL,
  gps_longitude DECIMAL(10,7) DEFAULT NULL,
  receipt_confirmed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (allocation_id) REFERENCES resource_allocations(allocation_id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 13. EVIDENCE / FILE UPLOADS
-- =====================================================================
CREATE TABLE evidence_uploads (
  upload_id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  application_id INT DEFAULT NULL,
  distribution_id INT DEFAULT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type ENUM('jpg', 'jpeg', 'png', 'pdf', 'xlsx') NOT NULL,
  file_size INT,
  description VARCHAR(255),
  uploaded_by INT NOT NULL,
  verification_status ENUM('pending', 'approved', 'rejected', 'reupload_requested') DEFAULT 'pending',
  verified_by INT DEFAULT NULL,
  verification_comment VARCHAR(255) DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES grant_applications(application_id) ON DELETE SET NULL,
  FOREIGN KEY (distribution_id) REFERENCES distribution_records(distribution_id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_evidence_status (verification_status)
) ENGINE=InnoDB;

-- =====================================================================
-- 14. IMPACT SURVEYS (post-distribution)
-- =====================================================================
CREATE TABLE impact_surveys (
  impact_survey_id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  application_id INT NOT NULL,
  attendance_improvement ENUM('none', 'slight', 'moderate', 'significant') DEFAULT 'none',
  confidence_improvement ENUM('none', 'slight', 'moderate', 'significant') DEFAULT 'none',
  girls_impacted INT DEFAULT 0,
  feedback_notes TEXT,
  submitted_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES grant_applications(application_id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 15. ANNOUNCEMENTS (Super Admin broadcasts)
-- =====================================================================
CREATE TABLE announcements (
  announcement_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_role ENUM('all', 'ngo_govt', 'private_org', 'school_representative') DEFAULT 'all',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 16. NOTIFICATIONS (in-app)
-- =====================================================================
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(255) NOT NULL,
  link VARCHAR(255) DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- =====================================================================
-- 17. AUDIT LOGS
-- =====================================================================
CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_role VARCHAR(50),
  action VARCHAR(150) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT DEFAULT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_date (created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 18. SYSTEM SETTINGS
-- =====================================================================
CREATE TABLE system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value VARCHAR(500),
  updated_by INT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SEED DATA
-- =====================================================================
INSERT INTO roles (role_name, description) VALUES
  ('super_admin', 'Full system control and approval authority'),
  ('ngo_govt', 'NGO or Government organisation managing grant programmes'),
  ('private_org', 'Private organisation or individual managing smaller-scale grant programmes'),
  ('school_representative', 'Represents a secondary school beneficiary');

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('site_name', 'Grant Management Portal'),
  ('support_email', 'grantadmin.irene@gmail.com'),
  ('max_upload_size_mb', '10');
