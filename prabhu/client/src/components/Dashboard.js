import { useSelector } from "react-redux";

export default function Dashboard() {
  const { user } = useSelector((state) => state.login);
    console.log("logged in user details",user)
  return (
      
      <h2>Welcome, {user?.name || "User"} </h2>
  
  );
}
