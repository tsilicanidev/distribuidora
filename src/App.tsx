import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import Dashboard from './pages/Dashboard';
import { PrivateRoute } from './components/PrivateRoute';
import { supabase } from './lib/supabase';
import ListDrivers from './pages/ListDrivers';
import { CustomerOrder } from './pages/CustomerOrder';
import { TokenInput } from './pages/TokenInput';
import CustomerOrderLinks from './pages/CustomerOrderLinks';

function App() {
  useEffect(() => {
    // Check and refresh session on app load
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // Check if we're on a public route
          const publicRoutes = ['/login', '/token', '/order'];
          const isPublicRoute = publicRoutes.some(route => window.location.pathname.startsWith(route));
          
          if (!isPublicRoute) {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    };
    
    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        window.location.href = '/login';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/order/:token" element={<CustomerOrder />} />
        <Route path="/token" element={<TokenInput />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;