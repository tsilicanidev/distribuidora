-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_dashboard_data();

-- Then recreate the function with the desired return type
CREATE OR REPLACE FUNCTION public.get_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Check if user is authenticated
    IF auth.role() = 'anon' THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get profile role
    DECLARE
        user_role text;
    BEGIN
        SELECT role INTO user_role
        FROM profiles
        WHERE id = auth.uid();

        -- Check if user has appropriate role
        IF user_role NOT IN ('admin', 'manager', 'master') THEN
            RAISE EXCEPTION 'Insufficient permissions';
        END IF;
    END;

    WITH metrics AS (
        SELECT
            COUNT(p.id) as total_products,
            COALESCE(SUM(p.stock_quantity * p.price), 0) as stock_value,
            COUNT(CASE WHEN p.stock_quantity <= p.min_stock THEN 1 END) as low_stock_items,
            (
                SELECT COUNT(*)
                FROM stock_movements
                WHERE created_at >= NOW() - INTERVAL '30 days'
            ) as monthly_movements,
            (
                SELECT COUNT(*)
                FROM sales_orders
                WHERE status = 'pending'
            ) as pending_orders,
            (
                SELECT COUNT(*)
                FROM customers
            ) as total_customers,
            (
                SELECT COUNT(*)
                FROM drivers
                WHERE driver_status = 'available'
            ) as active_drivers,
            (
                SELECT COUNT(*)
                FROM vehicles
                WHERE status = 'available'
            ) as available_vehicles
        FROM products p
    )
    SELECT row_to_json(metrics.*) INTO result
    FROM metrics;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_data() TO authenticated;

-- Revoke execute from anonymous users
REVOKE EXECUTE ON FUNCTION public.get_dashboard_data() FROM anon;

-- Add comment
COMMENT ON FUNCTION public.get_dashboard_data() IS 'Returns aggregated dashboard metrics for authenticated users with appropriate roles';