import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginInitiate } from "../redux/actions/loginAction";
import { STATUS_CODE, BASE_URL } from "../API/Constants";
export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.login || {});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return alert("Please enter both email and password");
    }
    dispatch(loginInitiate({ email, password }, navigate));
  };

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html,
        body,
        #root {
          height: 100%;
          width: 100%;
          background: #000000 !important; /* Pure Black */
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .login-container {
          min-height: 100vh;
          background: #000000; /* Pure Black Only */
          color: #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* Hotel Header */
        .header {
          text-align: center;
          margin-bottom: 50px;
        }

        .logo-img {
          width: 80px;
          height: auto;
          margin-bottom: 12px;
          filter: brightness(1.4);
        }

        .hotel-small {
          font-size: 13px;
          letter-spacing: 0.35em;
          color: #b0b0b0;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          font-weight: 500;
        }

        .hotel-main {
          font-size: 28px;
          letter-spacing: 0.38em;
          color: #ffffff;
          margin: 0;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* Login Card */
        .login-card {
          width: 100%;
          max-width: 420px;
          background: #0a0a0a;
          border-radius: 18px;
          padding: 44px 36px;
          text-align: center;
          box-shadow: 
            0 30px 70px rgba(0, 0, 0, 0.9),
            0 0 0 1px rgba(80, 80, 120, 0.2);
          border: 1px solid rgba(100, 100, 150, 0.15);
        }

        .login-card h2 {
          color: #fff;
          font-size: 22px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 36px;
          font-weight: 700;
        }

        .input-group {
          margin-bottom: 22px;
          text-align: left;
        }

        .input-group label {
          display: block;
          margin-bottom: 8px;
          color: #e0ff;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.8px;
        }

        .input-group input {
          width: 100%;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid rgba(100, 150, 255, 0.3);
          background: rgba(20, 20, 40, 0.6);
          color: #fff;
          font-size: 15px;
          transition: all 0.3s ease;
        }

        .input-group input::placeholder {
          color: #8888aa;
        }

        .input-group input:focus {
          outline: none;
          border-color: #60a5fa;
          background: rgba(30, 40, 70, 0.8);
          box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2);
        }

        /* Silver Metallic Button */
        .login-btn {
          width: 100%;
          padding: 18px;
          margin-top: 16px;
          border-radius: 14px;
          border: none;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #0f172a;
          background: linear-gradient(180deg, #fcfcfc 45%, #e0e0e0 52%, #b7b7b7 100%);
          box-shadow: 
            -8px 8px 24px rgba(10, 50, 60, 0.7),
             8px 8px 24px rgba(10, 50, 60, 0.7),
             inset 0 2px 0 rgba(255,255,255,0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-btn:hover {
          transform: translateY(-5px);
          box-shadow: 
            -12px 12px 36px rgba(10, 50, 60, 0.9),
             12px 12px 36px rgba(10, 50, 60, 0.9);
        }

        .login-btn:active {
          transform: scale(0.95);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          color: #ff6b6b;
          margin-top: 18px;
          font-size: 14.5px;
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 36px 24px;
          }
          .hotel-main {
            font-size: 24px;
            letter-spacing: 0.3em;
          }
        }
      `}</style>

      <div className="login-container">
        {/* Hotel Header */}
        <div className="header">
          {/* Uncomment if you have logo */}
          {/* <img src="/images/OV.png" alt="Logo" className="logo-img" /> */}
          <p className="hotel-small">Welcome to</p>
          <h1 className="hotel-main">Royal Blossoms PG</h1>
        </div>

        {/* Login Form */}
        <div className="login-card">
         
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing In..." : "Login"}
            </button>

            {error && <div className="error-message">{error}</div>}
          </form>
        </div>
      </div>
    </>
  );
}