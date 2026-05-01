-- database/schema.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL -- admin, supervisor, corretor
);

CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE bank_rules (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER REFERENCES banks(id),
    min_age INTEGER,
    max_age INTEGER,
    min_installments_paid INTEGER,
    min_release_amount DECIMAL(10,2)
);

CREATE TABLE bank_species (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER REFERENCES banks(id),
    species_name VARCHAR(100),
    allowed BOOLEAN DEFAULT TRUE
);

CREATE TABLE coefficients (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER REFERENCES banks(id),
    coefficient DECIMAL(10,6) NOT NULL,
    installments INTEGER NOT NULL
);

CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    client_name VARCHAR(100),
    client_age INTEGER,
    benefit_type VARCHAR(100),
    current_bank VARCHAR(100),
    debt_balance DECIMAL(15,2),
    installment_value DECIMAL(10,2),
    current_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_results (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id),
    bank_id INTEGER REFERENCES banks(id),
    offered_rate DECIMAL(5,2),
    release_amount DECIMAL(15,2),
    is_approved BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT
);
