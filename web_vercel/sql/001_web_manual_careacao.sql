CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL UNIQUE,
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  delivery_responsible_raw VARCHAR(255),
  delivery_time TIME,
  delivery_datetime TIMESTAMPTZ,
  created_datetime TIMESTAMPTZ,
  has_careacao BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  has_discount BOOLEAN NOT NULL DEFAULT false,
  discount_value NUMERIC(10, 2),
  internal_note TEXT,
  source_sheet VARCHAR(255),
  source_file VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS careacao_cases (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pendente',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_customer_fault BOOLEAN,
  fault_reason TEXT,
  internal_note TEXT,
  driver_response TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS import_errors (
  id SERIAL PRIMARY KEY,
  import_batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data_json JSONB NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS careacao_history (
  id SERIAL PRIMARY KEY,
  careacao_id INTEGER NOT NULL REFERENCES careacao_cases(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_values_json JSONB,
  new_values_json JSONB,
  actor VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE careacao_cases
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_customer_fault BOOLEAN,
  ADD COLUMN IF NOT EXISTS fault_reason TEXT;

CREATE INDEX IF NOT EXISTS ix_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS ix_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS ix_orders_created_datetime ON orders(created_datetime);
CREATE INDEX IF NOT EXISTS ix_careacao_cases_order_id ON careacao_cases(order_id);
CREATE INDEX IF NOT EXISTS ix_careacao_cases_driver_id ON careacao_cases(driver_id);
CREATE INDEX IF NOT EXISTS ix_careacao_cases_status ON careacao_cases(status);
CREATE INDEX IF NOT EXISTS ix_careacao_cases_opened_at ON careacao_cases(opened_at);
CREATE INDEX IF NOT EXISTS ix_import_batches_started_at ON import_batches(started_at);
CREATE INDEX IF NOT EXISTS ix_import_errors_import_batch_id ON import_errors(import_batch_id);
CREATE INDEX IF NOT EXISTS ix_careacao_history_careacao_id ON careacao_history(careacao_id);
CREATE INDEX IF NOT EXISTS ix_careacao_history_created_at ON careacao_history(created_at);

ALTER TABLE careacao_cases
  DROP CONSTRAINT IF EXISTS ck_careacao_cases_status;

ALTER TABLE careacao_cases
  ADD CONSTRAINT ck_careacao_cases_status
  CHECK (status IN ('pendente', 'em_tratativa', 'aguardando_motorista', 'respondido', 'resolvido', 'cancelado'));
