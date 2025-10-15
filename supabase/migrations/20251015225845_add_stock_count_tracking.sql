/*
  # Stock Count Tracking & Inventory Reconciliation

  1. New Tables
    - `stock_counts`
      - Tracks physical inventory counts for reconciliation
      - Records date, item, system quantity, actual quantity, difference
      - Supports monthly stock-taking procedures
      - Tracks who performed the count

  2. Security
    - Enable RLS on `stock_counts` table
    - Add policies for authenticated users to manage stock counts
*/

CREATE TABLE IF NOT EXISTS stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  system_quantity integer NOT NULL,
  actual_quantity integer NOT NULL,
  difference integer GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
  notes text,
  counted_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock counts"
  ON stock_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock counts"
  ON stock_counts FOR INSERT
  TO authenticated
  WITH CHECK (counted_by = auth.uid());

CREATE POLICY "Users can update own stock counts"
  ON stock_counts FOR UPDATE
  TO authenticated
  USING (counted_by = auth.uid())
  WITH CHECK (counted_by = auth.uid());

CREATE POLICY "Users can delete own stock counts"
  ON stock_counts FOR DELETE
  TO authenticated
  USING (counted_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_stock_counts_item ON stock_counts(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_stock_counts_counted_by ON stock_counts(counted_by);
