import API from "../../API/API";
const api = new API();

export const registerApi = (userData) => {
  // replace `api/auth/register` with your real backend endpoint
  return api.post("api/auth/register", userData);
};
