import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container } from "@mui/material";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



import PaymentDetails from "./components/PaymentDetails";
import Checkout from "./components/Checkout";
import Yearlyreport from "./components/Yearlyreport";
import Remaingdues from "./components/Remaingdues";
import Payments from "./components/Payments";
import Availablerooms from "./components/Availablerooms";
import Rooms from "./components/Rooms";
import Usersreport from "./components/Usersreport";
import Registeruser from "./components/Registeruser";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";

export default function App() {
  return (
    <Router>
      <>
        {/* GLOBAL TOAST CONTAINER – required for all toast.* calls */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <Container sx={{ mt: 4 }}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* PROTECTED ROUTES */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Registeruser"
              element={
                <ProtectedRoute>
                  <Registeruser />
                </ProtectedRoute>
              }
            />

            <Route
              path="/usersreport"
              element={
                <ProtectedRoute>
                  <Usersreport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Rooms"
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Availablerooms"
              element={
                <ProtectedRoute>
                  <Availablerooms />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Payments"
              element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Remaingdues"
              element={
                <ProtectedRoute>
                  <Remaingdues />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Yearlyreport"
              element={
                <ProtectedRoute>
                  <Yearlyreport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/PaymentDetails/:id"
              element={
                <ProtectedRoute>
                  <PaymentDetails />
                </ProtectedRoute>
              }
            />

            {/* DEFAULT */}
            <Route path="*" element={<Login />} />
          </Routes>
        </Container>
      </>
    </Router>
  );
}
