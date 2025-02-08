-- Create sales_orders table
CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers NOT NULL,
  seller_id uuid REFERENCES profiles NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'draft',
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  commission_rate decimal(5,2) NOT NULL DEFAULT 5.00,
  commission_amount decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales_order_items table
CREATE TABLE sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES sales_orders ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sales orders are viewable by authenticated users"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seller_id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Sales orders are insertable by sellers"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Sales orders are updatable by sellers and managers"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = seller_id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    auth.uid() = seller_id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Sales order items are viewable by authenticated users"
  ON sales_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders 
      WHERE id = sales_order_items.sales_order_id 
      AND (seller_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Sales order items are insertable by sellers"
  ON sales_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders 
      WHERE id = sales_order_items.sales_order_id 
      AND (seller_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create function to calculate commission
CREATE OR REPLACE FUNCTION calculate_sales_commission()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_amount = NEW.total_amount * (NEW.commission_rate / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission calculation
CREATE TRIGGER calculate_commission_trigger
BEFORE INSERT OR UPDATE ON sales_orders
FOR EACH ROW
EXECUTE FUNCTION calculate_sales_commission();

-- Create function to update sales order total
CREATE OR REPLACE FUNCTION update_sales_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales_orders
  SET 
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM sales_order_items
      WHERE sales_order_id = NEW.sales_order_id
    ),
    updated_at = now()
  WHERE id = NEW.sales_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating sales order total
CREATE TRIGGER update_sales_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
FOR EACH ROW
EXECUTE FUNCTION update_sales_order_total();