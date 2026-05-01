-- database/seed_data.sql
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin Geral', 'admin@sistema.com', 'hashed_pass', 'admin'),
('Corretor João', 'joao@sistema.com', 'hashed_pass', 'corretor');

INSERT INTO banks (name, active) VALUES 
('Banco Inbursa', true),
('Banco Pan', true),
('Banco Daycoval', true),
('Banco C6', true),
('Banco Itaú', true),
('Facta', true),
('Banco Master', true);

-- Inbursa rules example
INSERT INTO bank_rules (bank_id, min_age, max_age, min_installments_paid, min_release_amount) VALUES
((SELECT id FROM banks WHERE name = 'Banco Inbursa'), 30, 73, 12, 500.00);

-- Coefficients example
INSERT INTO coefficients (bank_id, coefficient, installments) VALUES
((SELECT id FROM banks WHERE name = 'Banco Inbursa'), 0.02324, 84),
((SELECT id FROM banks WHERE name = 'Banco Inbursa'), 0.02450, 72);
