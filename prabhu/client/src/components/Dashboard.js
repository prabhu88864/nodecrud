import React from "react";  
import { useSelector, useDispatch } from "react-redux"; 
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../redux/actions/loginAction";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

export default function Dashboard({
  vacantRooms = 0,
  totalUsers = 0,
  remainingBalance = 0,
}) {
  const { user } = useSelector((state) => state.login || {});
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const go = (path) => () => navigate(path);

  const handleLogout = () => {
    localStorage.removeItem("token");
    dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* PREMIUM DARK THEME WITH SILVER METALLIC BUTTONS - SAME AS YOUR ASP.NET PAGE */}
      <style jsx>{`
        * { box-sizing: border-box; }
        body, html, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          background: #000 !important;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .dash-wrap {
          min-height: 100vh;
          background: black;
          color: #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3px 2px;
        }

        /* TOP HEADER - SAME AS YOUR HOTEL PAGE */
        .top-header {
          background: #000;
          width: 100%;
          text-align: center;
          padding: 28px 0 14px;
          margin-bottom: 10px;
        }

        .logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-img {
          width: 68px;
          height: auto;
          filter: brightness(1.1);
          margin-bottom: 6px;
        }

        .hotel-title-small {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.28em;
          color: #d1d5db;
          text-transform: uppercase;
        }

        .hotel-title-main {
          margin: 4px 0 0;
          font-size: 19px;
          letter-spacing: 0.28em;
          color: #ffffff;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* MAIN CARD */
        .main-card {
          width: min(480px, 96%);
          background: black;
          border-radius: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 16px;
          padding: 2px 2px;
         
          margin-top: 0px;
        }

        .welcome-text {
          text-align: center;
          margin-bottom: 30px;
          color: #f1f5f9;
        }

        .welcome-text h2 {
          font-size: 1.4rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin: 0 0 6px 0;
          font-weight: 700;
        }

        .welcome-text p {
          color: #9ca3af;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
        }

        /* SILVER METALLIC BUTTON - EXACT SAME AS YOUR ASP.NET FANCY-BTN */
        .silver-btn {
          width: 100%;
          margin: 14px 0;
          padding: 16px 8px;
          border-radius: 2px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0f172a;
          background: linear-gradient(180deg, skyblue 45%, #60b6f4ff 52%, #0b7ba7ff 100%);
          box-shadow: 
            -7px 7px 20px rgba(10, 50, 60, 0.55),
             7px 7px 20px rgba(10, 50, 60, 0.55),
             inset 0 1px 0 rgba(255,255,255,0.15),;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          overflow: hidden;
        }

        .silver-btn::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .silver-btn:hover::before {
          transform: translateX(100%);
        }

        .silver-btn:hover {
          transform: translateY(-3px);
          box-shadow: 
            -9px 9px 28px rgba(10, 50, 60, 0.7),
             9px 9px 28px rgba(10, 50, 60, 0.7);
        }

        .silver-btn:active {
          transform: scale(0.96) translateY(1px);
        }

        /* LOGOUT BUTTON - SLIGHTLY DARKER */
        .logout-btn {
          opacity: 0.9;
          background: linear-gradient(180deg, skyblue 45%, #60b6f4ff 52%, #0b7ba7ff 100%);
          margin-top: 30px;
        }

        .logout-btn:hover {
          opacity: 1;
        }

        /* RESPONSIVE */
        @media (max-width: 480px) {
          .main-card {
            padding: 26px 18px;
            width: 94%;
          }
          .silver-btn {
            padding: 15px 6px;
            font-size: 14px;
            letter-spacing: 0.12em;
          }
          .hotel-title-main {
            font-size: 18px;
          }
        }
      `}</style>

      {/* PAGE LAYOUT */}
      <div className="dash-wrap">

      

        {/* MAIN CONTENT CARD */}
        <div className="main-card">
         

          {/* MENU BUTTONS */}
         

          <button className="silver-btn" onClick={go("/Registeruser")}>
            Register User
          </button>

           <button className="silver-btn" onClick={go("/usersreport")}>
            User Profile Report
          </button>

           <button className="silver-btn" onClick={go("/Rooms")}>
            Vacant Rooms
          </button>

          <button className="silver-btn" onClick={go("/Remaingdues")}>
            Remaining Balance
          </button>

          <button className="silver-btn" onClick={go("/Payments")}>
            Payments & Receipts
          </button>

          <button className="silver-btn" onClick={go("/Yearlyreport")}>
            Yearly Report
          </button>

         

          <button className="silver-btn" onClick={go("/Availablerooms")}>
            Available Rooms
          </button>

         

          <button className="silver-btn logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}