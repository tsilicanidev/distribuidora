import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create a Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Server configuration error"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const { action, userId, userData } = await req.json();

    // Check if the requesting user is an admin
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !authUser) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Get the user's role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({
        error: "Unauthorized - Admin access required"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Perform the requested action
    if (action === "delete") {
      // First, check if the user has any sales orders
      const { data: salesOrders, error: salesOrdersError } = await supabase
        .from("sales_orders")
        .select("id")
        .eq("seller_id", userId);

      if (salesOrdersError) {
        return new Response(JSON.stringify({
          error: `Error checking sales orders: ${salesOrdersError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // If the user has sales orders, we need to handle them first
      if (salesOrders && salesOrders.length > 0) {
        // Update sales orders to set seller_id to null or to a default admin user
        const { error: updateOrdersError } = await supabase
          .from("sales_orders")
          .update({ seller_id: null })
          .eq("seller_id", userId);

        if (updateOrdersError) {
          return new Response(JSON.stringify({
            error: `Error updating sales orders: ${updateOrdersError.message}`
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }

      // Now delete the profile
      const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (deleteProfileError) {
        return new Response(JSON.stringify({
          error: `Error deleting profile: ${deleteProfileError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Finally delete the auth user
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        return new Response(JSON.stringify({
          error: `Error deleting user: ${deleteUserError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "User deleted successfully"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else if (action === "create") {
      if (!userData || !userData.email || !userData.password || !userData.full_name || !userData.role) {
        return new Response(JSON.stringify({
          error: "Missing required user data"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Create auth user
      const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          display_name: userData.full_name,
          role: userData.role
        }
      });

      if (createUserError) {
        return new Response(JSON.stringify({
          error: `Error creating user: ${createUserError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      if (!authData.user) {
        return new Response(JSON.stringify({
          error: "Failed to create user"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Create profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert([{
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            commission_rate: userData.role === 'seller' ? userData.commission_rate || 5 : null
          }]);

        if (createProfileError) {
          await supabase.auth.admin.deleteUser(authData.user.id);
          return new Response(JSON.stringify({
            error: `Error creating profile: ${createProfileError.message}`
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: "User created successfully",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: userData.full_name,
          role: userData.role,
          commission_rate: userData.role === 'seller' ? userData.commission_rate || 5 : null,
          created_at: authData.user.created_at
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else if (action === "resetPassword") {
      if (!userId || !userData || !userData.password) {
        return new Response(JSON.stringify({
          error: "Missing required data"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Update user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: userData.password
      });

      if (updateError) {
        return new Response(JSON.stringify({
          error: `Error resetting password: ${updateError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Password reset successfully"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      return new Response(JSON.stringify({
        error: "Invalid action"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});